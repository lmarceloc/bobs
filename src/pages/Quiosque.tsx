import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useWmsStore } from '../store/wmsStore';
import { UNIDADE_LABELS, type Unidade } from '../types';
import { Header } from '../components/layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import styles from './Quiosque.module.css';

interface EstoqueItem {
  id: string;
  produtoId: string;
  codigo: string;
  nome: string;
  categoria: 'seco' | 'molhado';
  unidade: string;
  quantidade: number;
  ultimaEntrada: string | null;
}

const KIOSQUES = [
  { slug: 'mariano', nome: 'Mariano' },
  { slug: 'chapada', nome: 'Chapada' },
  { slug: 'mufatto', nome: 'Mufatto' },
  { slug: 'oficinas', nome: 'Oficinas' },
] as const;

const SLUG_MAP: Record<string, typeof KIOSQUES[number]['nome']> = {
  mariano: 'Mariano',
  chapada: 'Chapada',
  mufatto: 'Mufatto',
  oficinas: 'Oficinas',
};

export function Quiosque() {
  const { slug = 'mariano' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const produtos = useWmsStore(s => s.produtos);
  const estoque = useWmsStore(s => s.estoque);
  const movimentacoes = useWmsStore(s => s.movimentacoes);

  const localName = (SLUG_MAP[slug] || 'Mariano') as typeof KIOSQUES[number]['nome'];

  const ultimaEntradaPorProduto = useMemo(() => {
    const map = new Map<string, string>();
    movimentacoes
      .filter(m => m.tipo === 'transferencia' && m.para === localName)
      .forEach(m => {
        const existente = map.get(m.produtoId);
        if (!existente || new Date(m.data) > new Date(existente)) {
          map.set(m.produtoId, m.data);
        }
      });
    return map;
  }, [movimentacoes, localName]);

  const items = useMemo((): EstoqueItem[] => {
    return produtos
      .filter(p => p.ativo)
      .map(p => {
        const estoqueKiosk = estoque.find(e => e.produtoId === p.id && e.local === localName);
        return {
          id: p.id,
          produtoId: p.id,
          codigo: p.codigo,
          nome: p.nome,
          categoria: p.categoria,
          unidade: p.unidade,
          quantidade: estoqueKiosk?.quantidade ?? 0,
          ultimaEntrada: ultimaEntradaPorProduto.get(p.id) ?? null,
        };
      })
      .filter(item => item.quantidade > 0)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [produtos, estoque, localName, ultimaEntradaPorProduto]);

  const stats = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.quantidade, 0);
    const secos = items.filter(i => i.categoria === 'seco').reduce((sum, i) => sum + i.quantidade, 0);
    const molhados = items.filter(i => i.categoria === 'molhado').reduce((sum, i) => sum + i.quantidade, 0);
    return { total, secos, molhados };
  }, [items]);

  return (
    <div className={styles.page}>
      <Header
        title={`Quiosque ${localName}`}
        subtitle={`${stats.total} unidades | ${stats.secos} secos, ${stats.molhados} molhados`}
      />
      <div className={styles.content}>
        <div className={styles.tabs}>
          {KIOSQUES.map(k => (
            <button
              key={k.slug}
              className={`${styles.tab} ${slug === k.slug ? styles.active : ''}`}
              onClick={() => navigate(`/quiosque/${k.slug}`)}
            >
              {k.nome}
            </button>
          ))}
        </div>

        <div className={styles.tableContainer}>
          <DataTable<EstoqueItem>
            columns={[
              { key: 'codigo', label: 'Código', className: 'mono', width: '100px' },
              { key: 'nome', label: 'Produto' },
              {
                key: 'categoria',
                label: 'Categoria',
                width: '100px',
                render: item => (
                  <Badge variant={item.categoria === 'seco' ? 'default' : 'info'}>
                    {item.categoria}
                  </Badge>
                ),
              },
              {
                key: 'unidade',
                label: 'Unidade',
                width: '110px',
                render: item => UNIDADE_LABELS[item.unidade as Unidade] ?? item.unidade,
              },
              {
                key: 'quantidade',
                label: 'Quantidade',
                className: 'mono',
                align: 'right',
                width: '100px',
                render: item => String(item.quantidade),
              },
              {
                key: 'ultimaEntrada',
                label: 'Data',
                className: 'mono',
                width: '200px',
                render: item =>
                  item.ultimaEntrada
                    ? format(parseISO(item.ultimaEntrada), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                    : '—',
              },
            ]}
            data={items}
          />
        </div>
      </div>
    </div>
  );
}
