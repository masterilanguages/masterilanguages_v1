# Portal Base44 → Next.js Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar la app de estudiante Base44 (Vite/React Router, rama `student-app`) al portal Next.js rediseñado (rama `main`, `app/(student)/portal`), empezando por transcripción de video, usando agentes en paralelo.

**Architecture:** El portal Next.js es la cáscara (sidebar `StudentLayout`). Cada página Base44 se monta como **client component** (`"use client"`) dentro de una ruta del portal. La capa de datos (shim `base44Client` sobre Supabase) y un **shim de compatibilidad de `react-router-dom`** se portan una sola vez en la Fase 0, de modo que los componentes Base44 funcionen casi sin cambios. Auth simple por ahora (Supabase Auth se hace al final).

**Tech Stack:** Next.js 14 App Router, React 18, Supabase (proyecto `obxyaiaghotfglypagbc`), shadcn/ui + Radix, framer-motion, @tanstack/react-query, Tailwind.

**Repos / worktrees:**
- **Origen (SOURCE, solo lectura):** `C:/Users/simpl/Downloads/masteri_v1` en rama `student-app` (la app Base44 Vite). Copiar desde `src/`.
- **Destino (DEST):** `C:/Users/simpl/Downloads/masteri_v1-migrate` en rama `feat/portal-base44-migration` (off `main`). Aquí se construye todo.
- **NO** mergear a `main` ni desplegar hasta revisión humana (main = producción masterilanguages.com).

**Convenciones de migración (aplican a CADA página portada):**
1. Añadir `"use client";` como primera línea.
2. Reemplazar imports de `react-router-dom` por `@/lib/router-compat` (Fase 0).
3. El alias `@/*` apunta a la raíz del repo destino (NO a `src/`). Ej: `@/components/ui/button`, `@/api/base44Client`, `@/lib/language`.
4. No tocar `created_by` ni campos de sistema (los pone el trigger en Supabase).
5. Verificar `npm run build` en verde tras cada slice.

**Nota de testing:** El proyecto no tiene framework de tests. La verificación de cada tarea es: (a) `npm run build` en verde, y (b) la ruta carga y lee datos de Supabase sin error en consola. Donde sea barato, añadir un smoke test de render.

---

## Chunk 0: Estrategia de ejecución paralela

- Fase 0 (cimientos) es **secuencial y bloqueante** — todo depende de ella. La hace UN agente y se commitea a `feat/portal-base44-migration`.
- Tras Fase 0, cada **feature slice** se asigna a un agente en su propio **git worktree** derivado de `feat/portal-base44-migration`. Los slices son independientes porque comparten solo código de la Fase 0 (ya commiteado, solo lectura) y cada uno toca archivos distintos (su página + sus componentes propios).
- Reglas anti-conflicto: ningún slice modifica `package.json`, `tailwind.config`, `app/globals.css`, `components/ui/*`, `api/*`, ni `lib/router-compat` — todo eso lo fija la Fase 0. Si un slice necesita una dep nueva o un componente `ui` faltante, lo reporta para añadirlo a la Fase 0 (no lo hace en su rama).
- Integración: cada slice abre PR contra `feat/portal-base44-migration`; se mergean en orden de término.

---

## Chunk 1: Fase 0 — Cimientos (SECUENCIAL, bloqueante)

### Task 0.1: Dependencias

**Files:** Modify: `package.json`

- [ ] **Step 1: Añadir las deps de la app Base44 a `package.json`**

