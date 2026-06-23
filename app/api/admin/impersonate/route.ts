import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const SESSION_COOKIE = "masteri-admin-session";
const STUDENT_APP_URL = process.env.NEXT_PUBLIC_STUDENT_APP_URL ?? "https://masteri-student.vercel.app";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);

  if (session?.value !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await request.json();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: STUDENT_APP_URL },
  });

  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ error: error?.message ?? "Failed to generate link" }, { status: 500 });
  }

  return NextResponse.json({ url: data.properties.action_link });
}
