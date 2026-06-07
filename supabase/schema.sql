-- =====================================================================
-- 00 PREAMBLE  (run first; shared helpers, enums, system-field trigger)
-- =====================================================================
create extension if not exists pgcrypto;

-- JWT helpers (email is a standard Supabase claim; app role lives in app_metadata.user_role)
create or replace function app_email() returns text language sql stable as $$
  select auth.jwt()->>'email';
$$;
create or replace function app_role() returns text language sql stable as $$
  select coalesce(auth.jwt()->'app_metadata'->>'user_role', 'user');
$$;

-- Stamp Base44-style system fields on every write.
create or replace function set_system_fields() returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    if (new.id is null or new.id = '') then
      new.id := replace(gen_random_uuid()::text, '-', '');
    end if;
    new.created_date := coalesce(new.created_date, now());
    new.created_by   := coalesce(new.created_by, app_email());
  end if;
  new.updated_date := now();
  return new;
end;
$$;

-- Shared enums reused across tables.
do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_language') then
    create type app_language as enum ('hebrew','english','spanish','french','portuguese','italian');
  end if;
  if not exists (select 1 from pg_type where typname = 'difficulty') then
    create type difficulty as enum ('beginner','intermediate','advanced');
  end if;
end $$;

-- =====================================================================
-- 01 TABLES
-- =====================================================================
-- UserProfile
create table user_profile (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  is_new_user              boolean default true,
  onboarding_completed_at  timestamptz,
  language                 app_language,
  current_day              integer default 1,
  vocab_levels_visible     boolean default false,
  avatar_id                text,
  avatar_type              text,
  avatar_name              text,
  avatar_description       text,
  avatar_image_url         text,
  avatar_status            text default 'ready' check (avatar_status in ('resolving','ready','failed')),
  growth_stage             text default 'starter' check (growth_stage in ('starter','growing','rising','pro')),
  emotion_state            text default 'neutral' check (emotion_state in ('neutral','happy','proud','tired','motivated')),
  age_level                integer default 3,
  xp                       integer default 0,
  daily_streak             integer default 0,
  last_active_date         text,
  badges                   text[] default '{}',
  interests                text[] default '{}',
  difficulty_level         difficulty default 'beginner',
  total_words_learned      integer default 0,
  friends                  text[] default '{}',
  scholarships             integer default 0,
  toddler_needs_completed  integer default 0,
  session_start            timestamptz,
  session_duration         integer,
  session_paused           boolean default false,
  session_paused_at        timestamptz,
  session_paused_total     integer default 0,
  onboarding_goals         text[] default '{}',
  onboarding_content_types text[] default '{}',
  onboarding_daily_minutes integer,
  native_language          text,
  onboarding_completed     boolean default false,
  agreement_notes          text
);

-- Word
create table word (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  word                 text not null,
  translation          text not null,
  phonetic             text,
  audio_url            text,
  image_url            text,
  mnemonic_explanation text,
  youtube_url          text,
  exercises            jsonb default '[]'::jsonb,
  category             text not null check (category in ('basics','numbers','colors','food','animals','travel','nature','business','emotions','actions','wordbank','words_i_know','pictures','sentences')),
  difficulty           difficulty default 'beginner',
  example_sentence     text,
  saved_sentences      jsonb default '[]'::jsonb,
  times_practiced      integer default 0,
  mastered             boolean default false,
  vocab_level          smallint default 0 check (vocab_level between 0 and 5),
  language             app_language default 'hebrew',
  day_introduced       integer,
  is_top_500           boolean default false,
  is_starred           boolean default false,
  is_verb              boolean default false,
  approved             boolean default false,
  approved_by          text,
  approved_at          timestamptz,
  assigned_by_coach    text,
  coach_folder         text,
  verb_conjugations    jsonb default '{}'::jsonb
);

-- UserCoins
create table user_coins (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  coins          integer default 0,
  unlocked_items text[] default '{}',
  equipped_item  text
);

-- Achievement
create table achievement (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  badge_id     text,
  earned_date  text,
  shared       boolean default false
);

