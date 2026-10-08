# 🚀 SUPABASE TABLE SETUP

## ✅ Status
MongoDB has been completely removed from the backend.
All routes now use Supabase exclusively.

## 📋 Required Setup

You need to create the `users`, `papers`, and `shared` tables in Supabase:

### Step 1: Go to Supabase Dashboard
1. Open https://app.supabase.com
2. Click your project (lyfmqbvbxuktypcvypff)
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

### Step 2: Copy & Execute the SQL below

```sql
-- Create users table (required for signup, login, and admin access)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'external',
  reset_token text,
  reset_token_expiry timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

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

-- Create shared table (for sharing papers between users)
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_papers_owner ON public.papers(owner);
CREATE INDEX IF NOT EXISTS idx_shared_sender ON public.shared(sender_id);
CREATE INDEX IF NOT EXISTS idx_shared_recipient ON public.shared(recipient_email);
```

### Step 3: Click "Run" button

## ✅ After Setup

For Vercel, set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or
`SUPABASE_SERVICE_ROLE_KEY`) in **Project Settings → Environment Variables**, then
redeploy. The backend needs a Supabase service-role key; do not expose it in the
frontend or commit it to the repository.

1. Commit your code:
```bash
git add .
git commit -m "Remove MongoDB, use Supabase only"
git push origin main
```

2. Vercel will auto-deploy
3. The timeout error should be GONE! 🎉

## 🔍 What Changed

### Removed:
- ❌ MongoDB connection from index.js
- ❌ MongoDB models (User, Paper, Shared) from routes
- ❌ Mongoose dependencies in papers.js and share.js

### Updated Routes:
- ✅ POST /api/papers → Saves to Supabase `papers` table
- ✅ GET /api/papers → Queries from Supabase `papers` table
- ✅ GET /api/papers/stats → Counts from Supabase
- ✅ POST /api/share/send → Saves to Supabase `shared` table
- ✅ GET /api/share/received → Queries from Supabase
- ✅ GET /api/share/:id → Gets from Supabase

## 🐛 If Issues Still Occur

Check:
1. Tables were created (go to Table Editor in Supabase)
2. Supabase credentials in .env are correct
3. Check Vercel logs: `vercel logs`
4. Clear Vercel cache and redeploy
