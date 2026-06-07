// addWordsToStudentBackpack — replaces the Base44 function of the same name.
// A coach/admin tags a student and pushes words into that student's wordbank;
// a plain user can only add words to their own backpack.
//
// Runs as SERVICE ROLE for all DB access, so the `word` table trigger that
// auto-fills created_by from the JWT email gets NULL. We therefore set
// created_by EXPLICITLY to the target student's email on every inserted row.
//
// Return shape (WRAPPED — StickyNote.jsx reads result.data.added):
//   { data: { success: true, added: <count>, language } }
import { handleCors, json } from "../_shared/cors.ts";
import { requireUser, serviceClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  const auth = await requireUser(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  try {
    const body = await req.json().catch(() => ({}));
    const words = Array.isArray(body?.words) ? body.words : [];
    if (!words.length) {
      return json({ error: "Missing words" }, 400);
    }

    // Resolve the target student. Admins/coaches may target another student via
    // the request body; everyone else can only write to their own backpack.
    const callerEmail = auth.user.email as string;
    const role = (auth.user.app_metadata as any)?.user_role || "user";
    const privileged = role === "admin" || role === "coach";
    const studentEmail =
      privileged && body?.student_email ? String(body.student_email) : callerEmail;

    if (!studentEmail) {
      return json({ error: "Missing student_email" }, 400);
    }

    const svc = serviceClient();

    // Student's learning language (defaults to hebrew, matching the original).
    const { data: profiles } = await svc
      .from("user_profile")
      .select("language")
      .eq("created_by", studentEmail)
      .limit(1);
    const language = profiles?.[0]?.language || "hebrew";

    // Existing wordbank words for this student, to dedupe against.
    const { data: existingWords } = await svc
      .from("word")
      .select("word")
      .eq("created_by", studentEmail)
      .eq("category", "wordbank");
    const existingSet = new Set(
      (existingWords || []).map((w: any) => (w.word || "").toLowerCase()),
    );

    // Build the rows to insert, deduping against existing + within this batch.
    const seen = new Set<string>();
    const rows: any[] = [];
    for (const raw of words) {
      const word = typeof raw === "string" ? raw : (raw?.word ?? "");
      if (!word) continue;
      const key = word.toLowerCase();
      if (existingSet.has(key) || seen.has(key)) continue;
      seen.add(key);
      rows.push({
        word,
        translation: "",
        category: "wordbank",
        language,
        vocab_level: 0,
        times_practiced: 0,
        mastered: false,
        // CRITICAL: under service-role the created_by trigger sees no JWT, so
        // we set it explicitly or the NOT NULL constraint fails.
        created_by: studentEmail,
      });
    }

    let added = 0;
    if (rows.length) {
      const { error } = await svc.from("word").insert(rows);
      if (error) return json({ error: error.message }, 400);
      added = rows.length;
    }

    return json({ data: { success: true, added, language } });
  } catch (err: any) {
    return json({ error: err?.message || String(err) }, 500);
  }
});
