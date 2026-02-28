-- 🚨 RUN THIS IN SUPABASE SQL EDITOR TO FIX THE SCHEMA 🚨
-- This script renames old CamelCase columns to snake_case and adds missing columns.

DO $$ 
BEGIN
    -- Rename legacy CamelCase columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'papers' AND column_name = 'paperTitle') THEN
        ALTER TABLE public.papers RENAME COLUMN "paperTitle" TO paper_title;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'papers' AND column_name = 'courseName') THEN
        ALTER TABLE public.papers RENAME COLUMN "courseName" TO course_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'papers' AND column_name = 'courseCode') THEN
        ALTER TABLE public.papers RENAME COLUMN "courseCode" TO course_code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'papers' AND column_name = 'totalQuestions') THEN
        ALTER TABLE public.papers RENAME COLUMN "totalQuestions" TO total_questions;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'papers' AND column_name = 'maxMarks') THEN
        ALTER TABLE public.papers RENAME COLUMN "maxMarks" TO max_marks;
    END IF;

    -- Add missing columns in snake_case
    ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS base_title text;
    ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS set_name text;
    ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS examination text;
    ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS semester text;
    ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS academic_year text;
    ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS program text;
    ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS program_name text;
    ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS qp_code text;
    ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS prn_no text;
    ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
    ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS workflow_history jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS comments jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS course_outcomes jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS instructions jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now();

END $$;

-- 💡 IMPORTANT: After running this, if you still get the error, 
-- go to your Supabase Dashboard -> Settings -> API -> "Reload Schema" (or "PostgREST Schema Cache")
