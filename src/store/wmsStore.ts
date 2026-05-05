import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';

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

export interface LineItem {
  produtoId: string;
  quantidade: number;
}

export const LOCAIS_QUIOSQUE: Local[] = ['Mariano', 'Chapada', 'Mufatto', 'Oficinas'];
export const UNIDADES: Unidade[] = ['cx', 'bag', 'un', 'lt', 'kg'];
export const CATEGORIAS: Categoria[] = ['seco', 'molhado'];

// A coluna `data` da tabela movimentacoes é `timestamp without time zone`.
// Gravamos em UTC; ao ler, o valor volta sem o `Z`. Forçamos UTC aqui para que
// o parser entenda corretamente e o `format` converta para o fuso local.
function normalizarDataUtc(valor: unknown): string {
  if (typeof valor !== 'string') {
    return new Date(valor as any).toISOString();
  }
  if (valor.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(valor)) {
    return valor;
  }
  return valor.replace(' ', 'T') + 'Z';
}

interface WmsState {
  produtos: Produto[];
  estoque: ItemEstoque[];
  movimentacoes: Movimentacao[];
  initBootstrap: () => Promise<void>;
  receberNaCD: (linhas: LineItem[], observacao?: string) => Promise<void>;
  transferirParaQuiosque: (para: Local, linhas: LineItem[], observacao?: string) => Promise<void>;
  adicionarProduto: (dados: Omit<Produto, 'id' | 'ativo' | 'criadoEm'>) => Promise<void>;
  editarProduto: (id: string, dados: Partial<Omit<Produto, 'id' | 'criadoEm'>>) => Promise<void>;
  ajustarEstoque: (produtoId: string, local: Local, quantidade: number) => Promise<void>;
}

