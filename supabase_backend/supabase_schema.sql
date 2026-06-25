-- Supabase schema for KSM‑QM Assessment backend
-- This script creates tables that replicate the data model used by the original Google Apps Script.

-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Config table (key‑value store)
CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Participants (users)
CREATE TABLE IF NOT EXISTS participants (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email     TEXT NOT NULL,
  name      TEXT,
  role      TEXT NOT NULL DEFAULT 'user', -- 'user' or 'admin'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_text TEXT NOT NULL,
  max_score   INTEGER NOT NULL,
  "order"    INTEGER NOT NULL
);

-- Responses (one per assessment session)
CREATE TABLE IF NOT EXISTS responses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  submitted_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
  total_score   INTEGER
);

-- Answer rows (individual question answers)
CREATE TABLE IF NOT EXISTS answer_rows (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  score       INTEGER
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_responses_participant ON responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_answer_rows_response ON answer_rows(response_id);
