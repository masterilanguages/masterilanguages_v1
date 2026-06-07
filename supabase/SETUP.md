# SETUP.md — Running the rebuilt app on Supabase + Vite

This app was originally built on Base44 and is now re-pointed to Supabase.
Follow these steps in order. Steps 1–6 stand up the backend; steps 7–9 run the
frontend.

## Apply order

1. **Create a Supabase project.**
   Go to https://supabase.com/dashboard, create a new project, and wait for it
   to finish provisioning. Note the project's region and password.

2. **Run the schema.**
   Open **SQL Editor** in the dashboard, paste the contents of
   `supabase/schema.sql`, and run it. This creates all tables (snake_case:
   `achievement`, `activity_progress`, `chat_message`, … `word`), the
   `created_by` / `created_date` / `updated_date` conventions, the ownership
   trigger that stamps `created_by` = the user's email server-side, the
   `app_role()` helper, and the RLS policies.

3. **Create the Storage bucket.**
   Go to **Storage** and create a **public** bucket named exactly `uploads`.
   This backs file/image uploads (the former `UploadFile` integration).

4. **Enable the Email auth provider.**
   Go to **Authentication > Providers** and enable **Email**. (For local dev you
   may also turn off "Confirm email" so the admin can sign in immediately.)

5. **Sign up the admin user in the app.**
   Start the app (you can do steps 7–9 first if you prefer) and sign up with
   `teamq@groupquimera.com`. The user must exist in `auth.users` before it can
   be promoted.

6. **Promote the admin, then re-login.**
   In the **SQL Editor**, run `supabase/make_admin.sql`. Then **sign out and
   sign back in** in the app — `app_metadata.user_role` is embedded in the JWT
   at sign-in, so the new `admin` role only takes effect after a fresh login.

7. **Configure environment variables.**
   Copy `.env.local.example` to `.env.local` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   Both are in **Project Settings > API** (URL = "Project URL", anon key =
   "Project API keys > anon public").

8. **Install dependencies.**
   Run `npm install` (required after the package.json dependency changes:
   `@base44/sdk` and `@base44/vite-plugin` removed, `@supabase/supabase-js`
   added).

9. **Run the dev server.**
   Run `npm run dev` and open the printed local URL.

## What is NOT wired up yet

AI (InvokeLLM), image generation, email (SendEmail), and YouTube integrations
require the **Edge Functions stage**, which is next. The server-side secrets
listed (commented) in `.env.local.example` belong to those functions, not the
Vite app. Until the Edge Functions are deployed, those specific features stay
**inert** — the rest of the app (auth, data, RLS, uploads) works fully.

---

## Estado de esta entrega (Stage B + F) y pendientes

 Hecho automaticamente en el repo:
- supabase/schema.sql  -> 34 tablas + enums + triggers + RLS (pegar en el SQL editor)
- supabase/make_admin.sql -> promover a teamq@groupquimera.com como admin
- src/api/supabaseClient.js, src/api/base44Client.js (shim), entities.js, integrations.js
- src/lib/AuthContext.jsx -> reescrito para usar la sesion de Supabase (ya NO usa Base44)
- vite.config.js -> sin el plugin de Base44 (alias @ -> src)
- package.json -> fuera @base44/sdk y @base44/vite-plugin; dentro @supabase/supabase-js
- .env.local.example

### Stage G: HECHO (IA / imagen / email / usuarios)
Las Edge Functions estan escritas en supabase/functions/ (ver supabase/functions/README.md):
invoke-llm (Claude), generate-image (gpt-image-1), send-email (Resend),
invite-user, list-users, delete-user, log-user-in-app.
Para activarlas: copiar supabase/functions/.env.example -> .env, llenarlo, y:
  supabase secrets set --env-file supabase/functions/.env
  supabase functions deploy invoke-llm   (y las demas; ver functions/README.md)

### Stage H: HECHO (YouTube)
Las 4 funciones que la app invoca + el flujo OAuth estan en supabase/functions/:
youtubeTranscript (sin OAuth; con fallback Whisper), youtubeCaptionsList,
youtubeCaptionsDownload, addWordsToStudentBackpack, y youtube-oauth-start/callback/status.
Los tokens de Google viven en la tabla youtube_oauth_tokens (migracion
supabase/migrations/0002_youtube_oauth_tokens.sql -> correr en el SQL editor),
NO en /tmp. Ver supabase/functions/README.md para el deploy + setup de Google OAuth.
OJO: el callback se despliega con --no-verify-jwt (Google lo llama sin JWT).
(send-sms y extract-data-from-uploaded-file: exportados pero sin uso; no se crearon.)

### OJO con el shape de functions.invoke (verificado en el codigo)
Los consumidores NO son consistentes:
- youtubeTranscript: los llamadores leen result.data.X  -> la Edge Function debe devolver { data: { transcript: [...] } }
- youtubeCaptionsList / youtubeCaptionsDownload: leen result.video_id / result.tracks / result.transcript_text al tope -> devolver esos campos al nivel superior (sin envolver en data)
El shim devuelve el body sin envolver; cada Edge Function debe respetar el shape que su llamador espera.

### Notas
- Crear un bucket de Storage llamado "uploads" (publico) -> lo usa UploadFile.
- app_metadata.user_role se hornea en el JWT al iniciar sesion: tras correr make_admin.sql hay que cerrar y volver a abrir sesion.
- src/lib/app-params.js quedo sin uso (ya nadie lo importa); se puede borrar.
