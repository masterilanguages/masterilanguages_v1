# Student app (Vite) — deployment

This branch (`student-app`) is the **student learning app** (mnemonics, lessons, Supabase login).

| | |
|---|---|
| **Vercel project** | `masteri-student` |
| **Production URL** | https://masteri-student.vercel.app |
| **Login** | https://masteri-student.vercel.app/login |
| **Admin / marketing site** | `language-masteri` → https://www.masterilanguages.com |

## Deploy

Pushes to `student-app` auto-deploy via Vercel (Git connected). Builds on `main` are **skipped** via `ignoreCommand` in `vercel.json`.

Manual deploy:

```bash
git checkout student-app
vercel deploy --prod
```

## Env vars (Vercel)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
