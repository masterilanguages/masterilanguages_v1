import { NextResponse } from "next/server";
import Stripe from "stripe";

const PRICES: Record<string, string> = {
  foundation: "price_1TkynnDAjnrt4pYcWf4Qqyte",
  kickstart: "price_1TkynoDAjnrt4pYcq2VbWsO5",
  fluency: "price_1TkynoDAjnrt4pYc9jNulKqJ",
  accelerator: "price_1Tkys9DAjnrt4pYc4kDit0sj",
};

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const { plan } = await request.json();
  const priceId = PRICES[plan];

  if (!priceId) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const origin = request.headers.get("origin") ?? "https://masterilanguages.com";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/success?plan=${plan}`,
    cancel_url: `${origin}/#programs`,
  });

  return NextResponse.json({ url: session.url });
}
