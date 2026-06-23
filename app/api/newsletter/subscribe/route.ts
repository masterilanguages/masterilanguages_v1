import { NextResponse } from "next/server";

const AUDIENCE_NAME = "Masteri Languages Newsletter";

async function getOrCreateAudienceId(resend: any): Promise<string | null> {
  try {
    // If an ID is already set in env, use it directly
    if (process.env.RESEND_AUDIENCE_ID) {
      return process.env.RESEND_AUDIENCE_ID;
    }

    // Try to find an existing audience with the same name
    const { data: listData, error: listError } = await resend.audiences.list();
    if (!listError && listData?.data) {
      const existing = listData.data.find((a: any) => a.name === AUDIENCE_NAME);
      if (existing) return existing.id;
    }

    // Create a new audience
    const { data: createData, error: createError } = await resend.audiences.create({ name: AUDIENCE_NAME });
    if (createError || !createData?.id) return null;
    return createData.id;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const audienceId = await getOrCreateAudienceId(resend);

    if (audienceId) {
      // Add subscriber to Resend Audience
      await resend.contacts.create({
        audienceId,
        email,
        unsubscribed: false,
      });
    }

    // Also notify admin
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
