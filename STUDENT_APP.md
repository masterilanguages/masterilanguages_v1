# Student app (Vite) — deployment

This branch (`student-app`) is the **student learning app** (mnemonics, lessons, Supabase login).

| | |
|---|---|
| **Vercel project** | `masteri-student` |
| **Production URL** | https://masteri-student.vercel.app |
| **Login** | https://masteri-student.vercel.app/login |
| **Admin / marketing site** | `language-masteri` → https://www.masterilanguages.com |

## Student login flow

1. Sign in or sign up at `/login`
2. Pick a language (first time only)
3. Land on **Home** with nav: Home, Schedule, Backpack, Library, Journal

## Supabase Auth (required for login)

In [Supabase Dashboard](https://supabase.com/dashboard) → Authentication → URL Configuration:

- **Site URL:** `https://masteri-student.vercel.app`
- **Redirect URLs:** add `https://masteri-student.vercel.app/**` and `http://localhost:5173/**`

For local dev, turn off **Confirm email** under Email provider if you want instant sign-up testing.


Pushes to `student-app` auto-deploy via Vercel (Git connected). Builds on `main` are **skipped** via `ignoreCommand` in `vercel.json`.

Manual deploy:

```bash
git checkout student-app
vercel deploy --prod
```

## Env vars (Vercel)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
