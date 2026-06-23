import { NextResponse } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "masteri2026";
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@masterilanguages.com";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "demo2026";
const STUDENT_EMAIL = process.env.STUDENT_EMAIL ?? "student@masterilanguages.com";
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD ?? "student2026";
const SESSION_COOKIE = "masteri-admin-session";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const isAdmin = password === ADMIN_PASSWORD;
  const isDemo = email === DEMO_EMAIL && password === DEMO_PASSWORD;
  const isStudent = email === STUDENT_EMAIL && password === STUDENT_PASSWORD;

  if (!isAdmin && !isDemo && !isStudent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = isAdmin ? "admin" : "student";
  const redirectTo = isAdmin ? "/dashboard" : "/portal/dashboard";

  const response = NextResponse.json({ ok: true, redirectTo });
  response.cookies.set(SESSION_COOKIE, role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
