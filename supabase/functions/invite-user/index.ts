// invite-user — replaces base44.users.inviteUser(email, role). Admin only.
import { handleCors, json } from "../_shared/cors.ts";
import { requireAdmin, serviceClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  const admin = await requireAdmin(req);
  if (!admin.ok) return json({ error: admin.error }, admin.status);

  try {
    const { email, role } = await req.json().catch(() => ({}));
    if (!email) return json({ error: "Missing 'email'" }, 400);

    const svc = serviceClient();
    const { data, error } = await svc.auth.admin.inviteUserByEmail(email);
    if (error) return json({ error: error.message }, 400);

    // Stamp the app role so RLS/UI gating works once they sign in.
    if (role && data?.user?.id) {
      await svc.auth.admin.updateUserById(data.user.id, {
        app_metadata: { user_role: role },
      });
    }
    return json({
      success: true,
      user: { id: data?.user?.id, email: data?.user?.email },
    });
  } catch (err: any) {
    return json({ error: err?.message || String(err) }, 500);
  }
});
