// POST youtube-oauth-status
// Admin-gated. Reports whether the app's YouTube connection is live by reading
// the youtube_oauth_tokens singleton via getStatus().
import { handleCors, json } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getStatus } from "../_shared/youtube-auth.ts";

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  const gate = await requireAdmin(req);
  if (!gate.ok) return json({ error: gate.error }, gate.status);

  try {
    const status = await getStatus();
    return json(status);
  } catch (error) {
    console.error("OAuth status error:", error);
    return json({ connected: false, error: (error as Error).message }, 500);
  }
});
