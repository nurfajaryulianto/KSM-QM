create table public.assessment_responses (
  id uuid not null default gen_random_uuid (),
  submitted_at timestamp with time zone null default now(),
  nik text not null,
  name text null,
  sub_department text null,
  correct_count numeric null,
  total_questions integer null,
  accuracy_pct numeric null,
  base_score numeric null,
  speed_bonus numeric null,
  total_score numeric null,
  time_taken_s numeric null,
  mc_score numeric null,
  binary_score numeric null,
  essay_score numeric null,
  answers_detail jsonb null,
  constraint assessment_responses_pkey primary key (id)
) TABLESPACE pg_default;

create unique INDEX IF not exists assessment_responses_nik_idx on public.assessment_responses using btree (nik) TABLESPACE pg_default;