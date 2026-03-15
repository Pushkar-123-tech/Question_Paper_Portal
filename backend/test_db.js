require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function test() {
    const { data, error } = await supabase.from('papers').select('*').limit(2);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Papers schema:');
        if (data && data.length > 0) {
            console.log(Object.keys(data[0]));
            console.log('First paper:', data[0]);
        } else {
            console.log('No papers found');
        }
    }
}

test();