Copiar el bloque `dependencies` de `SOURCE/package.json` (rama student-app) y fusionarlo con el de DEST, conservando `next`. Deps clave a incluir: `@supabase/supabase-js`, `@tanstack/react-query`, todos los `@radix-ui/react-*`, `framer-motion`, `lucide-react`, `sonner`, `react-hook-form`, `@hookform/resolvers`, `zod`, `date-fns`, `moment`, `clsx`, `tailwind-merge`, `class-variance-authority`, `tailwindcss-animate`, `recharts`, `react-markdown`, `react-quill`, `embla-carousel-react`, `canvas-confetti`, `html2canvas`, `jspdf`, `lodash`, `next-themes`, `vaul`, `cmdk`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `three`, `@hello-pangea/dnd`, `googleapis`, `react-hot-toast`. NO incluir `react-router-dom` (se reemplaza por el shim), NO `vite`/plugins.

- [ ] **Step 2: Instalar**

Run: `cd DEST && npm install`
Expected: instala sin errores de peer deps fatales.

- [ ] **Step 3: Commit**

`git add package.json package-lock.json && git commit -m "chore(portal): add Base44 app dependencies"`

### Task 0.2: Tailwind + estilos + shadcn config

**Files:** Modify: `tailwind.config.ts`/`.js`, `app/globals.css`; Create: `components.json`, `lib/utils.ts` (si no existe)

- [ ] **Step 1:** Fusionar `SOURCE/tailwind.config.js` (theme, colores shadcn, `tailwindcss-animate`) en el config de DEST, manteniendo el `content` de Next (`./app/**/*`, `./components/**/*`).
- [ ] **Step 2:** Fusionar las CSS vars de shadcn (`:root`/`.dark`) de `SOURCE/src/index.css` (o `globals`) en `app/globals.css`.
- [ ] **Step 3:** Copiar `SOURCE/components.json` a DEST y ajustar paths (`@/components`, `@/lib/utils`).
- [ ] **Step 4:** Asegurar `lib/utils.ts` con `cn()` (clsx+tailwind-merge).
- [ ] **Step 5:** `npm run build` verde. Commit: `chore(portal): tailwind + shadcn base config`.

### Task 0.3: Componentes shadcn/ui

**Files:** Create: `components/ui/*` (copia de `SOURCE/src/components/ui/*`)

- [ ] **Step 1:** Copiar TODO `SOURCE/src/components/ui/` → `DEST/components/ui/`.
- [ ] **Step 2:** Añadir `"use client";` a los componentes ui que usan hooks/estado/Radix (la mayoría). Regla simple: si importa de `react` o `@radix-ui`, lleva `"use client"`.
- [ ] **Step 3:** `npm run build` (puede fallar por imports faltantes; resolver). Commit: `feat(portal): port shadcn/ui components`.

### Task 0.4: Capa de datos (shim base44Client) + env

**Files:** Create: `api/supabaseClient.ts`, `api/base44Client.js`, `api/entities.js`, `api/integrations.js`; Modify: `.env.local` (local), env de Vercel (manual, fuera del repo)

- [ ] **Step 1:** Copiar `SOURCE/src/api/*` → `DEST/api/*`.
- [ ] **Step 2:** En `api/supabaseClient.ts`, reemplazar `import.meta.env.VITE_SUPABASE_URL` → `process.env.NEXT_PUBLIC_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` → `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`. Añadir `"use client";` (el shim corre en cliente).
- [ ] **Step 3:** Buscar cualquier otro `import.meta.env` en `api/` y migrarlo a `process.env.NEXT_PUBLIC_*`.
- [ ] **Step 4:** Crear `DEST/.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` del proyecto `obxyaiaghotfglypagbc` (valores los provee el usuario; NO commitear `.env.local`).
- [ ] **Step 5:** Build verde. Commit: `feat(portal): port base44 data shim (Supabase)`.

### Task 0.5: Shim de compatibilidad de react-router

**Files:** Create: `lib/router-compat.tsx`

- [ ] **Step 1: Crear el shim** que reexporta equivalentes Next de las APIs de `react-router-dom` usadas por las páginas:

