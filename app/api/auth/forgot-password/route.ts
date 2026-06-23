import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "Masteri Languages <onboarding@resend.dev>",
      to: "info@masterilanguages.com",
      subject: `Password reset request: ${email}`,
      text: `A student requested a password reset.\n\nEmail: ${email}\n\nPlease send them their login credentials manually.`,
    });
  } catch {
    // Resend not configured — fail silently, still show success to user
  }

  return NextResponse.json({ ok: true });
}