-- JournalEntry
create table journal_entry (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  date                 text not null,
  text                 text not null,
  used_vocab_ids       text[] default '{}',
  suggested_vocab_ids  text[] default '{}',
  ai_questions_asked   text[] default '{}',
  last_edited_at       timestamptz,
  is_public            boolean default false,
  author_name          text,
  signature_data       text,
  consecutive_days     integer default 1
);

-- TextEdit
create table text_edit (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  context     text not null,
  context_id  text,
  field       text not null,
  index       integer,
  original    text not null,
  edited      text not null
);

-- FluentLead
create table fluent_lead (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  tag              text default 'Language Fluency Lead',
  language         text,
  motivation       text,
  why_important    text,
  current_level    text,
  goal_level       text,
  frustration      text,
  tried_before     text,
  why_didnt_work   text,
  learning_duration text,
  fluency_impact   text,
  why_now          text,
  ready_to_commit  text,
  daily_time       text,
  ready_to_move    text,
  first_name       text,
  phone            text,
  email            text
);

-- Unique indexes (natural one-row-per-user)
create unique index user_profile_uq on user_profile(created_by);
create unique index user_coins_uq on user_coins(created_by);

-- Day
create table day (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  day_number   integer not null,
  language     app_language not null default 'hebrew',
  title        text,
  description  text,
  subsections  jsonb default '[]'::jsonb,
  "order"      integer default 0
);

-- DayProgress
create table day_progress (
  id                    text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date          timestamptz not null default now(),
  updated_date          timestamptz not null default now(),
  created_by            text not null,
  day_id                text not null,            -- ref: day(id)
  day_number            integer not null,
  completed             boolean default false,
  subsections_completed text[] default '{}',
  started_at            timestamptz,
  completed_at          timestamptz
);

-- TodoItem
create table todo_item (
  id              text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date    timestamptz not null default now(),
  updated_date    timestamptz not null default now(),
  created_by      text not null,
  label           text not null,
  type            text default 'custom' check (type in ('video','custom','lesson')),
  target_video_id text,                           -- ref: video(id)
  parent_id       text,                           -- ref: todo_item(id)
  "order"         integer default 0,
  is_active       boolean default true
);

-- TodoProgress
create table todo_progress (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  todo_item_id text not null,                     -- ref: todo_item(id)
  completed    boolean default false,
  completed_at timestamptz
);

-- LessonProgress
create table lesson_progress (
  id             text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date   timestamptz not null default now(),
  updated_date   timestamptz not null default now(),
  created_by     text not null,
  lesson_name    text not null,
  completed      boolean default false,
  test_score     integer,
  test_completed boolean default false
);

-- ActivityProgress
create table activity_progress (
  id            text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text not null,
  activity_id   text not null,
  completions   integer default 0,
  unlocked      boolean default false,
  date_selected text
);

-- StudySession
create table study_session (
  id               text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text not null,
  date             text not null,
  duration_minutes integer not null,
  stopped_reason   text check (stopped_reason in ('inactivity','manual')),
  completed        boolean default false
);

-- Story
create table story (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  story_id     text not null,
  title        text,
  video_url    text not null,
  story_text_he text not null,
  story_text_transliteration text,
  story_vocab_core jsonb not null default '[]'::jsonb,
  difficulty_level difficulty default 'beginner',
  next_story_id text,                         -- ref: story(story_id)
  "order"      integer default 0
);

-- StorySong
create table story_song (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  story_id     text not null,                 -- ref: story(story_id)
  lyrics_he    text not null,
  lyrics_transliteration text,
  audio_url    text,
  duration_seconds integer
);

-- UserStoryProgress
create table user_story_progress (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  story_id     text not null,                 -- ref: story(story_id)
  current_step integer default 1,
  step1_completed boolean default false,
  step1_comprehension_rating integer,
  step2_completed boolean default false,
  step3_completed boolean default false,
  step4_completed boolean default false,
  step5_completed boolean default false,
  step6_completed boolean default false,
  story_completed boolean default false,
  words_added_to_backpack text[] default '{}'
);

