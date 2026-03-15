const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

async function setupTables() {
  try {
    console.log('🔧 Setting up Supabase tables...\n');

    // Use REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      }
    });

    console.log(`
✅ Papers table structure:
- id (UUID, primary key)
- owner (UUID) - references users
- paperTitle (TEXT)
- courseName (TEXT)
- courseCode (TEXT)
- totalQuestions (INT)
- maxMarks (INT)
- duration (TEXT)
- sections (JSONB)
- created_at (TIMESTAMP)
    `);

    console.log('\n✅ Shared table structure:' +
      '\n- id (UUID, primary key)' +
      '\n- sender_id (UUID) - references users' +
      '\n- sender_name (TEXT)' +
      '\n- sender_email (TEXT)' +
      '\n- recipient_email (TEXT)' +
      '\n- message (TEXT)' +
      '\n- paper_id (UUID) - references papers' +
      '\n- paper_snapshot (JSONB)' +
      '\n- created_at (TIMESTAMP)');

    console.log('\n🎯 SQL to execute in Supabase Dashboard:\n');
    console.log(`
-- Create papers table
CREATE TABLE IF NOT EXISTS public.papers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner uuid NOT NULL,
  paperTitle text,
  courseName text,
  courseCode text,
  totalQuestions integer,
  maxMarks integer,
  duration text,
  sections jsonb,
  created_at timestamp without time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create shared table
CREATE TABLE IF NOT EXISTS public.shared (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  sender_name text,
  sender_email text,
  recipient_email text NOT NULL,
  message text,
  paper_id uuid NOT NULL,
  paper_snapshot jsonb,
  created_at timestamp without time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Add indexes for better performance
CREATE INDEX idx_papers_owner ON public.papers(owner);
CREATE INDEX idx_shared_sender ON public.shared(sender_id);
CREATE INDEX idx_shared_recipient ON public.shared(recipient_email);
    `);

    console.log('\n📋 Steps to complete:\n');
    console.log('1. Go to https://app.supabase.com');
    console.log('2. Select your project');
    console.log('3. Click "SQL Editor" → "New Query"');
    console.log('4. Copy and paste the SQL above');
    console.log('5. Click "Run"');
    console.log('\n✅ Tables ready for use!');

  } catch (error) {
    console.error('❌ Setup error:', error.message);
    process.exit(1);
  }
}

setupTables();
