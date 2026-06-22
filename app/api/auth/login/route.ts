import { NextResponse } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "masteri2026";
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@masterilanguages.com";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "demo2026";
const SESSION_COOKIE = "masteri-admin-session";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const isAdmin = password === ADMIN_PASSWORD;
  const isDemo = email === DEMO_EMAIL && password === DEMO_PASSWORD;

  if (!isAdmin && !isDemo) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