-- PracticeResult
create table practice_result (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  story_id     text not null,                 -- ref: story(story_id)
  exercise_type text not null check (exercise_type in ('listening_image','reorder_lines','speak_sentence')),
  completed    boolean default true,
  attempts     integer default 1
);

-- ConversationSession
create table conversation_session (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  story_id     text not null,                 -- ref: story(story_id)
  duration_seconds integer,
  transcript   text,
  completed    boolean default false
);

-- VocabExposure
create table vocab_exposure (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  word_he      text not null,
  story_id     text,                          -- ref: story(story_id)
  exposure_count integer default 1
);

-- PictureWord
create table picture_word (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  word_id      text not null,
  hebrew_word  text not null,
  transliteration text,
  meaning      text,
  hint         text,
  mnemonic     text,
  image_url    text,
  confidence   smallint default 0 check (confidence between 0 and 5)
);

-- Unique / natural-key constraints
create unique index story_uq on story(story_id);
create unique index user_story_progress_uq on user_story_progress(created_by, story_id);

-- Song
create table song (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  title             text not null,
  youtube_url       text,
  youtube_id        text,
  audio_url         text,
  transcript        jsonb default '[]'::jsonb,
  level             integer default 1,
  "order"           integer default 0,
  transcript_text   text,
  transcript_source text check (transcript_source in ('youtube_captions','manual','unavailable')),
  transcript_status text check (transcript_status in ('processing','complete','failed','needs_refresh'))
);

-- SongProgress
create table song_progress (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  song_id      text not null,            -- ref: song.id
  completed    boolean default false,
  words_added  text[] default '{}'
);

-- DailySong
create table daily_song (
  id                     text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date           timestamptz not null default now(),
  updated_date           timestamptz not null default now(),
  created_by             text not null,
  date                   text not null,
  vocab_words            text[] not null default '{}',
  lyrics_he              text not null,
  lyrics_transliteration text not null,
  audio_url              text,
  audio_format           text default 'mp3',
  duration_seconds       integer,
  style                  text default 'warm acoustic pop'
);

-- SingingSong
create table singing_song (
  id               text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text not null,
  title            text not null,
  description      text,
  audio_url        text,
  cover_image      text,
  language         text default 'hebrew',
  difficulty_level text default 'beginner' check (difficulty_level in ('beginner','intermediate','advanced')),
  duration_seconds integer default 48,
  is_active        boolean default true,
  tags             text
);

-- SingingSegment
create table singing_segment (
  id              text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date    timestamptz not null default now(),
  updated_date    timestamptz not null default now(),
  created_by      text not null,
  song_id         text not null,            -- ref: singing_song.id
  order_index     integer not null default 0,
  english_line    text not null,
  hebrew_line     text not null,
  transliteration text,
  start_time      integer,
  end_time        integer,
  record_start_1  integer,
  record_end_1    integer,
  model_play_start integer,
  model_play_end  integer,
  record_start_2  integer,
  record_end_2    integer,
  section_type    text default 'verse' check (section_type in ('verse','chorus','bridge','intro','outro'))
);

-- SingingProgress
create table singing_progress (
  id                    text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date          timestamptz not null default now(),
  updated_date          timestamptz not null default now(),
  created_by            text not null,
  user_id               text,
  song_id               text not null,            -- ref: singing_song.id
  current_segment_index integer default 0,
  completed_segments    text[] default '{}',
  last_played_at        timestamptz,
  total_recordings      integer default 0
);

-- SingingRecording
create table singing_recording (
  id               text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text not null,
  user_id          text,
  song_id          text not null,            -- ref: singing_song.id
  segment_id       text not null,            -- ref: singing_segment.id
  attempt_type     text default 'first_repeat' check (attempt_type in ('first_repeat','second_repeat')),
  audio_file_url   text,
  duration_seconds integer
);

-- Video
create table video (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  video_url               text not null,
  "order"                 integer default 0,
  title                   text,
  youtube_video_id        text,
  thumbnail_url           text,
  level                   integer default 1,
  tags                    text,
  notes                   text,
  is_active               boolean default true,
  deleted_at              timestamptz,
  caption_track_id        text,
  transcript_text         text,
  transcript_source       text check (transcript_source in ('youtube_captions','manual','unavailable')),
  language                text default 'he',
  transcript_status       text check (transcript_status in ('processing','complete','failed','needs_refresh','deleted')),
  transcript_generated_at timestamptz
);

