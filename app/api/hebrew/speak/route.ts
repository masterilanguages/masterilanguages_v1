import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Native Israeli Hebrew speech. First configured provider wins:
//   1. Azure Neural  he-IL-HilaNeural (or AZURE_SPEECH_VOICE, e.g. he-IL-AvriNeural)
//   2. Google Cloud  he-IL-Neural2-A (or GOOGLE_TTS_VOICE)
//   3. ElevenLabs    multilingual, voice ELEVENLABS_HEBREW_VOICE_ID
// With no key, the route answers 503 and the player uses the browser he-IL voice.
// Audio is cached in memory for the life of the server process.

type AudioClip = { body: Buffer; contentType: string };

const cache = new Map<string, AudioClip>();
const MAX_ENTRIES = 200;
const MAX_CHARS = 400;

function remember(key: string, clip: AudioClip) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, clip);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function azure(text: string): Promise<AudioClip> {
  const key = process.env.AZURE_SPEECH_KEY || "";
  const region = process.env.AZURE_SPEECH_REGION || "eastus";
  const voice = process.env.AZURE_SPEECH_VOICE || "he-IL-HilaNeural";
  const ssml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<speak version="1.0" xml:lang="he-IL"><voice name="${xmlEscape(voice)}">${xmlEscape(text)}</voice></speak>`;
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
      "User-Agent": "masteri-languages",
    },
    body: ssml,
  });
  if (!res.ok) throw new Error(`Azure speech HTTP ${res.status}`);
  return { body: Buffer.from(await res.arrayBuffer()), contentType: "audio/mpeg" };
}

async function google(text: string): Promise<AudioClip> {
  const key = process.env.GOOGLE_TTS_API_KEY || "";
  const name = process.env.GOOGLE_TTS_VOICE || "he-IL-Neural2-A";
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "he-IL", name },
        audioConfig: { audioEncoding: "MP3", speakingRate: 0.95 },
      }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.audioContent) {
    throw new Error(data?.error?.message || `Google speech HTTP ${res.status}`);
  }
  return { body: Buffer.from(data.audioContent, "base64"), contentType: "audio/mpeg" };
}

async function eleven(text: string): Promise<AudioClip> {
  const voice = process.env.ELEVENLABS_HEBREW_VOICE_ID || "";
  const model = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY || "",
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: { stability: 0.45, similarity_boost: 0.8 },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs speech HTTP ${res.status}`);
  return { body: Buffer.from(await res.arrayBuffer()), contentType: "audio/mpeg" };
}

async function synthesize(text: string): Promise<AudioClip | null> {
  const errors: unknown[] = [];
  const steps: Array<[boolean, () => Promise<AudioClip>]> = [
    [Boolean(process.env.AZURE_SPEECH_KEY), () => azure(text)],
    [Boolean(process.env.GOOGLE_TTS_API_KEY), () => google(text)],
    [Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_HEBREW_VOICE_ID), () => eleven(text)],
  ];
  let configured = false;
  for (const [enabled, run] of steps) {
    if (!enabled) continue;
    configured = true;
    try {
      return await run();
    } catch (err) {
      errors.push(err);
    }
  }
  if (configured && errors.length) throw errors[0];
  return null;
}

function clipResponse(clip: AudioClip) {
  return new NextResponse(new Uint8Array(clip.body), {
    status: 200,
    headers: {
      "Content-Type": clip.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function GET(req: NextRequest) {
  const text = (req.nextUrl.searchParams.get("text") || "").trim().slice(0, MAX_CHARS);
  if (!/[\u0590-\u05FF]/.test(text)) {
    return NextResponse.json(
      { error: "Hebrew text is required", fallback: "browser" },
      { status: 400 }
    );
  }

  const voiceKey = [
    process.env.AZURE_SPEECH_VOICE || "he-IL-HilaNeural",
    process.env.GOOGLE_TTS_VOICE || "he-IL-Neural2-A",
    process.env.ELEVENLABS_HEBREW_VOICE_ID || "",
    process.env.ELEVENLABS_MODEL || "",
  ].join("|");
  const cacheKey = `${voiceKey}:${text}`;
  const hit = cache.get(cacheKey);
  if (hit) return clipResponse(hit);

  try {
    const clip = await synthesize(text);
    if (!clip) {
      return NextResponse.json(
        {
          error: "No Israeli neural voice is configured",
          fallback: "browser",
          needed: ["AZURE_SPEECH_KEY", "GOOGLE_TTS_API_KEY", "ELEVENLABS_API_KEY"],
        },
        { status: 503 }
      );
    }
    remember(cacheKey, clip);
    return clipResponse(clip);
  } catch {
    return NextResponse.json(
      { error: "Israeli voice failed", fallback: "browser" },
      { status: 503 }
    );
  }
}
