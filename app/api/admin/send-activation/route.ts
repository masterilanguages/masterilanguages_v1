import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { name, email } = await request.json();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://masterilanguages.com"}/login`;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "Masteri Languages <onboarding@resend.dev>",
      to: email,
      subject: "Activate your Masteri Languages account",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1e293b">
          <h1 style="font-size:22px;font-weight:700;margin-bottom:8px">Welcome to Masteri Languages, ${name}!</h1>
          <p style="color:#475569;margin-bottom:24px">
            Your account is ready. Click the button below to log in and access your student portal.
          </p>
          <a href="${loginUrl}"
            style="display:inline-block;background:#0d9488;color:#fff;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px">
            Access your portal →
          </a>
          <p style="color:#94a3b8;font-size:13px;margin-top:32px">
            If you have any trouble logging in, reply to this email and we'll help you right away.
          </p>
          <p style="color:#94a3b8;font-size:13px;margin-top:8px">
            — The Masteri Languages team
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Resend error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
