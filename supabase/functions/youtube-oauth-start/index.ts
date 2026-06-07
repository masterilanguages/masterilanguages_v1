// youtube-oauth-start (called via supabase.functions.invoke from an admin UI)
// Admin-gated. Builds the Google OAuth consent URL (YouTube read-only +
// force-ssl scopes, offline access, forced consent so we always get a
// refresh_token) and returns it as { url } for the frontend to redirect to.
// We return JSON rather than a 302 because this is reached via an authenticated
// invoke that carries the admin JWT — a raw browser navigation would have none.
import { handleCors, json } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  const gate = await requireAdmin(req);
  if (!gate.ok) return json({ error: gate.error }, gate.status);

  try {
    const clientId = Deno.env.get("YOUTUBE_CLIENT_ID");
    const redirectUri = Deno.env.get("YOUTUBE_REDIRECT_URI");
    if (!clientId || !redirectUri) {
      return json({ error: "youtube_oauth_not_configured" }, 500);
    }

    const scope = [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.force-ssl",
    ].join(" ");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope,
      state: "youtube_auth",
    });

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return json({ url: authUrl });
  } catch (error) {
    console.error("OAuth start error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
