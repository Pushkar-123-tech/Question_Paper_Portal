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
        'apikey': supabaseKey,
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

async function addColumns() {
  console.log('🔧 Adding reset token columns to users table...\n');

  const sql = `
    ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS reset_token text,
    ADD COLUMN IF NOT EXISTS reset_token_expiry timestamp without time zone;
  `;

  const result = await executeSql(sql);
  
  if (result) {
    console.log('✅ Columns added successfully!');
  } else {
    console.log('❌ Failed to add columns. You might need to run this SQL manually in Supabase Dashboard:');
    console.log(sql);
  }
}

addColumns();
