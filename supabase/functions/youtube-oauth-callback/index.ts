// GET youtube-oauth-callback
// Google redirects the browser here with ?code (NO JWT) -> deploy with
// verify_jwt=false. Exchanges the authorization code for tokens, persists them
// to the youtube_oauth_tokens singleton via saveTokens(), then 302-redirects
// the browser back to APP_URL.
import { saveTokens } from "../_shared/youtube-auth.ts";

function appUrl(suffix = ""): string {
  const base = Deno.env.get("APP_URL") || "/";
  return `${base}${suffix}`;
}

Deno.serve(async (req) => {
  // No CORS / no auth gate: this is a top-level browser redirect from Google.
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const oauthError = url.searchParams.get("error");

    if (oauthError) {
      return Response.redirect(
        appUrl(`?youtube_error=${encodeURIComponent(oauthError)}`),
        302,
      );
    }

    if (!code) {
      return Response.redirect(
        appUrl("?youtube_error=no_authorization_code"),
        302,
      );
    }

    const clientId = Deno.env.get("YOUTUBE_CLIENT_ID");
    const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET");
    const redirectUri = Deno.env.get("YOUTUBE_REDIRECT_URI");
    if (!clientId || !clientSecret || !redirectUri) {
      return Response.redirect(
        appUrl("?youtube_error=youtube_oauth_not_configured"),
        302,
      );
    }

    // Exchange the authorization code for tokens.
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const tokens = await resp.json();
    if (!resp.ok || !tokens.access_token) {
      const detail = tokens.error_description || tokens.error ||
        "token_exchange_failed";
      console.error("OAuth token exchange error:", detail);
      return Response.redirect(
        appUrl(`?youtube_error=${encodeURIComponent(detail)}`),
        302,
      );
    }

    // Persist to the singleton row. expires_in (seconds) is converted to an
    // absolute expiry_date inside saveTokens.
    await saveTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
      token_type: tokens.token_type,
    });

    return Response.redirect(appUrl("?youtube_connected=1"), 302);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return Response.redirect(
      appUrl(`?youtube_error=${encodeURIComponent((error as Error).message)}`),
      302,
    );
  }
});
