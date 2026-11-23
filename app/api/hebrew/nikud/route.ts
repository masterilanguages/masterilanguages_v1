import { NextRequest, NextResponse } from "next/server";
import { assembleDicta, sameLetters, stripNikud } from "@/lib/hebrew/nikud";

export const runtime = "nodejs";

// Dicta Nakdan, modern genre: the same Israeli vocalization a Nakdan uses.
// https://nakdan-4-0.loadbalancer.dicta.org.il/api
const DICTA_URL = process.env.DICTA_NAKDAN_URL || "https://nakdan-4-0.loadbalancer.dicta.org.il/api";

const cache = new Map<string, string>();
const MAX_ENTRIES = 400;
const MAX_CHARS = 800;

function remember(key: string, value: string) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || "").trim().slice(0, MAX_CHARS);
  const transliteration = String(body?.transliteration || "").trim().slice(0, MAX_CHARS);
  if (!/[\u0590-\u05FF]/.test(text)) {
    return NextResponse.json({ error: "Hebrew text is required" }, { status: 400 });
  }

  const plain = stripNikud(text);
  const key = `${plain}\n${transliteration.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return NextResponse.json({ nikud: hit, source: "cache", cached: true });

  try {
    const res = await fetch(DICTA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "nakdan",
        genre: "modern",
        data: plain,
        addmorph: false,
        keepmetagim: false,
        keepqq: false,
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ nikud: null, source: "none" }, { status: 502 });
    }
    const tokens = await res.json();
    const nikud = assembleDicta(tokens, transliteration);
    if (!nikud || !sameLetters(nikud, plain)) {
      return NextResponse.json({ nikud: null, source: "none" }, { status: 422 });
    }
    remember(key, nikud);
    return NextResponse.json({ nikud, source: "dicta-modern", cached: false });
  } catch {
    return NextResponse.json({ nikud: null, source: "none" }, { status: 502 });
  }
}
