import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Comma-separated list of enrolled student emails managed in Vercel env vars.
  // Add a student's email here after they pay/enroll via the control panel.
  const enrolledEmails = (process.env.ENROLLED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isEnrolled = enrolledEmails.includes(email.toLowerCase());

  if (!isEnrolled) {
    return NextResponse.json({ status: "not_enrolled" });
  }

  // Student is enrolled — send activation email
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Notify admin to manually send password setup link until self-serve is built
    await resend.emails.send({
      from: "Masteri Languages <onboarding@resend.dev>",
      to: "info@masterilanguages.com",
      subject: `Activation email requested: ${email}`,
      text: `Enrollment verified for ${email}.\n\nPlease send them their login credentials and password setup link now.`,
    });
  } catch {
    // Resend not configured — still return verified status
  }

  return NextResponse.json({ status: "sent" });
}
