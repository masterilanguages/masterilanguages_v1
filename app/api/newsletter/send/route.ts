import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { subscribers, subject, body } = await request.json();

  if (!subscribers?.length || !subject || !body) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const results = await Promise.allSettled(
    subscribers.map((email: string) =>
      resend.emails.send({
        from: "Masteri Languages <hello@masterilanguages.com>",
        to: email,
        subject,
        html: body.replace(/\n/g, "<br/>"),
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;

  return NextResponse.json({ sent, failed });
}
