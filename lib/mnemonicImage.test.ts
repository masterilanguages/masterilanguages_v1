import test from "node:test";
import assert from "node:assert/strict";
import {
  CLOUDFLARE_IMAGE_MODEL,
  OPENAI_IMAGE_MODEL,
  fitImagePrompt,
  generateMnemonicImage,
  providerNames,
  withRetries,
} from "./mnemonicImage.ts";

const sleep = async () => {};

test("retries a 503 and then accepts the image", async () => {
  let calls = 0;
  await withRetries(async () => {
    calls += 1;
    if (calls < 3) {
      const error = new Error("busy") as Error & { retryable?: boolean };
      error.retryable = true;
      throw error;
    }
    return "ok";
  }, { sleep });
  assert.equal(calls, 3);
});

test("does not retry a 400", async () => {
  let calls = 0;
  await assert.rejects(() => withRetries(async () => {
    calls += 1;
    const error = new Error("bad prompt") as Error & { retryable?: boolean; status?: number };
    error.retryable = false;
    error.status = 400;
    throw error;
  }, { sleep }));
  assert.equal(calls, 1);
});

test("Cloudflare is tried without a seed and a cache hit skips the provider", async () => {
  const bodies: string[] = [];
  let calls = 0;
  const fetchImpl = async (_url: string, init?: RequestInit) => {
    calls += 1;
    bodies.push(String(init?.body || ""));
    return new Response(JSON.stringify({ result: { image: btoa("pixels") } }), { status: 200 });
  };
  const cache = new Map<string, string>();
  const env = { CLOUDFLARE_ACCOUNT_ID: "acc", CLOUDFLARE_API_TOKEN: "tok" };
  const first = await generateMnemonicImage({
    prompt: "a house",
    env,
    fetchImpl: fetchImpl as typeof fetch,
    cache,
    sleep,
  });
  assert.equal(first.source, "cloudflare");
  assert.equal(first.cached, false);
  assert.match(first.url, /^data:image\/jpeg;base64,/);
  assert.equal(calls, 1);
  const sent = JSON.parse(bodies[0]);
  assert.equal(sent.steps, 4);
  assert.equal("seed" in sent, false);
  assert.match(bodies[0], new RegExp(CLOUDFLARE_IMAGE_MODEL) ? /a house/ : /a house/);
  const second = await generateMnemonicImage({
    prompt: "a house",
    env,
    fetchImpl: fetchImpl as typeof fetch,
    cache,
    sleep,
  });
  assert.equal(second.cached, true);
  assert.equal(calls, 1);
});

test("a Cloudflare 400 falls through to gpt-image-2.6-flare", async () => {
  const requests: { url: string; body: string }[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    requests.push({ url, body: String(init?.body || "") });
    if (String(url).includes("cloudflare")) {
      return new Response(JSON.stringify({ errors: [{ message: "seed is not allowed" }] }), { status: 400 });
    }
    const parsed = JSON.parse(String(init?.body));
    assert.equal(parsed.model, OPENAI_IMAGE_MODEL);
    assert.notEqual(parsed.model, "gpt-image-1");
    return new Response(JSON.stringify({ data: [{ b64_json: btoa("png") }] }), { status: 200 });
  };
  const result = await generateMnemonicImage({
    prompt: "a dog",
    env: { CLOUDFLARE_ACCOUNT_ID: "acc", CLOUDFLARE_API_TOKEN: "tok", OPENAI_API_KEY: "sk" },
    fetchImpl: fetchImpl as typeof fetch,
    cache: new Map(),
    sleep,
  });
  assert.equal(result.source, "openai");
  assert.equal(requests.length, 2);
});

test("with no local keys the Backpack function is used, and its error is kept", async () => {
  const ok = await generateMnemonicImage({
    prompt: "a dog",
    env: {},
    fetchImpl: (async () => { throw new Error("should not fetch"); }) as typeof fetch,
    cache: new Map(),
    sleep,
    edge: async () => ({ url: "https://cdn.example/dog.png" }),
  });
  assert.equal(ok.source, "backpack");
  assert.equal(ok.url, "https://cdn.example/dog.png");

  await assert.rejects(
    () => generateMnemonicImage({
      prompt: "a dog",
      env: {},
      cache: new Map(),
      sleep,
      edge: async () => ({ error: "gpt-image-1 was shut down", status: 502 }),
    }),
    /gpt-image-1 was shut down/,
  );
});

test("no provider and no Backpack function says which keys are required", async () => {
  assert.deepEqual(providerNames({}), []);
  await assert.rejects(
    () => generateMnemonicImage({ prompt: "a dog", env: {}, cache: new Map(), sleep }),
    /CLOUDFLARE_ACCOUNT_ID/,
  );
});

test("prompts are capped under the FLUX limit and an empty prompt is rejected", () => {
  assert.equal(fitImagePrompt("x".repeat(2500)).length, 2000);
  return assert.rejects(
    () => generateMnemonicImage({ prompt: "   ", env: {}, cache: new Map(), sleep }),
    /Missing image prompt/,
  );
});
