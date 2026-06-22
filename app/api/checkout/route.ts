import { NextResponse } from "next/server";
import Stripe from "stripe";

const PRICES: Record<string, string> = {
  kickstart: "price_1TkyQeDAjnrt4pYc4LyyF9kD",
  fluency: "price_1TkyQeDAjnrt4pYcOKW9a16y",
  intensive: "price_1TkyQfDAjnrt4pYcctsdG8td",
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
