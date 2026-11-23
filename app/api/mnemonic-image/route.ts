import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateMnemonicImage, MnemonicImageError } from "@/lib/mnemonicImage";

export const runtime = "nodejs";
export const maxDuration = 60;

async function authorize(request: Request) {
  if (process.env.MNEMONIC_IMAGE_ALLOW_UNAUTHENTICATED === "1") return "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!url || !anon) {
    throw new MnemonicImageError(
      "Sign-in is not configured for mnemonic images (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY).",
      { status: 401, code: "unauthenticated", retryable: false },
    );
  }
  if (!token) {
    throw new MnemonicImageError("Sign in to generate mnemonic images.", {
      status: 401,
      code: "unauthenticated",
      retryable: false,
    });
  }
  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new MnemonicImageError("Your session expired. Sign in again to generate mnemonic images.", {
      status: 401,
      code: "unauthenticated",
      retryable: false,
    });
  }
  return token;
}

export async function POST(request: Request) {
  try {
    const token = await authorize(request);
    const body = await request.json().catch(() => ({}));
    const prompt = String(body?.prompt || body?.text || "");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const result = await generateMnemonicImage({
      prompt,
      env: process.env,
      edge:
        token && supabaseUrl && anon
          ? async (fitted) => {
              const response = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  apikey: anon,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt: fitted }),
              });
              const payload = await response.json().catch(() => ({}));
              if (!response.ok || !payload?.url) {
                return {
                  error: payload?.error || payload?.message || `Backpack generate-image failed (${response.status})`,
                  status: response.status,
                };
              }
              return { url: payload.url };
            }
          : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof MnemonicImageError ? error.status : 500;
    const code = error instanceof MnemonicImageError ? error.code : "image_failed";
    const message = error instanceof Error ? error.message : "Mnemonic image failed";
    return NextResponse.json({ error: message, code }, { status });
  }
}
