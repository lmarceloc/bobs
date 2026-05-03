import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ibxxydurgtmpxeqqbxrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieHh5ZHVyZ3RtcHhlcXFieHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3ODEyNDMsImV4cCI6MjA5MzM1NzI0M30.EQ_1xGtCi9xAKmHOrnPPA5wshDTiBuOE6fdPcHq7Dec';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
  console.log('=== Existing Products ===');
  const { data: produtos, error: erro1 } = await supabase
    .from('produtos')
    .select('id, codigo, nome, categoria, unidade');
  
  if (erro1) {
    console.error('Error fetching produtos:', erro1);
  } else {
    console.log(JSON.stringify(produtos, null, 2));
  }

  console.log('\n=== Existing Estoque ===');
  const { data: estoque, error: erro2 } = await supabase
    .from('estoque')
    .select('*, produtos(nome)');
  
  if (erro2) {
    console.error('Error fetching estoque:', erro2);
  } else {
    console.log(JSON.stringify(estoque, null, 2));
  }
}

checkProducts();
