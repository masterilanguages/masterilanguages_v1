// Shared Google/YouTube OAuth token store + access-token provider.
//
// The single shared connection lives in the `youtube_oauth_tokens` table
// (singleton row), NOT in /tmp (which is ephemeral on edge functions).
// All DB access uses the service-role client (bypasses RLS); no policies exist
// on that table on purpose.
//
// EXPORTS (depended on by name by the captions + oauth functions):
//   saveTokens(t)            upsert the singleton row
//   getStatus()              { connected, expiry_date, updated_at }
//   getValidAccessToken()    a non-expired access token (refreshes if needed)
import { serviceClient } from "./auth.ts";

const TOKEN_URI = "https://oauth2.googleapis.com/token";
const SINGLETON_ID = "singleton";

export interface TokenInput {
  access_token?: string | null;
  refresh_token?: string | null;
  // Either pass an absolute expiry (ms epoch) ...
  expiry_date?: number | null;
  // ... or a relative lifetime in seconds (Google's token response field).
  expires_in?: number | null;
  scope?: string | null;
  token_type?: string | null;
}

interface TokenRow {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expiry_date: number | null;
  scope: string | null;
  token_type: string | null;
  updated_at: string | null;
}

async function loadRow(): Promise<TokenRow | null> {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("youtube_oauth_tokens")
    .select("*")
    .eq("id", SINGLETON_ID)
    .maybeSingle();
  if (error) throw new Error(`Failed to load YouTube tokens: ${error.message}`);
  return (data as TokenRow) ?? null;
}

// Upsert the singleton row. If a refresh response omits refresh_token we keep the
// existing one. expiry_date is taken as-is when provided, otherwise derived from
// expires_in (now_ms + expires_in*1000).
export async function saveTokens(t: TokenInput): Promise<void> {
  const supabase = serviceClient();
  const existing = await loadRow();

  let expiry_date: number | null = null;
  if (typeof t.expiry_date === "number" && !Number.isNaN(t.expiry_date)) {
    expiry_date = t.expiry_date;
  } else if (typeof t.expires_in === "number" && !Number.isNaN(t.expires_in)) {
    expiry_date = Date.now() + t.expires_in * 1000;
  } else {
    expiry_date = existing?.expiry_date ?? null;
  }

  const row = {
    id: SINGLETON_ID,
    access_token: t.access_token ?? existing?.access_token ?? null,
    // Google omits refresh_token on refresh responses; keep the one we have.
    refresh_token: t.refresh_token ?? existing?.refresh_token ?? null,
    expiry_date,
    scope: t.scope ?? existing?.scope ?? null,
    token_type: t.token_type ?? existing?.token_type ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("youtube_oauth_tokens")
    .upsert(row, { onConflict: "id" });
  if (error) throw new Error(`Failed to save YouTube tokens: ${error.message}`);
}

export async function getStatus(): Promise<{
  connected: boolean;
  expiry_date: number | null;
  updated_at: string | null;
}> {
  const row = await loadRow();
  return {
    connected: !!(row && row.refresh_token),
    expiry_date: row?.expiry_date ?? null,
    updated_at: row?.updated_at ?? null,
  };
}

function notConnected(): Error {
  const err = new Error("youtube_not_connected");
  (err as Error & { status?: number }).status = 401;
  return err;
}

// Returns a NON-expired access token. Refreshes (and persists) when the stored
// token is within ~60s of expiry. Throws a 401 "youtube_not_connected" Error
// when there is no stored connection / refresh_token.
export async function getValidAccessToken(): Promise<string> {
  const row = await loadRow();
  if (!row || !row.refresh_token) throw notConnected();

  const skewMs = 60_000; // 60s clock-skew buffer
  const stillValid =
    !!row.access_token &&
    typeof row.expiry_date === "number" &&
    Date.now() < row.expiry_date - skewMs;

  if (stillValid) return row.access_token as string;

  // Refresh.
  const clientId = Deno.env.get("YOUTUBE_CLIENT_ID");
  const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: row.refresh_token as string,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const resp = await fetch(TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    // invalid_grant => the refresh token was revoked/expired: treat as disconnected.
    if (resp.status === 400 || resp.status === 401) throw notConnected();
    throw new Error(`YouTube token refresh failed (${resp.status}): ${detail}`);
  }

  const data = await resp.json() as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
  };

  await saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null, // omitted on refresh -> keep existing
    expires_in: data.expires_in,
    scope: data.scope ?? null,
    token_type: data.token_type ?? null,
  });

  return data.access_token;
}
