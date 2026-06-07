// list-users — replaces base44.entities.User.list(). Admin only.
// Returns an array of { id, email, role, full_name }.
import { handleCors, json } from "../_shared/cors.ts";
import { requireAdmin, serviceClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  const admin = await requireAdmin(req);
  if (!admin.ok) return json({ error: admin.error }, admin.status);

  try {
    const svc = serviceClient();
    const users: any[] = [];
    let page = 1;
    while (true) {
      const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return json({ error: error.message }, 500);
      for (const u of data.users) {
        users.push({
          id: u.id,
          email: u.email,
          role: (u.app_metadata as any)?.user_role || "user",
          full_name: (u.user_metadata as any)?.full_name || null,
        });
      }
      if (data.users.length < 1000) break;
      page++;
    }
    return json(users);
  } catch (err: any) {
    return json({ error: err?.message || String(err) }, 500);
  }
});
