# SLICE TEMPLATE — Portal Base44 → Next.js

> Patrón validado por el **slice piloto (Fase 1: Learn / transcripción de video)**.
> Cada agente de **Fase 2** sigue ESTE documento al pie de la letra, en su propio worktree.
> Referencia viva: `app/(student)/portal/learn/page.tsx` + `components/{video,transcript,learning,practice,media}/`.

---

## 0. Reglas de oro (no negociables)

- **NO mergear a `main` ni desplegar.** `main` = producción `masterilanguages.com`. Todo vive en `feat/portal-base44-migration` y sus worktrees. El `/portal/dashboard` en vivo NO se toca hasta revisión humana final.
- **Un slice = una sección del portal = una ruta `app/(student)/portal/<seccion>/page.tsx` + sus componentes propios.**
- **No tocar código compartido (lo fija Fase 0, es solo lectura):** `package.json`, `package-lock.json`, `tailwind.config.js`, `app/globals.css`, `components/ui/*`, `api/*`, `lib/router-compat.tsx`, `components/providers/*`, `lib/AuthContext.tsx`, `lib/language.ts`. Si tu slice necesita una dep nueva o un componente `ui` faltante → **repórtalo para añadirlo a Fase 0**, no lo metas en tu rama.
- Cada slice toca **solo** su `page.tsx` + sus subcarpetas de componentes → por eso corren en paralelo sin conflicto.

---

## 1. De dónde copiar (SOURCE, solo lectura)

- Repo: `C:/Users/simpl/Downloads/masteri_v1`, rama **`student-app`** (app Base44 Vite).
- Copiar desde `src/pages/*.jsx` (la página) y `src/components/<area>/*.jsx` (sus componentes).
- El alias `@/*` en DEST apunta a la **raíz del repo destino**, NO a `src/`. Ej: `@/components/ui/button`, `@/api/base44Client`, `@/lib/language`.

## 2. Destino (DEST)

- Repo: `C:/Users/simpl/Downloads/masteri_v1-migrate`, worktree off `feat/portal-base44-migration`.
- Ruta de la página: `app/(student)/portal/<seccion>/page.tsx`.
- Componentes: `components/<area>/*` (mantener subcarpetas del source: `video/`, `journal/`, `songs/`, etc.).
- **El layout ya está dado:** `app/(student)/layout.tsx` envuelve todo con `<Providers>` (QueryClient + AuthProvider + `<Toaster/>` sonner) y `<StudentLayout>` (sidebar). **El slice NO re-declara providers ni sidebar** — solo exporta el contenido de la página.

---

## 3. Convenciones por archivo portado (aplican a CADA `.jsx` copiado)

1. Primera línea: `"use client";`
2. Reemplazar imports de `react-router-dom` → `@/lib/router-compat` (`useNavigate`, `useLocation`, `Link`, `createPageUrl`, `useParams`).
3. Verificar que todos los imports `@/...` resuelvan a la raíz del repo destino.
4. **No** tocar `created_by` ni campos de sistema (los pone el trigger de Supabase).
5. Acceso a entidades vía el shim. El shim es JS dinámico, así que TS no ve las keys → castear:
   ```ts
   import { base44 as base44Client } from "@/api/base44Client";
   const base44: any = base44Client; // runtime garantizado por el shim
   // uso: base44.entities.Video.list("-created_date"), base44.entities.X.create(data),
   //      base44.integrations.Core.UploadFile({ file })
   ```

## 4. Patrón de datos (react-query sobre el shim)

```ts
const { data = [], isLoading, isError } = useQuery({
  queryKey: ["<seccion>"],
  queryFn: async () => {
    const all = await base44.entities.<Entidad>.list("-created_date");
    return (all || []).filter((x: any) => !x.deleted_at && x.is_active !== false);
  },
  staleTime: 60 * 1000,
  refetchOnWindowFocus: false,
});

const createMut = useMutation({
  mutationFn: (d: any) => base44.entities.<Entidad>.create(d),
  onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["<seccion>"] }); toast.success("..."); },
  onError: (e: any) => toast.error(e?.message || "Error"),
});
```

- **Manejar SIEMPRE los 4 estados:** `isLoading`, `isError`, vacío (`data.length === 0`, las tablas arrancan vacías) y con datos. (Ver el render del piloto como referencia.)
- Notificaciones: `toast` de `sonner`.
- Iconos: `lucide-react`. UI: `components/ui/*` (shadcn) + clases Tailwind del tema dark (`slate-*`, acento `teal-*`).

## 5. Reproductor de YouTube (si el slice usa video)

El **padre** renderiza el `<iframe ...?enablejsapi=1>` con un `id` estable; el componente de transcripción lo maneja por `postMessage` (`seekTo`/`pauseVideo`/`playVideo`). No metas el iframe dentro del componente hijo. (Ver `learn/page.tsx` líneas ~262–308.)

---

## 6. Verificación (Definition of Done del slice)

1. `cd DEST && npm run build` → **verde**.
2. `npm run dev` (puerto **3102**) → abrir `http://localhost:3102/portal/<seccion>` → **HTTP 200**, el UI real renderiza, **sin errores en consola del server ni del navegador**, y lee/escribe en Supabase `obxyaiaghotfglypagbc`.
3. Sin regresión en el sitio admin (`/`, `/login`, `/companies/...` siguen compilando).

## 7. Commit & PR

- Commit: `feat(portal): <seccion> slice`.
- PR contra `feat/portal-base44-migration` (se mergean en orden de término).
- **Nunca** contra `main`.

---

## Inventario de slices Fase 2 (cada uno = un agente/worktree)

| Slice | Páginas source | Ruta destino |
|---|---|---|
| A — Dashboard/Home | `Home`, `MyProgram`, `FluentPath`, `Level1World` | `/portal/dashboard` |
| B — Backpack (vocab/mnemonics) | `Backpack`, `WordBank`, `WordsIKnow`, `Flashcards`, `backpack/*`, `practice/WordCard` | `/portal/library` o `/portal/backpack` |
| C — Lecciones | `BodyPartsLesson`, `ColorsLesson`, `ColorsTest`, `DaysLesson`, `Days`, `MonthsLesson`, `Pictures`, `PicturesLesson2`, `Sentences` | `/portal/learn/...` |
| D — Songs/Singing | `Songs`, `SongListenPage`, `SingingHome`, `SingingLesson`, `DailySong`, `songs/*`, `singing/*` | `/portal/learn/songs` |
| E — Practice/Speaking | `SpeakingSession`, `SpeakAudio`, `DictationExercise`, `SessionFlow`, `practice/*` | `/portal/practice` |
| F — Journal | `Journal`, `Session1Journal`, `journal/*` | `/portal/journal` |
| G — Library/Media | `Library`, `MediaLibrary`, `BabyVideos`, `media/*`, `video/*` extra | `/portal/library` |
| H — Progress/Store | `Progress`, `Store`, `progress/*` | `/portal/progress` |
| I — Onboarding | `LanguageSelect`, `AvatarSelect` | flujo primer ingreso (gated) |
| J — Admin/coaches (opcional) | `ManageCoaches` | fuera del portal de estudiante |

> Fase 3 (después de paridad de features): reemplazar el login simple por Supabase Auth real + gating de rutas + QA end-to-end. NO antes.
