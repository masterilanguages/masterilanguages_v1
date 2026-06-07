// log-user-in-app — replaces base44.appLogs.logUserInApp(page).
// Fire-and-forget analytics. No-op by default (the frontend already ignores
// the result). Wire this to a usage table / PostHog / Plausible if you want it.
import { handleCors, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;
  return json({ ok: true });
});
