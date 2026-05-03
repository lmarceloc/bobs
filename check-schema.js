import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ibxxydurgtmpxeqqbxrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieHh5ZHVyZ3RtcHhlcXFieHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3ODEyNDMsImV4cCI6MjA5MzM1NzI0M30.EQ_1xGtCi9xAKmHOrnPPA5wshDTiBuOE6fdPcHq7Dec';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  // Try to get schema info by inserting dummy data and seeing what columns are expected
  const { error } = await supabase
    .from('produtos')
    .insert([{ codigo: 'test' }]);
  
  console.log('Error details:', JSON.stringify(error, null, 2));
}

checkSchema();
