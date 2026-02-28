-- Run this SQL in your Supabase SQL Editor to add the missing columns to the papers table

ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS paper_title text;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS base_title text;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS set_name text;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS course_name text;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS course_code text;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS total_questions integer;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS max_marks integer;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS workflow_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS comments jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS semester text;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS academic_year text;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS program text;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS program_name text;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS qp_code text;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS prn_no text;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS course_outcomes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS instructions jsonb DEFAULT '[]'::jsonb;
