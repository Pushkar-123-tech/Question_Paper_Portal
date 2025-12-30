const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for backend operations

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
