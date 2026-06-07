// delete-user — replaces base44.entities.User.delete(id). Admin only.
import { handleCors, json } from "../_shared/cors.ts";
import { requireAdmin, serviceClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  const admin = await requireAdmin(req);
  if (!admin.ok) return json({ error: admin.error }, admin.status);

  try {
    const { id } = await req.json().catch(() => ({}));
    if (!id) return json({ error: "Missing 'id'" }, 400);

    const svc = serviceClient();
    const { error } = await svc.auth.admin.deleteUser(id);
    if (error) return json({ error: error.message }, 400);
    return json({ success: true });
  } catch (err: any) {
    return json({ error: err?.message || String(err) }, 500);
  }
});
