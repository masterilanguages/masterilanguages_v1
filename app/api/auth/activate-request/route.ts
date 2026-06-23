import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    // TODO: When student DB exists, check enrollment status here before sending.
    // For now, notify admin to manually verify and send activation.
    await resend.emails.send({
      from: "Masteri Languages <onboarding@resend.dev>",
      to: "info@masterilanguages.com",
      subject: `Account activation request: ${email}`,
      text: `A student has requested account activation.\n\nEmail: ${email}\n\nPlease verify their enrollment in the control panel and send them their login credentials manually.`,
    });
  } catch {
    // Resend not configured — fail silently, still return success
  }

  return NextResponse.json({ ok: true });
}
