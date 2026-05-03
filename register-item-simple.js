import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ibxxydurgtmpxeqqbxrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieHh5ZHVyZ3RtcHhlcXFieHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3ODEyNDMsImV4cCI6MjA5MzM1NzI0M30.EQ_1xGtCi9xAKmHOrnPPA5wshDTiBuOE6fdPcHq7Dec';

const supabase = createClient(supabaseUrl, supabaseKey);

async function registerItem() {
  try {
    // Try without estoqueMinimo to see what the actual schema is
    console.log('Trying to create product...');
    const { data: newProduct, error: prodError } = await supabase
      .from('produtos')
      .insert([{
        codigo: 'bagbau',
        nome: 'Baunilha',
        categoria: 'molhado',
        unidade: 'bag',
        ativo: true
      }])
      .select();

    if (prodError) {
      console.error('Error creating product:', JSON.stringify(prodError, null, 2));
      return;
    }

    const productId = newProduct[0].id;
    console.log('✓ Product created:', newProduct[0]);

    // Add to estoque
    console.log('\nAdding to estoque...');
    const { data: newEstoque, error: estoqueError } = await supabase
      .from('estoque')
      .insert([{
        produtoId: productId,
        local: 'CD',
        quantidade: 40
      }])
      .select();

    if (estoqueError) {
      console.error('Error adding to estoque:', JSON.stringify(estoqueError, null, 2));
      return;
    }

    console.log('✓ Estoque entry created:', newEstoque[0]);
    console.log('\n✅ Item "BAG Baunilha 40kg" registered successfully!');
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

registerItem();
