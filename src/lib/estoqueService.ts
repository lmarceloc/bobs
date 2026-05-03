import { supabase } from './supabase';
import { Produto, ItemEstoque } from '../store/wmsStore';


export async function obterEstoqueCentral() {
  try {
    const { data, error } = await supabase
      .from('estoque')
      .select('*, produtos(*)')
      .eq('local', 'CD');

    if (error) throw error;
    return data;
  } catch (erro) {
    console.error('Erro ao obter estoque central:', erro);
    throw erro;
  }
}

export async function adicionarItemEstoque(item: ItemEstoque) {
  try {
    const { data, error } = await supabase
      .from('estoque')
      .insert([item]);

    if (error) throw error;
    return data;
  } catch (erro) {
    console.error('Erro ao adicionar item:', erro);
    throw erro;
  }
}
