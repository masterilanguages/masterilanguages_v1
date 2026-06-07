-- Persistent storage for the single shared Google/YouTube OAuth connection.
-- Edge function /tmp is ephemeral, so tokens MUST live in Postgres. One singleton
-- row holds the connection for the whole app. Only service-role (which bypasses
-- RLS) ever reads/writes this table.
create table if not exists youtube_oauth_tokens (
  id text primary key default 'singleton',
  access_token text,
  refresh_token text,
  expiry_date bigint,
  scope text,
  token_type text,
  updated_at timestamptz not null default now()
);

alter table youtube_oauth_tokens enable row level security;
-- No policies on purpose: only the service-role key (which bypasses RLS) touches this table.
