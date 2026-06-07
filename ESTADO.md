# Estado del proyecto — Language Masteri (migración fuera de Base44)

_Resumen detallado · 2026-06-04_

---

## 0. Contexto

**Language Masteri** es una app web de aprendizaje de idiomas gamificada (originalmente
hebreo; ahora hebreo/español/inglés/francés/portugués/italiano) construida en **Base44**.
El objetivo es **reconstruirla para correr independiente de Base44**.

**Qué descubrimos al analizarla (10 agentes en paralelo):**
- 34 entidades de datos, 16 funciones backend, 37 páginas. App React/Vite/Tailwind/shadcn.
- **Propiedad:** el código es tuyo (ToS de Base44), pero la base de datos, el auth y las
  integraciones (IA/imágenes/email) **se quedan en Base44**.
- **Hallazgo clave:** el repo de GitHub tiene el **código y los esquemas, pero CERO datos**.
- **Acoplamiento:** todo el frontend pasa por un solo objeto `base44` → se puede reemplazar
  con un "shim" sin tocar los ~390 puntos de llamada.

**Decisiones tomadas:**
- Stack destino: **Supabase** (Postgres + Auth + Storage + Edge Functions).
- **Empezar limpio** (sin migrar datos; el contenido se re-siembra).
- **3 reglas de oro** preservadas para no tocar el frontend: `created_by` = email,
  campos `created_date`/`updated_date`, y el rol en `app_metadata.user_role`.
- IA por default **Claude Haiku 4.5**; imágenes **OpenAI gpt-image-1** (calidad por defecto).

---

## 1. ✅ Código reconstruido — detalle por stage

### Stage B — Base de datos (`supabase/schema.sql` + `migrations/0002_…sql`)
- Las **34 tablas** (`user_profile`, `word`, `day`, `story`, `song`, `singing_*`,
  `*_progress`, `coach_*`, etc.), una por entidad de Base44.
- Las **4 columnas de sistema** en cada tabla: `id` (text), `created_date`, `updated_date`,
  `created_by` (email) — idénticas a Base44 para no romper nada.
- Trigger `set_system_fields()` que las rellena solas; helpers `app_email()` / `app_role()`.
- **Enums** (`app_language`, `difficulty`) + `CHECK` para los locales.
- **RLS (seguridad por fila):** dueño (`created_by = tu email`), override admin, y lectura
  de coach a sus alumnos (vía `coach_assignment`). Más índices únicos (una fila por usuario).
- Migración `0002`: tabla `youtube_oauth_tokens` (tokens de Google, NO en `/tmp`).

### Stage F — Shim de compatibilidad + Auth + Login
- `src/api/supabaseClient.js` — cliente Supabase configurado por env.
- `src/api/base44Client.js` — **el shim**: imita el SDK de Base44 sobre `supabase-js`
  (`entities` con 5 verbos sobre las 34 tablas, `auth`, `integrations.Core.*`,
  `functions.invoke`, `users.inviteUser`, `appLogs`). Los ~390 call sites quedan intactos.
- `src/api/entities.js` / `integrations.js` — re-exportan del shim.
- `src/lib/AuthContext.jsx` — reescrito para usar la **sesión de Supabase** (ya no Base44).
- `src/pages/Login.jsx` — **pantalla de login nueva** (la de Base44 era hospedada, no estaba
  en el código): email/contraseña + "Continue with Google" + forgot/sign-up.
- `src/App.jsx` — gating: sin sesión → Login (deja públicas landing/funnel).
- `vite.config.js` (sin el plugin de Base44) + `package.json` (fuera `@base44/*`, dentro
  `@supabase/supabase-js`). **Build verificado en verde.**

### Stage G — Edge Functions: IA / imagen / email / usuarios (7 funciones)
- `invoke-llm` → **Claude**. Structured output robusto vía forced tool-call; default
  `claude-haiku-4-5` (configurable por `LLM_MODEL`); opción de búsqueda web.
