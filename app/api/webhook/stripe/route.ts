import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email ?? session.customer_email;
    const plan = session.metadata?.plan ?? "unknown";

    if (!email) {
      console.error("No email found in Stripe session:", session.id);
      return NextResponse.json({ error: "No email" }, { status: 400 });
    }

    // Create Supabase user and send activation email
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { plan, stripe_session_id: session.id },
      redirectTo: "https://masteri-student.vercel.app/login",
    });

    if (error && error.message !== "User already registered") {
      console.error("Supabase invite error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✓ Activation email sent to ${email} (plan: ${plan})`);

    // Notify admin
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Masteri Languages <hello@masterilanguages.com>",
        to: "hello@masterilanguages.com",
        subject: `New enrollment — ${plan} — ${email}`,
        html: `
          <h2>New Student Enrolled</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Plan:</strong> ${plan}</p>
          <p><strong>Stripe Session:</strong> ${session.id}</p>
          <p><strong>Amount:</strong> $${((session.amount_total ?? 0) / 100).toFixed(2)}</p>
          <hr/>
          <p>Activation email has been sent to the student automatically.</p>
        `,
      });
    } catch (e) {
      console.error("Admin notification error:", e);
    }
  }

  return NextResponse.json({ received: true });
}
