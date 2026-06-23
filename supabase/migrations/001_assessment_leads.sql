create table public.assessment_leads (
  id                 uuid primary key default gen_random_uuid(),
  name               text,
  email              text,
  phone              text,
  language           text,
  level              text,
  goal               text,
  timeline           text,
  commitment         text,
  challenge          text,
  recommended_program text,
  created_at         timestamptz not null default now()
);
