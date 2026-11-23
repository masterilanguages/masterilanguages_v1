/**
 * Server-side mnemonic image generation.
 *
 * Primary model is Cloudflare FLUX.1 schnell (the Pixar-style prompt was written
 * for it, and it does not accept a negative prompt or, on the current API, a
 * seed). OpenAI falls back to gpt-image-2.6-flare because gpt-image-1 was shut
 * down on 2026-10-23. The Backpack `generate-image` edge function is the last
 * resort and still needs that model change on the platform.
 */

export const CLOUDFLARE_IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";
export const OPENAI_IMAGE_MODEL = "gpt-image-2.6-flare";
export const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
export const PROMPT_MAX = 2000;

export class MnemonicImageError extends Error {
  status: number;
  code: string;
  retryable: boolean;

  constructor(message: string, opts: { status?: number; code?: string; retryable?: boolean } = {}) {
    super(message);
    this.name = "MnemonicImageError";
    this.status = opts.status ?? 500;
    this.code = opts.code ?? "image_failed";
    this.retryable = opts.retryable ?? (this.status === 429 || this.status >= 500);
  }
}

export function fitImagePrompt(prompt: string): string {
  const text = String(prompt || "").replace(/\s+/g, " ").trim();
  if (text.length <= PROMPT_MAX) return text;
  return `${text.slice(0, PROMPT_MAX - 1).trimEnd()}…`;
}

export async function promptCacheKey(prompt: string): Promise<string> {
  const data = new TextEncoder().encode(fitImagePrompt(prompt));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function withRetries<T>(
  run: () => Promise<T>,
  opts: { attempts?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  let last: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await run();
    } catch (error) {
      last = error;
      const retryable = Boolean((error as { retryable?: boolean })?.retryable);
      if (!retryable || attempt === attempts - 1) throw error;
      await sleep(200 * 2 ** attempt);
    }
  }
  throw last;
}

type Env = Record<string, string | undefined>;

async function errorFromResponse(response: Response, name: string): Promise<MnemonicImageError> {
  const text = await response.text();
  let message = text.slice(0, 400);
  try {
    const body = JSON.parse(text);
    const nested = body?.error?.message || body?.error || body?.errors?.[0]?.message || body?.message;
    if (typeof nested === "string" && nested.trim()) message = nested.slice(0, 400);
    else if (nested) message = JSON.stringify(nested).slice(0, 400);
  } catch {
    /* body was not JSON */
  }
  return new MnemonicImageError(`${name} failed (${response.status}): ${message}`, {
    status: response.status,
    code: "provider_failed",
  });
}

function bytesFromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export type GeneratedBytes = { bytes: Uint8Array; mime: string };

async function cloudflare(prompt: string, env: Env, fetchImpl: typeof fetch): Promise<GeneratedBytes> {
  const model = env.CLOUDFLARE_IMAGE_MODEL || CLOUDFLARE_IMAGE_MODEL;
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;
  const flux2 = model.includes("flux-2");
  const response = flux2
    ? await fetchImpl(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
        body: (() => {
          const form = new FormData();
          form.set("prompt", fitImagePrompt(prompt));
          form.set("steps", "8");
          form.set("width", "1024");
          form.set("height", "1024");
          return form;
        })(),
      })
    : await fetchImpl(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        // FLUX.1 schnell rejects `seed` ("Additional properties not allowed").
        body: JSON.stringify({ prompt: fitImagePrompt(prompt), steps: 4 }),
      });
  if (!response.ok) throw await errorFromResponse(response, "Cloudflare");
  const data = await response.json();
  const b64 = data?.result?.image || data?.image;
  if (!b64 || typeof b64 !== "string") {
    throw new MnemonicImageError("Cloudflare returned no image", { status: 502, code: "provider_failed" });
  }
  return { bytes: bytesFromBase64(b64), mime: "image/jpeg" };
}

async function gemini(prompt: string, env: Env, fetchImpl: typeof fetch): Promise<GeneratedBytes> {
  const model = env.GEMINI_IMAGE_MODEL || GEMINI_IMAGE_MODEL;
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": env.GEMINI_API_KEY || "", "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fitImagePrompt(prompt) }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    },
  );
  if (!response.ok) throw await errorFromResponse(response, "Gemini");
  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const inline = part?.inlineData || part?.inline_data;
    if (inline?.data) {
      return { bytes: bytesFromBase64(inline.data), mime: inline.mimeType || inline.mime_type || "image/png" };
    }
  }
  throw new MnemonicImageError("Gemini returned no image", { status: 502, code: "provider_failed" });
}

async function openai(prompt: string, env: Env, fetchImpl: typeof fetch): Promise<GeneratedBytes> {
  const model = env.OPENAI_IMAGE_MODEL || OPENAI_IMAGE_MODEL;
  const response = await fetchImpl("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: fitImagePrompt(prompt),
      size: "1024x1024",
      n: 1,
      quality: "medium",
    }),
  });
  if (!response.ok) throw await errorFromResponse(response, "OpenAI");
  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;
  const remote = data?.data?.[0]?.url;
  if (typeof b64 === "string") return { bytes: bytesFromBase64(b64), mime: "image/png" };
  if (typeof remote === "string") {
    const image = await fetchImpl(remote);
    if (!image.ok) throw await errorFromResponse(image, "OpenAI image download");
    return { bytes: new Uint8Array(await image.arrayBuffer()), mime: image.headers.get("content-type") || "image/png" };
  }
  throw new MnemonicImageError("OpenAI returned no image", { status: 502, code: "provider_failed" });
}

