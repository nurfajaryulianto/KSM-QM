-- ============================================================
-- SQL SCRIPT FOR SUPABASE AUTO-GRADING SYSTEM
-- Run this script in your Supabase SQL Editor.
-- ============================================================

-- 1. Create quiz_questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    sub_department TEXT NOT NULL,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL, -- 'mc', 'binary', 'essay'
    options TEXT[], -- options for MC/Binary
    correct_answer TEXT, -- correct option text (MC/Binary) or keyword reference (Essay)
    scoring BOOLEAN DEFAULT TRUE,
    keywords TEXT[], -- keywords for essay grading
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast lookup by sub-department
CREATE INDEX IF NOT EXISTS idx_quiz_questions_sub_dept ON quiz_questions(sub_department);

-- 2. Create the grading trigger function
CREATE OR REPLACE FUNCTION calculate_assessment_score()
RETURNS TRIGGER AS $$
DECLARE
    q_record RECORD;
    user_ans TEXT;
    is_correct BOOLEAN;
    correct_count INT := 0;
    total_scoring INT := 0;
    mc_correct INT := 0;
    binary_correct INT := 0;
    essay_correct INT := 0;
    
    -- Scoring configuration
    score_per_question INT := 10;
    max_speed_bonus INT := 20;
    time_limit_minutes INT := 10;
    time_limit_s INT;
    speed_bonus INT := 0;
    base_score INT := 0;
    total_score INT := 0;
    accuracy INT := 0;
    
    -- Essay grading variables
    keyword_item TEXT;
    hit_count INT := 0;
    required_hits INT := 0;
    keywords_len INT := 0;
    sanitized_essay TEXT;
    
    -- Updated answers detail
    updated_answers_detail JSONB := '{}'::jsonb;
    correct_tag TEXT;
BEGIN
    time_limit_s := time_limit_minutes * 60;

    -- Loop through all questions for this sub-department
    FOR q_record IN 
        SELECT question_number, question_type, options, correct_answer, scoring, keywords
        FROM quiz_questions
        WHERE sub_department = NEW.sub_department
        ORDER BY question_number ASC
    LOOP
        -- Extract user answer from jsonb
        user_ans := NEW.answers_detail->>('Q' || q_record.question_number);
        is_correct := FALSE;

        IF q_record.scoring = TRUE THEN
            total_scoring := total_scoring + 1;
        END IF;

        IF user_ans IS NOT NULL AND user_ans <> '(tidak dijawab)' THEN
            IF q_record.question_type = 'essay' THEN
                -- Essay grading based on lowercase keyword matching
                sanitized_essay := lower(trim(user_ans));
                hit_count := 0;
                keywords_len := coalesce(array_length(q_record.keywords, 1), 0);
                
                IF keywords_len > 0 THEN
                    FOREACH keyword_item IN ARRAY q_record.keywords LOOP
                        IF position(lower(trim(keyword_item)) in sanitized_essay) > 0 THEN
                            hit_count := hit_count + 1;
                        END IF;
                    END LOOP;
                    required_hits := ceil(keywords_len / 2.0);
                    IF hit_count >= required_hits THEN
                        is_correct := TRUE;
                    END IF;
                ELSE
                    -- If no keywords are set, mark correct if answer is at least 10 chars long
                    IF length(sanitized_essay) >= 10 THEN
                        is_correct := TRUE;
                    END IF;
                END IF;

                IF q_record.scoring = TRUE AND is_correct THEN
                    essay_correct := essay_correct + 1;
                END IF;

                -- Generate detail review tag for admin
                IF q_record.scoring = FALSE THEN
                    correct_tag := user_ans || ' [NS]';
                ELSIF is_correct THEN
                    correct_tag := user_ans || ' (' || hit_count || '/' || keywords_len || ' kw ✓)';
                ELSE
                    correct_tag := user_ans || ' (' || hit_count || '/' || keywords_len || ' kw ✗)';
                END IF;

            ELSE
                -- MC and Binary grading: case-insensitive option text match
                IF lower(trim(user_ans)) = lower(trim(q_record.correct_answer)) THEN
                    is_correct := TRUE;
                END IF;

                IF q_record.scoring = TRUE AND is_correct THEN
                    IF q_record.question_type = 'mc' THEN
                        mc_correct := mc_correct + 1;
                    ELSIF q_record.question_type = 'binary' THEN
                        binary_correct := binary_correct + 1;
                    END IF;
                END IF;

                -- Generate detail review tag for admin
                IF q_record.scoring = FALSE THEN
                    correct_tag := user_ans || ' [NS]';
                ELSIF is_correct THEN
                    correct_tag := user_ans || ' (✓)';
                ELSE
                    correct_tag := user_ans || ' (✗ ' || q_record.correct_answer || ')';
                END IF;
            END IF;
        ELSE
            -- Option is unanswered or null
            user_ans := '(tidak dijawab)';
            IF q_record.scoring = FALSE THEN
                correct_tag := user_ans || ' [NS]';
            ELSE
                correct_tag := user_ans || ' (✗ ' || coalesce(q_record.correct_answer, '') || ')';
            END IF;
        END IF;

        IF q_record.scoring = TRUE AND is_correct THEN
            correct_count := correct_count + 1;
        END IF;

        -- Store review tag in answers_detail
        updated_answers_detail := jsonb_set(updated_answers_detail, ARRAY['Q' || q_record.question_number], to_jsonb(correct_tag));
    END LOOP;

    -- 3. Calculate scores
    IF total_scoring > 0 THEN
        accuracy := round((correct_count::float / total_scoring::float) * 100);
    ELSE
        accuracy := 0;
    END IF;

    base_score := correct_count * score_per_question;
    
    -- Speed bonus calculation
    IF NEW.time_taken_s < time_limit_s AND max_speed_bonus > 0 THEN
        speed_bonus := round((1.0 - (NEW.time_taken_s::float / time_limit_s::float)) * max_speed_bonus);
    ELSE
        speed_bonus := 0;
    END IF;

    total_score := base_score + speed_bonus;

    -- 4. Fill in the newly inserted row fields
    NEW.correct_count := correct_count;
    NEW.total_questions := total_scoring;
    NEW.accuracy_pct := accuracy;
    NEW.base_score := base_score;
    NEW.speed_bonus := speed_bonus;
    NEW.total_score := total_score;
    NEW.mc_score := mc_correct * score_per_question;
    NEW.binary_score := binary_correct * score_per_question;
    NEW.essay_score := essay_correct * score_per_question;
    NEW.answers_detail := updated_answers_detail;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Bind trigger BEFORE INSERT to assessment_responses
DROP TRIGGER IF EXISTS trigger_calculate_assessment_score ON assessment_responses;
CREATE TRIGGER trigger_calculate_assessment_score
BEFORE INSERT ON assessment_responses
FOR EACH ROW
EXECUTE FUNCTION calculate_assessment_score();