-- MediaLibrary
create table media_library (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  title                 text not null,
  language              text not null check (language in ('hebrew','english','spanish','french','portuguese','italian')),
  video_url             text not null,
  video_id              text not null,
  topics                text[] default '{}',
  difficulty_level      text default 'All' check (difficulty_level in ('Beginner','Intermediate','Advanced','All')),
  duration_minutes      numeric,
  tags                  text,
  accent_region         text,
  default_day           integer,
  is_active             boolean default true,
  thumbnail_url         text,
  notes                 text,
  transcript_phonetics  text,
  processed_transcript  jsonb default '[]'::jsonb,
  session_vocab_words   jsonb default '[]'::jsonb
);

-- UserProgram
create table user_program (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  user_email       text not null,
  media_library_id text not null,        -- ref: media_library.id
  assigned_by      text,
  assigned_at      timestamptz,
  "order"          integer default 0,
  completed        boolean default false,
  completed_at     timestamptz,
  notes            text
);

-- CoachAssignment
create table coach_assignment (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  coach_email   text not null,
  student_email text not null,
  assigned_by   text,
  assigned_at   timestamptz
);

-- CoachNote
create table coach_note (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  student_name  text not null,
  student_email text,
  coach_email   text,
  note          text not null,
  words         text[] default '{}'
);

-- ChatMessage
create table chat_message (
  id           text primary key default replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by   text not null,
  from_user     text,
  to_user       text,
  message       text,
  hebrew_text   text,
  ai_suggestion text
);

-- =====================================================================
-- 02 TRIGGERS
-- =====================================================================
create trigger user_profile_sys before insert or update on user_profile
  for each row execute function set_system_fields();

create trigger word_sys before insert or update on word
  for each row execute function set_system_fields();

create trigger user_coins_sys before insert or update on user_coins
  for each row execute function set_system_fields();

create trigger achievement_sys before insert or update on achievement
  for each row execute function set_system_fields();

create trigger journal_entry_sys before insert or update on journal_entry
  for each row execute function set_system_fields();

create trigger text_edit_sys before insert or update on text_edit
  for each row execute function set_system_fields();

create trigger fluent_lead_sys before insert or update on fluent_lead
  for each row execute function set_system_fields();

create trigger day_sys before insert or update on day
  for each row execute function set_system_fields();

create trigger day_progress_sys before insert or update on day_progress
  for each row execute function set_system_fields();

create trigger todo_item_sys before insert or update on todo_item
  for each row execute function set_system_fields();

create trigger todo_progress_sys before insert or update on todo_progress
  for each row execute function set_system_fields();

create trigger lesson_progress_sys before insert or update on lesson_progress
  for each row execute function set_system_fields();

create trigger activity_progress_sys before insert or update on activity_progress
  for each row execute function set_system_fields();

create trigger study_session_sys before insert or update on study_session
  for each row execute function set_system_fields();

create trigger story_sys before insert or update on story
  for each row execute function set_system_fields();

create trigger story_song_sys before insert or update on story_song
  for each row execute function set_system_fields();

create trigger user_story_progress_sys before insert or update on user_story_progress
  for each row execute function set_system_fields();

create trigger practice_result_sys before insert or update on practice_result
  for each row execute function set_system_fields();

create trigger conversation_session_sys before insert or update on conversation_session
  for each row execute function set_system_fields();

create trigger vocab_exposure_sys before insert or update on vocab_exposure
  for each row execute function set_system_fields();

create trigger picture_word_sys before insert or update on picture_word
  for each row execute function set_system_fields();

create trigger song_sys before insert or update on song
  for each row execute function set_system_fields();

create trigger song_progress_sys before insert or update on song_progress
  for each row execute function set_system_fields();

create trigger daily_song_sys before insert or update on daily_song
  for each row execute function set_system_fields();