- `generate-image` → **OpenAI gpt-image-1** → sube a Storage → devuelve `{ url }`.
- `send-email` → **Resend**.
- `invite-user` / `list-users` / `delete-user` → gestión de usuarios (solo admin).
- `log-user-in-app` → analítica (stub).
- Compartido: `_shared/cors.ts`, `_shared/auth.ts` (`requireUser` bloquea abuso con la
  anon key pública; `requireAdmin` para gestión de usuarios). Claves solo en el servidor.

### Stage H — Edge Functions: YouTube (7 funciones + helper)
- `youtubeTranscript` → scrape de subtítulos + **fallback Whisper**; sin OAuth; `{ data:{…} }`.
- `youtubeCaptionsList` / `youtubeCaptionsDownload` → YouTube Data API (con OAuth); top-level.
- `addWordsToStudentBackpack` → inserta palabras con service-role, **seteando `created_by`
  del alumno explícitamente** (el trigger no puede bajo service-role).
- `youtube-oauth-start/callback/status` → flujo OAuth; tokens en `youtube_oauth_tokens`.
- Compartido: `_shared/youtube-auth.ts` (guardar/refrescar tokens).
- **Verificación adversaria:** shapes de retorno coinciden campo-por-campo con los call sites;
  cero `/tmp`; `created_by` explícito. OK.

**Total:** 14 Edge Functions + 3 helpers compartidos. Frontend sin dependencia de Base44.

---

## 2. ✅ Setup en vivo (hecho hoy) — "Parte 1: datos + login"

1. Proyecto Supabase nuevo → `hxscygbakwhpqxsdxrwa` (cuenta de **prueba**; se migra al
   correo oficial después sin problema — invitando ese correo como Owner o recreando; **sin lock-in**).
2. SQL Editor: corridos `schema.sql` + `migrations/0002_youtube_oauth_tokens.sql`.
3. Auth → proveedor **Email habilitado**.
4. `.env.local` creado (Project URL + anon key).
5. `npm run dev` corriendo → **Login funcionando** (verificado HTTP 200).
6. Registrado admin: `admin@avinu.com`.

**Resultado: login + datos + RLS funcionan.** Falta encender la IA (Parte 2).

---

## 3. ⏳ Próximos pasos (detallado)

### 3.1 Cerrar Parte 1 (2 cosas)
- **Bucket `uploads`:** Storage → New bucket → nombre `uploads` → **Public** → crear.
  (Lo usan la subida de archivos y el guardado de imágenes generadas.)
- **Rol admin:** en SQL Editor correr —
  `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"user_role":"admin"}'::jsonb where email = 'admin@avinu.com';`
  — y luego **cerrar/abrir sesión** (el rol se hornea en el token al entrar).

### 3.2 Parte 2 — Encender la IA (deploy de funciones)
> ⚠️ Esta fase **no es solo "desplegar"**: parte del trabajo es **evaluar qué tecnologías nos
> sirven mejor** (fiabilidad / calidad / costo), sobre todo en **transcripciones/YouTube** (ver
> §4). Lo de abajo es el arranque con lo ya construido; las piezas que convenga las cambiamos
> después con pruebas reales.

1. **API keys:** Anthropic (Claude), OpenAI (imágenes/Whisper), Resend (email).
   - Gratis de crear; Anthropic/OpenAI necesitan saldo cargado para usarse.
2. **CLI:**
   - `npx supabase login` (interactivo, abre navegador)
   - `npx supabase link --project-ref hxscygbakwhpqxsdxrwa`
3. **Secretos:** copiar `supabase/functions/.env.example` → `.env`, llenar las keys, y
   `npx supabase secrets set --env-file supabase/functions/.env`
4. **Deploy:**
   `npx supabase functions deploy invoke-llm generate-image send-email invite-user list-users delete-user log-user-in-app youtubeTranscript addWordsToStudentBackpack`
