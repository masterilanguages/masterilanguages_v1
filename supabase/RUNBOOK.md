# RUNBOOK — De 0 a la app corriendo

Guía exacta para levantar Language Masteri sobre Supabase. Está partida en dos:
**Parte 1** te deja datos + login funcionando (sin IA) en ~15 min. **Parte 2**
enciende la IA (Claude, imágenes, email) y YouTube.

Admin: `teamq@groupquimera.com`. Comandos pensados para Windows PowerShell.

---

## Parte 0 — Cuentas y llaves (junta esto antes)

- Cuenta en **Supabase** (https://supabase.com).
- **Anthropic API key** (https://console.anthropic.com) → para Claude.
- **OpenAI API key** (https://platform.openai.com) → para imágenes (gpt-image-1) y Whisper.
- **Resend API key** (https://resend.com) → para emails.
- (Opcional, para subtítulos de YouTube) un **OAuth client de Google Cloud** — se puede dejar para después.

---

## Parte 1 — Datos + Login (sin IA todavía)

### 1. Crear el proyecto Supabase
1. Dashboard → **New project**. Elige nombre, contraseña de DB y región. Espera a que termine de aprovisionar.
2. Anota de **Project Settings → API**:
   - **Project URL** → `https://<REF>.supabase.co`
   - **anon public key**
   - **service_role key** (secreta — solo para funciones)
   - El **REF** es el subdominio (`<REF>` en la URL).

### 2. Cargar el esquema
SQL Editor → **New query** → pega y corre, en este orden:
1. Todo `supabase/schema.sql`  → crea las 34 tablas, enums, triggers y RLS.
2. Todo `supabase/migrations/0002_youtube_oauth_tokens.sql`  → tabla de tokens de YouTube (inofensiva aunque no uses YouTube).

### 3. Storage
**Storage → New bucket** → nombre exacto **`uploads`** → marca **Public**. (Las URLs de archivos/imágenes deben ser de lectura pública.)

### 4. Auth
**Authentication → Providers → Email** → habilitar.
Para desarrollo: en **Authentication → Settings**, desactiva *"Confirm email"* para poder entrar sin confirmar.

### 5. Variables del frontend
En la raíz del repo, crea `.env.local` (copia de `.env.local.example`) con:
```
VITE_SUPABASE_URL=https://<REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```
PowerShell:
```powershell
Copy-Item .env.local.example .env.local
# luego edita .env.local con tus valores
```

### 6. Levantar la app y crear tu admin
```powershell
npm install      # si no lo corriste ya
npm run dev      # abre http://localhost:5173
```
1. En la pantalla de **Login**, haz **Sign up** con `teamq@groupquimera.com` + una contraseña.
2. SQL Editor → corre `supabase/make_admin.sql` (ya apunta a tu email).
3. **Cierra y vuelve a abrir sesión** (para que el JWT traiga `user_role=admin`).

✅ **A esta altura ya funciona:** login, navegación, y crear/leer/editar registros de las 34 tablas con aislamiento por usuario (RLS). La IA todavía no — eso es la Parte 2.

---

## Parte 2 — Encender la IA + funciones

### 7. CLI de Supabase + link
```powershell
npx supabase login
npx supabase link --project-ref <REF>
```
(No necesitas Docker para *deploy* de funciones.)

### 8. Secretos de las funciones
Crea `supabase/functions/.env` (copia de `.env.example`) y llénalo:
```
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-haiku-4-5
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
RESEND_FROM=Language Masteri <onboarding@resend.dev>
```
Cárgalos:
```powershell
npx supabase secrets set --env-file supabase/functions/.env
```

### 9. Desplegar funciones
```powershell
npx supabase functions deploy invoke-llm
npx supabase functions deploy generate-image
npx supabase functions deploy send-email
npx supabase functions deploy invite-user
npx supabase functions deploy list-users
npx supabase functions deploy delete-user
npx supabase functions deploy log-user-in-app
npx supabase functions deploy youtubeTranscript
npx supabase functions deploy addWordsToStudentBackpack
```
✅ Recarga la app: ahora traducción/transliteración (Claude), imágenes mnemónicas (gpt-image-1), email (Resend) y transcripción de YouTube (youtubeTranscript) funcionan.

### 10. Smoke test (orden sugerido)
1. Login como admin.
2. Agrega una palabra a la mochila → debe persistir (datos + RLS).
3. Dispara una traducción → responde Claude (invoke-llm + ANTHROPIC_API_KEY).
4. Genera una imagen mnemónica → gpt-image-1 (generate-image + OPENAI + bucket `uploads`).
5. Pega una URL de YouTube con subtítulos → transcripción (youtubeTranscript).

---

## Apéndice — YouTube OAuth (opcional, para el selector de subtítulos)

Solo necesario para `youtubeCaptionsList/Download` (el selector de pistas en VideoTranscript). `youtubeTranscript` ya funciona sin esto.

1. Google Cloud Console → nuevo proyecto → habilita **YouTube Data API v3**.
2. Crea un **OAuth 2.0 Client ID** (Web application). Authorized redirect URI:
   `https://<REF>.supabase.co/functions/v1/youtube-oauth-callback`
3. Agrega a `supabase/functions/.env` y vuelve a correr `secrets set`:
   ```
   YOUTUBE_CLIENT_ID=...
   YOUTUBE_CLIENT_SECRET=...
   YOUTUBE_REDIRECT_URI=https://<REF>.supabase.co/functions/v1/youtube-oauth-callback
   APP_URL=http://localhost:5173
   ```
4. Despliega (el callback SIN verificación de JWT, porque Google lo llama sin token):
   ```powershell
   npx supabase functions deploy youtubeCaptionsList
   npx supabase functions deploy youtubeCaptionsDownload
   npx supabase functions deploy youtube-oauth-start
   npx supabase functions deploy youtube-oauth-status
   npx supabase functions deploy youtube-oauth-callback --no-verify-jwt
   ```
5. Un admin se conecta una vez (vía `youtube-oauth-start` → consentimiento de Google). Los tokens quedan en `youtube_oauth_tokens` y se refrescan solos.

---

## Para producción (cuando salgas del localhost)
- **Frontend** → Vercel/Netlify con las mismas `VITE_` apuntando a Supabase.
- Pon `APP_URL` = tu dominio real (no localhost).
- **Supabase Pro** ($25/mo) para que el proyecto no se pause a los 7 días + backups.
- Vuelve a activar *"Confirm email"* en Auth.

## Problemas comunes
- **"Missing Supabase env vars"** en consola → falta `.env.local` o no reiniciaste `npm run dev`.
- Datos no cargan / 401 → no hiciste sign-out/in tras `make_admin.sql`, o el bucket `uploads` no es público.
- IA tira error → la función no está desplegada o falta su secreto (`npx supabase secrets list`).
- Imagen falla → falta `OPENAI_API_KEY` o el bucket `uploads`.
