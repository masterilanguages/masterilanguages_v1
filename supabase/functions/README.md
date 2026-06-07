# Edge Functions (Stage G)

These replace Base44's managed integrations. The frontend shim (`src/api/base44Client.js`)
calls each one by name; each returns the same shape the app already expects.

| Function | Replaces | Auth | Notes |
|---|---|---|---|
| `invoke-llm` | `InvokeLLM` | user | Claude. `response_json_schema` → returns the parsed object (forced tool call); else `{ response }`. `add_context_from_internet` → web search pre-pass. |
| `generate-image` | `GenerateImage` | user | OpenAI `gpt-image-1` → Storage → `{ url }`. |
| `send-email` | `SendEmail` | user | Resend. |
| `invite-user` | `users.inviteUser` | admin | Supabase admin invite + sets `app_metadata.user_role`. |
| `list-users` | `entities.User.list` | admin | Returns `[{ id, email, role, full_name }]`. |
| `delete-user` | `entities.User.delete` | admin | Supabase admin delete. |
| `log-user-in-app` | `appLogs.logUserInApp` | any | No-op analytics stub. |

> `SendSMS` and `ExtractDataFromUploadedFile` are exported by the shim but never
> called by the app, so no function is provided. Add one only if you start using them.

## Deploy

```bash
# 1) Link the project (once)
supabase link --project-ref <your-project-ref>

# 2) Set secrets (copy .env.example -> .env and fill it in first)
supabase secrets set --env-file supabase/functions/.env

# 3) Run the YouTube token migration (once), in the Supabase SQL editor:
#    supabase/migrations/0002_youtube_oauth_tokens.sql

# 4) Deploy all functions
supabase functions deploy invoke-llm
supabase functions deploy generate-image
supabase functions deploy send-email
supabase functions deploy invite-user
supabase functions deploy list-users
supabase functions deploy delete-user
supabase functions deploy log-user-in-app
# Stage H (YouTube):
supabase functions deploy youtubeTranscript
supabase functions deploy youtubeCaptionsList
supabase functions deploy youtubeCaptionsDownload
supabase functions deploy addWordsToStudentBackpack
supabase functions deploy youtube-oauth-start
supabase functions deploy youtube-oauth-status
# The OAuth callback is hit by Google's browser redirect (no JWT) -> disable JWT:
supabase functions deploy youtube-oauth-callback --no-verify-jwt
```

## Security

- Supabase verifies a valid project JWT on every call. Because the public anon
  key is itself a valid JWT, the paid functions (`invoke-llm`, `generate-image`,
  `send-email`) additionally require a **real signed-in user** (`requireUser`),
  and the user-management functions require an **admin** (`requireAdmin`). This
  stops anyone holding the public anon key from burning your API credits.
- All provider keys (Anthropic, OpenAI, Resend) live only in Edge Function
  secrets and never reach the browser.

## Stage H (YouTube) — included

| Function | Replaces | Auth | Notes |
|---|---|---|---|
| `youtubeTranscript` | same | user | Scrapes the public watch page for captions; Whisper fallback (OPENAI_API_KEY). Returns `{ data: {...} }`. Needs **no** OAuth — the main transcript path. |
| `youtubeCaptionsList` | same | user | YouTube Data API v3. Returns top-level `{ video_id, tracks }`. Needs OAuth. |
| `youtubeCaptionsDownload` | same | user | Data API caption download → VTT → text. Top-level `{ transcript_text, format }`. Needs OAuth. |
| `addWordsToStudentBackpack` | same | user | Service-role insert into `word` (sets `created_by` = student email explicitly). Returns `{ data: { added } }`. |
| `youtube-oauth-start` | same | admin | Returns `{ url }` (Google consent URL) for the admin UI to redirect to. |
| `youtube-oauth-callback` | same | **none** | Google redirects here (no JWT) → **deploy with `--no-verify-jwt`**. Exchanges the code, stores tokens. |
| `youtube-oauth-status` | same | admin | `{ connected, expiry_date, updated_at }`. |

**Google OAuth setup (one-time):** in Google Cloud Console — create a project, enable **YouTube Data API v3**, create an **OAuth 2.0 Client ID** (Web application), add the deployed `youtube-oauth-callback` URL as an **authorized redirect URI**, and put the client id/secret + that redirect URI into the function secrets (`YOUTUBE_CLIENT_ID/SECRET/REDIRECT_URI`). An admin then connects once via `youtube-oauth-start`; tokens are stored in `youtube_oauth_tokens` and auto-refreshed.

> `youtubeTranscript` works without any of the OAuth setup — the OAuth/captions path only powers the VideoTranscript caption-track picker.