create trigger singing_song_sys before insert or update on singing_song
  for each row execute function set_system_fields();

create trigger singing_segment_sys before insert or update on singing_segment
  for each row execute function set_system_fields();

create trigger singing_progress_sys before insert or update on singing_progress
  for each row execute function set_system_fields();

create trigger singing_recording_sys before insert or update on singing_recording
  for each row execute function set_system_fields();

create trigger video_sys before insert or update on video
  for each row execute function set_system_fields();

create trigger media_library_sys before insert or update on media_library
  for each row execute function set_system_fields();

create trigger user_program_sys before insert or update on user_program
  for each row execute function set_system_fields();

create trigger coach_assignment_sys before insert or update on coach_assignment
  for each row execute function set_system_fields();

create trigger coach_note_sys before insert or update on coach_note
  for each row execute function set_system_fields();

create trigger chat_message_sys before insert or update on chat_message
  for each row execute function set_system_fields();

-- =====================================================================
-- 03 ROW LEVEL SECURITY
-- =====================================================================
-- UserProfile [PERUSER]
alter table user_profile enable row level security;
create policy user_profile_owner on user_profile for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy user_profile_admin on user_profile for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy user_profile_coach on user_profile for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = user_profile.created_by));

-- Word [WORD]
alter table word enable row level security;
create policy word_sel on word for select to authenticated using (true);
create policy word_owner on word for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy word_admin on word for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');

-- UserCoins [PERUSER]
alter table user_coins enable row level security;
create policy user_coins_owner on user_coins for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy user_coins_admin on user_coins for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy user_coins_coach on user_coins for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = user_coins.created_by));

-- Achievement [PERUSER]
alter table achievement enable row level security;
create policy achievement_owner on achievement for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy achievement_admin on achievement for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy achievement_coach on achievement for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = achievement.created_by));

-- JournalEntry [JOURNAL]
alter table journal_entry enable row level security;
create policy journal_entry_owner on journal_entry for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy journal_entry_admin on journal_entry for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy journal_entry_public on journal_entry for select to authenticated using (is_public = true);
create policy journal_entry_coach on journal_entry for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = journal_entry.created_by));

-- TextEdit [PERUSER]
alter table text_edit enable row level security;
create policy text_edit_owner on text_edit for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy text_edit_admin on text_edit for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy text_edit_coach on text_edit for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = text_edit.created_by));

-- FluentLead [LEAD]
alter table fluent_lead enable row level security;
create policy fl_ins on fluent_lead for insert to anon, authenticated with check (true);
create policy fl_sel on fluent_lead for select to authenticated using (app_role() = 'admin');

-- Day [CONTENT]
alter table day enable row level security;
create policy day_sel on day for select to authenticated using (true);
create policy day_adm on day for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');

-- DayProgress [PERUSER]
alter table day_progress enable row level security;
create policy day_progress_owner on day_progress for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy day_progress_admin on day_progress for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy day_progress_coach on day_progress for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = day_progress.created_by));

-- TodoItem [CONTENT]
alter table todo_item enable row level security;
create policy todo_item_sel on todo_item for select to authenticated using (true);
create policy todo_item_adm on todo_item for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');

-- TodoProgress [PERUSER]
alter table todo_progress enable row level security;
create policy todo_progress_owner on todo_progress for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy todo_progress_admin on todo_progress for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy todo_progress_coach on todo_progress for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = todo_progress.created_by));

-- LessonProgress [PERUSER]
alter table lesson_progress enable row level security;
create policy lesson_progress_owner on lesson_progress for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy lesson_progress_admin on lesson_progress for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy lesson_progress_coach on lesson_progress for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = lesson_progress.created_by));

-- ActivityProgress [PERUSER]
alter table activity_progress enable row level security;
create policy activity_progress_owner on activity_progress for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy activity_progress_admin on activity_progress for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy activity_progress_coach on activity_progress for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = activity_progress.created_by));

-- StudySession [PERUSER]
alter table study_session enable row level security;
create policy study_session_owner on study_session for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy study_session_admin on study_session for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy study_session_coach on study_session for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = study_session.created_by));