5. **Smoke test:** login → agregar palabra → traducir (Claude) → imagen (gpt-image-1) →
   pegar URL de YouTube (transcript).

### 3.3 (Opcional) YouTube captions OAuth
Solo para el selector de pistas de subtítulos. Google Cloud → habilitar YouTube Data API v3
+ OAuth client → setear `YOUTUBE_*` + `APP_URL` → desplegar captions/oauth (el callback con
`--no-verify-jwt`). `youtubeTranscript` ya funciona sin esto.

### 3.4 Stage I — Re-sembrar contenido
Como empezamos limpio, hay que repoblar el catálogo. Tres caminos (combinables):
- **UI admin** (la app ya tiene herramientas para armar días/sesiones/media).
- **Scripts de seed** (insertar lotes de días/palabras directo en Postgres).
- **Dejar que la IA lo genere** (mnemónicos/imágenes/frases ya se autogeneran).
Entidades a sembrar primero: `day` (currículo), `word` (set inicial), `song`, `story`,
`media_library`. Meta mínima: que el **Día 1** sea jugable.

### 3.5 Producción (Stage J)
- **Mover el proyecto al correo/cuenta oficial** (hoy está en una cuenta de prueba): invitar
  el correo oficial como Owner de la organización, o recrear el proyecto. Sin lock-in.
- Frontend → **Vercel/Netlify** con las `VITE_` apuntando a Supabase; `APP_URL` = dominio real.
- **Supabase Pro** para que el proyecto no se pause + backups.
- Reactivar "Confirm email" en Auth. Configurar dominio.

### 3.6 Pruebas de paridad (Stage K) + Lanzar (Stage L)
- Probar los flujos clave: backpack + IA, canto (grabar/reproducir), historia de 6 pasos,
  diario + firma, asignación de coach, agenda diaria, gating de admin, aislamiento RLS.
- Apuntar DNS → dar de baja Base44 cuando estés cómodo.

---

## 4. Tecnologías a evaluar (decisiones técnicas abiertas)

Lo construido hoy es un **porteo fiel** de lo que hacía Base44 — funciona, pero varias piezas
quedan **abiertas a evaluar** según lo que nos sirva mejor. No están "cerradas": cambiar de
proveedor vive dentro de **una sola Edge Function**, así que es barato iterar.

- **Transcripciones / YouTube (lo más abierto):** el método actual de `youtubeTranscript`
  (scrapear la página de YouTube + Whisper de respaldo) es el más **frágil** — YouTube cambia
  su markup y protege los streams de audio, así que puede romperse. A evaluar alternativas:
  la **API oficial de captions** (YouTube Data API v3), **servicios dedicados de speech-to-text**
  (gpt-4o-transcribe, Deepgram, AssemblyAI…), o librerías/servicios de transcripción de
  terceros. Decidiremos con **pruebas reales** cuál es más confiable y barato.
- **Modelo de IA:** Haiku por default (barato/rápido). A evaluar con un mini-test: rutear
  **Sonnet 4.6** en las 4 funciones sensibles (conversación, diario, conjugaciones,
  transliteración hebrea), donde la precisión importa más.
- **Imágenes:** hoy en gpt-image-1 (tu decisión de no bajar calidad). Revisable más adelante
  por costo/calidad (Gemini, FLUX, etc.) si conviene.
- **Email, auth, storage:** Resend / Supabase Auth / Supabase Storage son sólidos por ahora;
  sin urgencia de cambiar.

## 5. Archivos de referencia
- `supabase/RUNBOOK.md` — guía paso a paso de 0 a corriendo.
- `supabase/SETUP.md` — orden de aplicación + notas.
- `supabase/functions/README.md` — tabla de funciones + deploy + setup de Google OAuth.
- `supabase/schema.sql`, `supabase/make_admin.sql`, `supabase/migrations/0002_…sql`.
