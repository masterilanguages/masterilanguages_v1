// send-email — replaces Base44's integrations.Core.SendEmail, backed by Resend.
import { handleCors, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string)
  );
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  const auth = await requireUser(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  try {
    const key = Deno.env.get("RESEND_API_KEY");
    const from =
      Deno.env.get("RESEND_FROM") || "Language Masteri <onboarding@resend.dev>";
    if (!key) return json({ error: "RESEND_API_KEY is not set" }, 500);

    const body = await req.json().catch(() => ({}));
    const { to, subject, body: emailBody, html } = body || {};
    if (!to || !subject) return json({ error: "Missing 'to' or 'subject'" }, 400);

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        text: emailBody || undefined,
        html:
          html ||
          (emailBody
            ? `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(emailBody)}</pre>`
            : undefined),
      }),
    });
    const data = await resp.json();
    if (!resp.ok) return json({ error: data?.message || "Email failed" }, 502);
    return json({ success: true, id: data?.id });
  } catch (err: any) {
    return json({ error: err?.message || String(err) }, 500);
  }
});