```tsx
"use client";
import NextLink from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// createPageUrl: en Base44, createPageUrl("Home") => "/Home". Mantener.
export function createPageUrl(name: string) {
  return "/portal/" + name.replace(/^\//, "");
}

export function useNavigate() {
  const router = useRouter();
  return (to: string | number) => {
    if (typeof to === "number") { history.go(to); return; }
    router.push(to.startsWith("/") ? to : createPageUrl(to));
  };
}

export function useLocation() {
  const pathname = usePathname();
  const search = useSearchParams();
  return { pathname, search: search?.toString() ?? "" };
}

export function useParams() { return {}; } // las páginas portal no usan params dinámicos al inicio

export const Link = ({ to, ...rest }: any) => <NextLink href={to} {...rest} />;
```

- [ ] **Step 2:** Ajustar `createPageUrl` para que apunte bajo `/portal/...` (las rutas del portal). Verificar cómo lo usa SOURCE (`grep -rn createPageUrl src`).
- [ ] **Step 3:** Build verde. Commit: `feat(portal): react-router compat shim`.

### Task 0.6: Providers (QueryClient + Auth + Toaster)

**Files:** Create: `components/providers/Providers.tsx`, `lib/AuthContext.tsx`; Modify: `app/layout.tsx` o `app/(student)/layout.tsx`

- [ ] **Step 1:** Copiar `SOURCE/src/lib/AuthContext.jsx` → `DEST/lib/AuthContext.tsx`, `"use client"`, imports a `@/api/...`.
- [ ] **Step 2:** Crear `components/providers/Providers.tsx` (`"use client"`) que envuelve children con `QueryClientProvider` (nuevo `QueryClient`), `AuthProvider`, y `<Toaster/>` de `sonner`.
- [ ] **Step 3:** Envolver el layout del grupo `(student)` con `<Providers>` (NO el root, para no forzar client en todo el sitio admin).
- [ ] **Step 4:** Copiar `SOURCE/src/lib/language.js` → `DEST/lib/language.ts` (lo usan los componentes de transcripción).
- [ ] **Step 5:** Build verde. Commit: `feat(portal): providers (react-query, auth, toaster)`.

**FIN FASE 0 — a partir de aquí, los slices van EN PARALELO.**

---

## Chunk 2: Fase 1 — Slice piloto: Transcripción de video (Learn)

Este slice establece el patrón. Hacerlo PRIMERO y en serie (no en paralelo) para validar.

**Source pages/components:** `src/pages/StoryLearning.jsx`, `src/components/video/{VideoTranscript,ContinuousTranscript,VideoTranscriptWord,PostVideoFlashcards,PostSessionJournal}.jsx`, `src/components/transcript/KaraokeTranscript.jsx`, `src/components/learning/{ClickableWord,EditableWord,EditableSentence,UniversalEditableWord,ClickableTranscriptText}.jsx`, `src/components/practice/YouTubePlayer.jsx`, `src/components/media/AddVideoDialog.jsx`.

**Dest:** `app/(student)/portal/learn/page.tsx` + `components/video/*`, `components/transcript/*`, `components/learning/*`, `components/practice/YouTubePlayer.tsx`, `components/media/AddVideoDialog.tsx`.

- [ ] **Step 1:** Copiar los componentes listados de SOURCE → DEST (manteniendo subcarpetas).
- [ ] **Step 2:** En cada archivo copiado: añadir `"use client";`, cambiar imports de `react-router-dom` → `@/lib/router-compat`, verificar imports `@/...`.
- [ ] **Step 3:** Reemplazar el contenido placeholder de `app/(student)/portal/learn/page.tsx` por un client component que renderice la experiencia de transcripción (montar `VideoTranscript`/`StoryLearning` adaptado). Mantener el `StudentLayout` (lo da el layout del grupo).
- [ ] **Step 4: Verificar build.** Run: `cd DEST && npm run build` → Expected: PASS.
- [ ] **Step 5: Verificar runtime.** Run: `npm run dev`, abrir `/portal/learn`, confirmar que carga un video y su transcripción desde Supabase (entidad `Video`) sin errores en consola.
- [ ] **Step 6: Commit** `feat(portal): video transcription slice (Learn)`.
- [ ] **Step 7: Documentar el patrón** en `docs/superpowers/plans/SLICE-TEMPLATE.md` (los agentes paralelos lo siguen).