export const useWmsStore = create<WmsState>()(
  persist(
    (set, get) => ({
      produtos: [],
      estoque: [],
      movimentacoes: [],

      initBootstrap: async () => {
        try {
          const [produtosRes, estoqueRes, movRes] = await Promise.all([
            supabase.from('produtos').select('*'),
            supabase.from('estoque').select('*'),
            supabase.from('movimentacoes').select('*').order('data', { ascending: false }),
          ]);

          if (produtosRes.error) throw produtosRes.error;
          if (estoqueRes.error) throw estoqueRes.error;
          if (movRes.error) throw movRes.error;

          const produtos: Produto[] = (produtosRes.data || []).map((p: any) => ({
            id: p.id,
            codigo: p.codigo,
            nome: p.nome,
            categoria: p.categoria,
            unidade: p.unidade,
            estoqueMinimo: p.estoque_minimo ?? 0,
            ativo: p.ativo ?? true,
            criadoEm: p.criado_em ?? p.created_at ?? new Date().toISOString(),
          }));

          const estoque: ItemEstoque[] = (estoqueRes.data || []).map((e: any) => ({
            produtoId: e.produto_id,
            local: e.local,
            quantidade: e.quantidade ?? 0,
          }));

          const movimentacoes: Movimentacao[] = (movRes.data || []).map((m: any) => ({
            id: m.id,
            tipo: m.tipo,
            produtoId: m.produto_id,
            quantidade: m.quantidade,
            de: m.de ?? null,
            para: m.para,
            data: normalizarDataUtc(m.data),
            usuario: m.usuario,
            observacao: m.observacao ?? undefined,
          }));

          set({ produtos, estoque, movimentacoes });
        } catch (erro) {
          console.error('Erro ao carregar dados do Supabase:', erro);
        }
      },

      receberNaCD: async (linhas: LineItem[], observacao?: string) => {
        const { produtos, estoque, movimentacoes } = get();
        const now = new Date().toISOString();
        const usuario = useAuthStore.getState().user?.email ?? 'sistema';

        const novasMovimentacoes: Movimentacao[] = [];
        const movsParaInserir: Record<string, unknown>[] = [];
        const novoEstoque = estoque.map(e => ({ ...e }));
        const estoqueOps: { produtoId: string; local: Local; quantidade: number; existed: boolean }[] = [];

        for (const linha of linhas) {
          const produto = produtos.find(p => p.id === linha.produtoId);
          if (!produto) {
            throw new Error(`Produto ${linha.produtoId} não encontrado`);
          }

          const movId = `mov-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
          novasMovimentacoes.push({
            id: movId,
            tipo: 'entrada_cd',
            produtoId: linha.produtoId,
            quantidade: linha.quantidade,
            de: null,
            para: 'CD',
            data: now,
            usuario,
            observacao,
          });
          movsParaInserir.push({
            id: movId,
            tipo: 'entrada_cd',
            produto_id: linha.produtoId,
            quantidade: linha.quantidade,
            de: null,
            para: 'CD',
            data: now,
            usuario,
            observacao: observacao ?? null,
          });

          const estoqueIdx = novoEstoque.findIndex(
            e => e.produtoId === linha.produtoId && e.local === 'CD'
          );
          if (estoqueIdx >= 0) {
            novoEstoque[estoqueIdx].quantidade += linha.quantidade;
            estoqueOps.push({ produtoId: linha.produtoId, local: 'CD', quantidade: novoEstoque[estoqueIdx].quantidade, existed: true });
          } else {
            novoEstoque.push({
              produtoId: linha.produtoId,
              local: 'CD',
              quantidade: linha.quantidade,
            });
            estoqueOps.push({ produtoId: linha.produtoId, local: 'CD', quantidade: linha.quantidade, existed: false });
          }
        }

        const movInsert = await supabase.from('movimentacoes').insert(movsParaInserir);
        if (movInsert.error) {
          throw new Error(movInsert.error.message || 'Erro ao registrar movimentações no banco.');
        }

        for (const op of estoqueOps) {
          if (op.existed) {
            const upd = await supabase
              .from('estoque')
              .update({ quantidade: op.quantidade, updated_at: now })
              .eq('produto_id', op.produtoId)
              .eq('local', op.local);
            if (upd.error) throw new Error(upd.error.message || 'Erro ao atualizar estoque.');
          } else {
            const ins = await supabase
              .from('estoque')
              .insert([{ produto_id: op.produtoId, local: op.local, quantidade: op.quantidade }]);
            if (ins.error) throw new Error(ins.error.message || 'Erro ao inserir estoque.');
          }
        }

        set({
          estoque: novoEstoque,
          movimentacoes: [...novasMovimentacoes, ...movimentacoes],
        });
      },

      transferirParaQuiosque: async (para: Local, linhas: LineItem[], observacao?: string) => {
        const { produtos, estoque } = get();
        const usuario = useAuthStore.getState().user?.email ?? 'sistema';

        for (const linha of linhas) {
          const produto = produtos.find(p => p.id === linha.produtoId);
          if (!produto) {
            throw new Error(`Produto ${linha.produtoId} não encontrado`);
          }

          const estoqueCD = estoque.find(e => e.produtoId === linha.produtoId && e.local === 'CD');
          if (!estoqueCD || estoqueCD.quantidade < linha.quantidade) {
            throw new Error(
              `Estoque insuficiente em CD para ${produto.nome}: ${estoqueCD?.quantidade || 0} disponível, ${linha.quantidade} solicitado`
            );
          }
        }

        const now = new Date().toISOString();
        const novasMovimentacoes: Movimentacao[] = [];
        const movsParaInserir: Record<string, unknown>[] = [];
        const novoEstoque = estoque.map(e => ({ ...e }));
        const estoqueOps: { produtoId: string; local: Local; quantidade: number; existed: boolean }[] = [];

        for (const linha of linhas) {
          const movId = `mov-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
          novasMovimentacoes.push({
            id: movId,
            tipo: 'transferencia',
            produtoId: linha.produtoId,
            quantidade: linha.quantidade,
            de: 'CD',
            para,
            data: now,
            usuario,
            observacao,
          });
          movsParaInserir.push({
            id: movId,
            tipo: 'transferencia',
            produto_id: linha.produtoId,
            quantidade: linha.quantidade,
            de: 'CD',
            para,
            data: now,
            usuario,
            observacao: observacao ?? null,
          });

          const cdIdx = novoEstoque.findIndex(e => e.produtoId === linha.produtoId && e.local === 'CD');
          if (cdIdx >= 0) {
            novoEstoque[cdIdx].quantidade -= linha.quantidade;
            estoqueOps.push({ produtoId: linha.produtoId, local: 'CD', quantidade: novoEstoque[cdIdx].quantidade, existed: true });
          }

          const dstIdx = novoEstoque.findIndex(e => e.produtoId === linha.produtoId && e.local === para);
          if (dstIdx >= 0) {
            novoEstoque[dstIdx].quantidade += linha.quantidade;
            estoqueOps.push({ produtoId: linha.produtoId, local: para, quantidade: novoEstoque[dstIdx].quantidade, existed: true });
          } else {
            novoEstoque.push({
              produtoId: linha.produtoId,
              local: para,
              quantidade: linha.quantidade,
            });
            estoqueOps.push({ produtoId: linha.produtoId, local: para, quantidade: linha.quantidade, existed: false });
          }
        }

        const movInsert = await supabase.from('movimentacoes').insert(movsParaInserir);
        if (movInsert.error) {
          throw new Error(movInsert.error.message || 'Erro ao registrar movimentações no banco.');
        }

        for (const op of estoqueOps) {
          if (op.existed) {
            const upd = await supabase
              .from('estoque')
              .update({ quantidade: op.quantidade, updated_at: now })
              .eq('produto_id', op.produtoId)
              .eq('local', op.local);
            if (upd.error) throw new Error(upd.error.message || 'Erro ao atualizar estoque.');
          } else {
            const ins = await supabase
              .from('estoque')
              .insert([{ produto_id: op.produtoId, local: op.local, quantidade: op.quantidade }]);
            if (ins.error) throw new Error(ins.error.message || 'Erro ao inserir estoque.');
          }
        }

        set(state => ({
          estoque: novoEstoque,
          movimentacoes: [...novasMovimentacoes, ...state.movimentacoes],
        }));
      },

      adicionarProduto: async (dados: Omit<Produto, 'id' | 'ativo' | 'criadoEm'>) => {
        const codigo = dados.codigo.trim();
        const nome = dados.nome.trim();

        const { produtos } = get();
        if (produtos.some(p => p.codigo.toLowerCase() === codigo.toLowerCase() && p.ativo)) {
          throw new Error(`Já existe um produto ativo com o código "${codigo}".`);
        }

        const novoId = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

        const { data, error } = await supabase
          .from('produtos')
          .insert([{
            id: novoId,
            codigo,
            nome,
            categoria: dados.categoria,
            unidade: dados.unidade,
            estoque_minimo: dados.estoqueMinimo,
            ativo: true,
          }])
          .select()
          .single();

        if (error) {
          throw new Error(error.message || 'Erro ao salvar produto no banco.');
        }

        const novoProduto: Produto = {
          id: data.id,
          codigo: data.codigo,
          nome: data.nome,
          categoria: data.categoria,
          unidade: data.unidade,
          estoqueMinimo: data.estoque_minimo ?? 0,
          ativo: data.ativo ?? true,
          criadoEm: data.criado_em ?? data.created_at ?? new Date().toISOString(),
        };

        set(state => ({
          produtos: [...state.produtos, novoProduto],
        }));
      },

      editarProduto: async (id: string, dados: Partial<Omit<Produto, 'id' | 'criadoEm'>>) => {
        const patch: Record<string, unknown> = {};
        if (dados.codigo !== undefined) patch.codigo = dados.codigo.trim();
        if (dados.nome !== undefined) patch.nome = dados.nome.trim();
        if (dados.categoria !== undefined) patch.categoria = dados.categoria;
        if (dados.unidade !== undefined) patch.unidade = dados.unidade;
        if (dados.estoqueMinimo !== undefined) patch.estoque_minimo = dados.estoqueMinimo;
        if (dados.ativo !== undefined) patch.ativo = dados.ativo;

        const { error } = await supabase
          .from('produtos')
          .update(patch)
          .eq('id', id);

        if (error) {
          throw new Error(error.message || 'Erro ao atualizar produto no banco.');
        }

        set(state => ({
          produtos: state.produtos.map(p =>
            p.id === id ? { ...p, ...dados } : p
          ),
        }));
      },

      ajustarEstoque: async (produtoId: string, local: Local, quantidade: number) => {
        if (quantidade < 0) {
          throw new Error('Quantidade não pode ser negativa.');
        }

        const { estoque } = get();
        const existed = estoque.some(e => e.produtoId === produtoId && e.local === local);
        const now = new Date().toISOString();

        if (existed) {
          const { error } = await supabase
            .from('estoque')
            .update({ quantidade, updated_at: now })
            .eq('produto_id', produtoId)
            .eq('local', local);
          if (error) throw new Error(error.message || 'Erro ao atualizar estoque.');
        } else {
          const { error } = await supabase
            .from('estoque')
            .insert([{ produto_id: produtoId, local, quantidade }]);
          if (error) throw new Error(error.message || 'Erro ao inserir estoque.');
        }

        set(state => ({
          estoque: existed
            ? state.estoque.map(e =>
                e.produtoId === produtoId && e.local === local
                  ? { ...e, quantidade }
                  : e
              )
            : [...state.estoque, { produtoId, local, quantidade }],
        }));
      },
    }),
    {
      name: 'wms-bobs-v1',
    }
  )
);
