export type Categoria = 'seco' | 'molhado';
export type Unidade = 'cx' | 'bag' | 'un' | 'lt' | 'kg';
export type Local = 'CD' | 'Mariano' | 'Chapada' | 'Mufatto' | 'Oficinas';
export type TipoMovimentacao = 'entrada_cd' | 'transferencia';

export interface Produto {
  id: string;
  codigo: string;
  nome: string;
  categoria: Categoria;
  unidade: Unidade;
  estoqueMinimo: number;
  ativo: boolean;
  criadoEm: string;
}

export interface ItemEstoque {
  produtoId: string;
  local: Local;
  quantidade: number;
}

export interface Movimentacao {
  id: string;
  tipo: TipoMovimentacao;
  produtoId: string;
  quantidade: number;
  de: Local | null;
  para: Local;
  data: string;
  usuario: string;
  observacao?: string;
}

export const LOCAIS_QUIOSQUE: Local[] = ['Mariano', 'Chapada', 'Mufatto', 'Oficinas'];
export const UNIDADES: Unidade[] = ['cx', 'bag', 'un', 'lt', 'kg'];
export const CATEGORIAS: Categoria[] = ['seco', 'molhado'];

export const UNIDADE_LABELS: Record<Unidade, string> = {
  cx: 'Caixa',
  bag: 'Bag',
  un: 'Unidade',
  lt: 'Litro',
  kg: 'Quilo',
};