---

## Chunk 3: Fase 2 — Feature slices (PARALELO)

Cada slice = una tarea para un agente en su propio worktree, siguiendo el patrón del Chunk 2 (copiar páginas+componentes, `"use client"`, router-compat, crear ruta `app/(student)/portal/<seccion>/page.tsx`, build verde, commit, PR).

**Inventario de slices (agrupando las 38 páginas Base44 por sección del portal):**

- [ ] **Slice A — Dashboard/Home:** `Home.jsx`, `MyProgram.jsx`, `FluentPath.jsx`, `Level1World.jsx` → `/portal/dashboard`.
- [ ] **Slice B — Backpack (vocab/mnemonics):** `Backpack.jsx`, `WordBank.jsx`, `WordsIKnow.jsx`, `Flashcards.jsx`, componentes `backpack/*`, `practice/WordCard.jsx` → `/portal/library` o `/portal/backpack`.
- [ ] **Slice C — Lecciones:** `BodyPartsLesson`, `ColorsLesson`, `ColorsTest`, `DaysLesson`, `Days`, `MonthsLesson`, `Pictures`, `PicturesLesson2`, `Sentences` → `/portal/learn/...` (sub-rutas).
- [ ] **Slice D — Songs/Singing:** `Songs`, `SongListenPage`, `SingingHome`, `SingingLesson`, `DailySong`, componentes `songs/*`, `singing/*` → `/portal/learn/songs`.
- [ ] **Slice E — Practice/Speaking:** `SpeakingSession`, `SpeakAudio`, `DictationExercise`, `SessionFlow`, componentes `practice/*` → `/portal/practice`.
- [ ] **Slice F — Journal:** `Journal.jsx`, `Session1Journal.jsx`, componentes `journal/*` → `/portal/journal` (añadir al nav si falta).
- [ ] **Slice G — Library/Media:** `Library.jsx`, `MediaLibrary.jsx`, `BabyVideos.jsx`, componentes `media/*`, `video/*` extra → `/portal/library`.
- [ ] **Slice H — Progress/Store:** `Progress.jsx`, `Store.jsx` (coins), componentes `progress/*` → `/portal/progress`.
- [ ] **Slice I — Onboarding:** `LanguageSelect.jsx`, `AvatarSelect.jsx` → flujo de primer ingreso (gated).
- [ ] **Slice J — Admin/coaches (opcional, baja prioridad):** `ManageCoaches.jsx` → fuera del portal de estudiante.

Cada slice replica los pasos del Chunk 2 y abre PR contra `feat/portal-base44-migration`.

---

## Chunk 4: Fase 3 — Auth Supabase + integración final (tras paridad de features)

- [ ] Reemplazar el login simple del portal por Supabase Auth (portar `Login.jsx` → `app/login` o `/portal/login`, usar `AuthContext`).
- [ ] Configurar redirect URLs en Supabase (Site URL, redirects) para el dominio de producción.
- [ ] Gating de rutas del portal: sin sesión → login (middleware o guard en `(student)/layout`).
- [ ] QA end-to-end con un usuario real del proyecto `obxyaiaghotfglypagbc`.
- [ ] Revisión humana → merge `feat/portal-base44-migration` → `main` → deploy.

---

## Verificación global (Definition of Done)

- `npm run build` en verde en `feat/portal-base44-migration`.
- Cada sección del portal renderiza la feature Base44 correspondiente y lee/escribe datos en Supabase `obxyaiaghotfglypagbc`.
- Sin regresiones en el sitio admin/marketing de `main`.
- `main` intacto hasta la revisión humana final.
