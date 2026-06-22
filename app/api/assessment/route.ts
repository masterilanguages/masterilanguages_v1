import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const body = await request.json();
  const { email, language, level, goal, timeline, commitment, challenge, recommendedProgram } = body;

  // Save to Supabase
  const { error } = await supabase.from("assessment_leads").insert([{
    email, language, level, goal, timeline, commitment, challenge,
    recommended_program: recommendedProgram,
    created_at: new Date().toISOString(),
  }]);

  if (error) console.error("Supabase error:", error);

  // Send notification email via Resend
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Masteri Languages <hello@masterilanguages.com>",
      to: "info@masterilanguages.com",
      subject: `New Assessment Lead — ${recommendedProgram} — ${email}`,
      html: `
        <h2>New Assessment Completed</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Language:</strong> ${language}</p>
        <p><strong>Level:</strong> ${level}</p>
        <p><strong>Goal:</strong> ${goal}</p>
        <p><strong>Timeline:</strong> ${timeline}</p>
        <p><strong>Commitment:</strong> ${commitment}</p>
        <p><strong>Biggest Challenge:</strong> ${challenge}</p>
        <hr/>
        <p><strong>Recommended Program:</strong> ${recommendedProgram}</p>
      `,
    });
  } catch (e) {
    console.error("Resend error:", e);
  }

  return NextResponse.json({ ok: true });
}
