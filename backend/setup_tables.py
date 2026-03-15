#!/usr/bin/env python3
"""
Setup Supabase tables automatically
"""
import os
import requests
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    exit(1)

def execute_sql(sql):
    """Execute SQL via Supabase GraphQL API"""
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
    }
    
    # Try direct SQL endpoint
    try:
        response = requests.post(
            f'{SUPABASE_URL}/rest/v1/rpc/execute_sql',
            headers=headers,
            json={'sql': sql},
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            return True, "Success"
        else:
            return False, response.text
    except Exception as e:
        return False, str(e)

def main():
    print("🔧 Setting up Supabase tables...\n")
    
    sqls = [
        # Create papers table
        """CREATE TABLE IF NOT EXISTS public.papers (
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
        );""",
        
        # Create shared table
        """CREATE TABLE IF NOT EXISTS public.shared (
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
        );""",

        # Create indexes
        "CREATE INDEX IF NOT EXISTS idx_papers_owner ON public.papers(owner);",
        "CREATE INDEX IF NOT EXISTS idx_shared_sender ON public.shared(sender_id);",
        "CREATE INDEX IF NOT EXISTS idx_shared_recipient ON public.shared(recipient_email);"
    ]
    
    success_count = 0
    for i, sql in enumerate(sqls, 1):
        success, msg = execute_sql(sql)
        status = "✅" if success else "❌"
        print(f"{status} Query {i}: {sql[:50]}...")
        if not success:
            print(f"   Error: {msg[:100]}")
        else:
            success_count += 1
    
    print(f"\n✅ Executed {success_count}/{len(sqls)} queries")
    
    if success_count < len(sqls):
        print_manual_instructions()

def print_manual_instructions():
    print('\n📋 To manually create tables:')
    print('1. Go to https://app.supabase.com')
    print('2. Click your project')
    print('3. Click "SQL Editor" → "New Query"')
    print('4. Paste the SQL below:')
    print("""
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
CREATE INDEX IF NOT EXISTS idx_shared_recipient ON public.shared(recipient_email);
    """)
    print('5. Click "Run"')

if __name__ == '__main__':
    main()