type Provider = { name: string; run: (prompt: string) => Promise<GeneratedBytes> };

export function providerNames(env: Env): string[] {
  const names: string[] = [];
  if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN) names.push("cloudflare");
  if (env.GEMINI_API_KEY) names.push("gemini");
  if (env.OPENAI_API_KEY) names.push("openai");
  return names;
}

function providersFor(env: Env, fetchImpl: typeof fetch): Provider[] {
  const providers: Provider[] = [];
  if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN) {
    providers.push({ name: "cloudflare", run: (prompt) => cloudflare(prompt, env, fetchImpl) });
  }
  if (env.GEMINI_API_KEY) providers.push({ name: "gemini", run: (prompt) => gemini(prompt, env, fetchImpl) });
  if (env.OPENAI_API_KEY) providers.push({ name: "openai", run: (prompt) => openai(prompt, env, fetchImpl) });
  return providers;
}

export function unconfiguredImageMessage() {
  return "No image provider is configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN for FLUX.1 schnell, or OPENAI_API_KEY for gpt-image-2.6-flare. Backpack generate-image is the fallback when those keys are absent, and that function must stop calling retired gpt-image-1.";
}

async function storeBytes(bytes: Uint8Array, mime: string, prompt: string, env: Env, fetchImpl: typeof fetch): Promise<{ url: string; hosted: string }> {
  const hash = await promptCacheKey(prompt);
  const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
  const path = `mnemonic-cache/${hash}.${ext}`;
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && service) {
    const response = await fetchImpl(`${supabaseUrl}/storage/v1/object/uploads/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${service}`,
        apikey: service,
        "Content-Type": mime,
        "x-upsert": "true",
      },
      body: bytes as unknown as BodyInit,
    });
    if (response.ok) {
      return { url: `${supabaseUrl}/storage/v1/object/public/uploads/${path}`, hosted: "supabase" };
    }
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return { url: `data:${mime};base64,${btoa(binary)}`, hosted: "data-url" };
}

async function lookupStored(prompt: string, env: Env, fetchImpl: typeof fetch): Promise<string | null> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const hash = await promptCacheKey(prompt);
  for (const ext of ["jpg", "png", "webp"]) {
    const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/mnemonic-cache/${hash}.${ext}`;
    try {
      const response = await fetchImpl(url, { method: "HEAD" });
      if (response.ok) return url;
    } catch {
      return null;
    }
  }
  return null;
}

export type ImageResult = { url: string; source: string; cached: boolean };

export async function generateMnemonicImage(opts: {
  prompt: string;
  env?: Env;
  fetchImpl?: typeof fetch;
  cache?: Map<string, string>;
  sleep?: (ms: number) => Promise<void>;
  edge?: (prompt: string) => Promise<{ url?: string; error?: string; status?: number }>;
}): Promise<ImageResult> {
  const prompt = fitImagePrompt(opts.prompt || "");
  if (!prompt) {
    throw new MnemonicImageError("Missing image prompt", { status: 400, code: "missing_prompt", retryable: false });
  }
  const env = opts.env || {};
  const fetchImpl = opts.fetchImpl || fetch;
  const cache = opts.cache || new Map<string, string>();
  const key = await promptCacheKey(prompt);
  const hit = cache.get(key);
  if (hit) return { url: hit, source: "cache", cached: true };

  const stored = await lookupStored(prompt, env, fetchImpl);
  if (stored) {
    cache.set(key, stored);
    return { url: stored, source: "storage", cached: true };
  }

  const failures: string[] = [];
  for (const provider of providersFor(env, fetchImpl)) {
    try {
      const image = await withRetries(() => provider.run(prompt), { sleep: opts.sleep });
      const hosted = await storeBytes(image.bytes, image.mime, prompt, env, fetchImpl);
      cache.set(key, hosted.url);
      return { url: hosted.url, source: provider.name, cached: false };
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (opts.edge) {
    try {
      const remote = await withRetries(async () => {
        const result = await opts.edge!(prompt);
        if (!result?.url) {
          throw new MnemonicImageError(result?.error || "Backpack generate-image returned no url", {
            status: result?.status || 502,
            code: "backpack_failed",
          });
        }
        return result.url;
      }, { sleep: opts.sleep });
      cache.set(key, remote);
      return { url: remote, source: "backpack", cached: false };
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (failures.length === 0) {
    throw new MnemonicImageError(unconfiguredImageMessage(), { status: 500, code: "unconfigured", retryable: false });
  }
  throw new MnemonicImageError(`Mnemonic image failed. ${failures.join(" | ")}`.slice(0, 500), {
    status: 502,
    code: "providers_failed",
    retryable: false,
  });
}