-- Unique indexes (natural one-row-per-user constraints)
create unique index day_progress_uq on day_progress(created_by, day_id);
create unique index todo_progress_uq on todo_progress(created_by, todo_item_id);
create unique index activity_progress_uq on activity_progress(created_by, activity_id);

-- Story [CONTENT]
alter table story enable row level security;
create policy story_sel on story for select to authenticated using (true);
create policy story_adm on story for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');

-- StorySong [CONTENT]
alter table story_song enable row level security;
create policy story_song_sel on story_song for select to authenticated using (true);
create policy story_song_adm on story_song for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy story_song_owner on story_song for all to authenticated using (created_by = app_email()) with check (created_by = app_email());

-- UserStoryProgress [PERUSER]
alter table user_story_progress enable row level security;
create policy user_story_progress_owner on user_story_progress for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy user_story_progress_admin on user_story_progress for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy user_story_progress_coach on user_story_progress for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = user_story_progress.created_by));

-- PracticeResult [PERUSER]
alter table practice_result enable row level security;
create policy practice_result_owner on practice_result for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy practice_result_admin on practice_result for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy practice_result_coach on practice_result for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = practice_result.created_by));

-- ConversationSession [PERUSER]
alter table conversation_session enable row level security;
create policy conversation_session_owner on conversation_session for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy conversation_session_admin on conversation_session for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy conversation_session_coach on conversation_session for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = conversation_session.created_by));

-- VocabExposure [PERUSER]
alter table vocab_exposure enable row level security;
create policy vocab_exposure_owner on vocab_exposure for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy vocab_exposure_admin on vocab_exposure for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy vocab_exposure_coach on vocab_exposure for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = vocab_exposure.created_by));

-- PictureWord [WORD-like: CONTENT read + owner/admin write]
alter table picture_word enable row level security;
create policy picture_word_sel on picture_word for select to authenticated using (true);
create policy picture_word_owner on picture_word for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy picture_word_admin on picture_word for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');

-- Song [CONTENT]
alter table song enable row level security;
create policy song_sel on song for select to authenticated using (true);
create policy song_adm on song for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');

-- SongProgress [PERUSER]
alter table song_progress enable row level security;
create policy song_progress_owner on song_progress for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy song_progress_admin on song_progress for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy song_progress_coach on song_progress for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = song_progress.created_by));

-- DailySong [PERUSER]
alter table daily_song enable row level security;
create policy daily_song_owner on daily_song for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy daily_song_admin on daily_song for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy daily_song_coach on daily_song for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = daily_song.created_by));

-- SingingSong [CONTENT]
alter table singing_song enable row level security;
create policy singing_song_sel on singing_song for select to authenticated using (true);
create policy singing_song_adm on singing_song for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');

-- SingingSegment [CONTENT]
alter table singing_segment enable row level security;
create policy singing_segment_sel on singing_segment for select to authenticated using (true);
create policy singing_segment_adm on singing_segment for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');

-- SingingProgress [PERUSER]
alter table singing_progress enable row level security;
create policy singing_progress_owner on singing_progress for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy singing_progress_admin on singing_progress for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy singing_progress_coach on singing_progress for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = singing_progress.created_by));

-- SingingRecording [PERUSER]
alter table singing_recording enable row level security;
create policy singing_recording_owner on singing_recording for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy singing_recording_admin on singing_recording for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy singing_recording_coach on singing_recording for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = singing_recording.created_by));

-- Video [CONTENT]
alter table video enable row level security;
create policy video_sel on video for select to authenticated using (true);
create policy video_adm on video for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy video_owner on video for all to authenticated using (created_by = app_email()) with check (created_by = app_email());

-- MediaLibrary [CONTENT, write extended to coach]
alter table media_library enable row level security;
create policy media_library_sel on media_library for select to authenticated using (true);
create policy media_library_adm on media_library for all to authenticated using (app_role() in ('admin','coach')) with check (app_role() in ('admin','coach'));

