import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SESSION_COOKIE = "masteri-admin-session";

export async function POST() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);

  // Only allow from an authenticated admin session
  if (session?.value !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "student", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 2, // 2 hours
    path: "/",
  });
  return response;
}
