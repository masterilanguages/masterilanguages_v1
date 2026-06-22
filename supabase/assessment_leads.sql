-- Run this in your Supabase SQL editor to create the assessment leads table

create table if not exists assessment_leads (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  language text,
  level text,
  goal text,
  timeline text,
  commitment text,
  challenge text,
  recommended_program text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table assessment_leads enable row level security;

-- Allow service role full access (used by the API route)
create policy "Service role full access"
  on assessment_leads
  for all
  using (true);
