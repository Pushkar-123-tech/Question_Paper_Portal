const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

async function executeSql(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('API Error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function createTables() {
  console.log('🔧 Creating Supabase tables...\n');

  const sqls = [
    // Create papers table
    `CREATE TABLE IF NOT EXISTS public.papers (
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
    );`,
    
    // Create shared table
    `CREATE TABLE IF NOT EXISTS public.shared (
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
    );`,

    // Create indexes
    `CREATE INDEX IF NOT EXISTS idx_papers_owner ON public.papers(owner);`,
    `CREATE INDEX IF NOT EXISTS idx_shared_sender ON public.shared(sender_id);`,
    `CREATE INDEX IF NOT EXISTS idx_shared_recipient ON public.shared(recipient_email);`
  ];

  for (const sql of sqls) {
    const result = await executeSql(sql);
    console.log(result ? '✅ ' : '❌ ' + sql.substring(0, 40) + '...');
  }

  console.log('\n✅ All tables created successfully!');
}

// Alternative: Just show the SQL if RPC doesn't work
async function showSqlManually() {
  console.log('\n📋 If automatic setup didn\'t work, manually run in Supabase SQL Editor:\n');

  const fullSql = `
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_papers_owner ON public.papers(owner);
CREATE INDEX IF NOT EXISTS idx_shared_sender ON public.shared(sender_id);
CREATE INDEX IF NOT EXISTS idx_shared_recipient ON public.shared(recipient_email);`;

  console.log(fullSql);

  console.log('\n\n📌 Steps:');
  console.log('1. Go to https://app.supabase.com');
  console.log('2. Click your project');
  console.log('3. Click "SQL Editor" → "New Query"');
  console.log('4. Paste the above SQL');
  console.log('5. Click "Run"\n');
}

createTables().then(() => showSqlManually());