-- UserProgram [USERPROGRAM]
alter table user_program enable row level security;
create policy upr_sel on user_program for select to authenticated using (user_email = app_email() or app_role() in ('admin','coach'));
create policy upr_w on user_program for all to authenticated using (app_role() in ('admin','coach')) with check (app_role() in ('admin','coach'));

-- CoachAssignment [COACHASSIGN]
alter table coach_assignment enable row level security;
create policy ca_sel on coach_assignment for select to authenticated using (app_role()='admin' or coach_email = app_email() or student_email = app_email());
create policy ca_adm on coach_assignment for all to authenticated using (app_role()='admin') with check (app_role()='admin');

-- CoachNote [PERUSER, created_by = coach]
alter table coach_note enable row level security;
create policy coach_note_owner on coach_note for all to authenticated using (created_by = app_email()) with check (created_by = app_email());
create policy coach_note_admin on coach_note for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy coach_note_coach on coach_note for select to authenticated using (
  exists (select 1 from coach_assignment ca where ca.coach_email = app_email() and ca.student_email = coach_note.created_by));

-- ChatMessage [CHAT]
alter table chat_message enable row level security;
create policy cm_sel on chat_message for select to authenticated using (from_user = app_email() or to_user = app_email());
create policy cm_ins on chat_message for insert to authenticated with check (from_user = app_email());

-- =====================================================================
-- 04 FOREIGN KEYS (optional — apply after seeding if you want hard refs)
-- =====================================================================
-- Word.approved_by -- ref: user email (app_email key), left as plain text; no FK
-- Word.assigned_by_coach -- ref: coach email; left as plain text; no FK
-- JournalEntry.used_vocab_ids / suggested_vocab_ids reference word(id) but are arrays; no FK
-- No reliable single-column FK targets in this group; FKs intentionally omitted (loose seeding, business keys).

-- Optional FKs. Targets are Base44 business keys / id columns; DB seeded loosely, so these are advisory.
-- day_progress.day_id references day(id)
alter table day_progress add constraint day_progress_day_id_fk foreign key (day_id) references day(id);
-- todo_progress.todo_item_id references todo_item(id)
alter table todo_progress add constraint todo_progress_todo_item_id_fk foreign key (todo_item_id) references todo_item(id);
-- todo_item.parent_id self-references todo_item(id) for nested items
alter table todo_item add constraint todo_item_parent_id_fk foreign key (parent_id) references todo_item(id);
-- todo_item.target_video_id references video(id) -- left as plain text; video table owned by another group, skipping hard FK

-- All FKs target story(story_id), a business key; requires the unique index story_uq on story(story_id) (created in tablesSql).
-- Emitted as optional; the DB is seeded loosely so enable only if referential integrity is desired.
alter table story_song add constraint story_song_story_fk foreign key (story_id) references story(story_id);
alter table user_story_progress add constraint user_story_progress_story_fk foreign key (story_id) references story(story_id);
alter table practice_result add constraint practice_result_story_fk foreign key (story_id) references story(story_id);
alter table conversation_session add constraint conversation_session_story_fk foreign key (story_id) references story(story_id);
-- story.next_story_id self-reference (also business key via story_uq):
alter table story add constraint story_next_fk foreign key (next_story_id) references story(story_id);
-- VocabExposure.story_id is nullable and not in required; left as plain text -- ref: story(story_id), FK skipped.

-- All FKs reference Base44 business keys (the row 'id' text key). Targets are primary keys,
-- so these are safe to add. They are OPTIONAL because the DB is seeded loosely.
-- alter table song_progress add constraint song_progress_song_fk foreign key (song_id) references song(id);
-- alter table singing_segment add constraint singing_segment_song_fk foreign key (song_id) references singing_song(id);
-- alter table singing_progress add constraint singing_progress_song_fk foreign key (song_id) references singing_song(id);
-- alter table singing_recording add constraint singing_recording_song_fk foreign key (song_id) references singing_song(id);
-- alter table singing_recording add constraint singing_recording_segment_fk foreign key (segment_id) references singing_segment(id);

-- UserProgram.media_library_id references media_library.id (primary key, no extra unique needed)
alter table user_program add constraint user_program_media_library_fk
  foreign key (media_library_id) references media_library(id);