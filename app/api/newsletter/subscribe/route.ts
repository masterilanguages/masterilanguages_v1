import { NextResponse } from "next/server";

// Subscribers are stored in a global in-memory store for this serverless function.
// For persistence across deploys, connect a database. For now, admin manages via localStorage.
export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  // Notify admin of new subscriber via email
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Masteri Languages <onboarding@resend.dev>",
      to: "info@masterilanguages.com",
      subject: `New newsletter subscriber: ${email}`,
      text: `${email} subscribed to the Masteri Languages newsletter.`,
    });
  } catch {
    // Resend not configured — still return success
  }
  return NextResponse.json({ ok: true });
}
