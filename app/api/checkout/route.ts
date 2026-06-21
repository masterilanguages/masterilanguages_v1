import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICES: Record<string, string> = {
  kickstart: "price_1Tku5YDgkz2ROtPhYkNlSpsH",
  fluency: "price_1Tku5ZDgkz2ROtPh1DvmJbe5",
  intensive: "price_1Tku5ZDgkz2ROtPhEqKsgvUw",
};

export async function POST(request: Request) {
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
