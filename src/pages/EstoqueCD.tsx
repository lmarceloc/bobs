import { useMemo, useState } from 'react';
import { useWmsStore } from '../store/wmsStore';
import { UNIDADE_LABELS, type Unidade } from '../types';
import { Header } from '../components/layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import styles from './EstoqueCD.module.css';

interface EstoqueItem {
  id: string;
  produtoId: string;
  codigo: string;
  nome: string;
  categoria: 'seco' | 'molhado';
  unidade: string;
  quantidade: number;
  estoqueMinimo: number;
  status: 'ok' | 'baixo' | 'critico';
}

export function EstoqueCD() {
  const [filtro, setFiltro] = useState<'todos' | 'seco' | 'molhado'>('todos');
  const produtos = useWmsStore(s => s.produtos);
  const estoque = useWmsStore(s => s.estoque);

  const items = useMemo((): EstoqueItem[] => {
    return produtos
      .filter(p => p.ativo)
      .map(p => {
        const estoqueCD = estoque.find(e => e.produtoId === p.id && e.local === 'CD');
        const quantidade = estoqueCD?.quantidade ?? 0;
        let status: 'ok' | 'baixo' | 'critico' = 'ok';
        if (quantidade === 0) status = 'critico';
        else if (quantidade <= p.estoqueMinimo) status = 'baixo';

        return {
          id: p.id,
          produtoId: p.id,
          codigo: p.codigo,
          nome: p.nome,
          categoria: p.categoria,
          unidade: p.unidade,
          quantidade,
          estoqueMinimo: p.estoqueMinimo,
          status,
        };
      })
      .filter(item => {
        if (filtro === 'todos') return true;
        return item.categoria === filtro;
      })
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [produtos, estoque, filtro]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      secos: items.filter(i => i.categoria === 'seco').length,
      molhados: items.filter(i => i.categoria === 'molhado').length,
      criticos: items.filter(i => i.status === 'critico').length,
      baixos: items.filter(i => i.status === 'baixo').length,
    };
  }, [items]);

  const getStatusBadge = (status: 'ok' | 'baixo' | 'critico') => {
    const variantMap = { ok: 'success', baixo: 'danger', critico: 'danger' } as const;
    const labelMap = { ok: 'OK', baixo: 'Baixo', critico: 'Crítico' } as const;
    return <Badge variant={variantMap[status]}>{labelMap[status]}</Badge>;
  };

  return (
    <div className={styles.page}>
      <Header
        title="Estoque CD"
        subtitle={`${items.length} produtos | ${stats.molhados} molhados, ${stats.secos} secos`}
      />
      <div className={styles.content}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Filtrar por:</label>
            <div className={styles.buttonGroup}>
              {(['todos', 'seco', 'molhado'] as const).map(opt => (
                <button
                  key={opt}
                  className={`${styles.filterBtn} ${filtro === opt ? styles.active : ''}`}
                  onClick={() => setFiltro(opt)}
                >
                  {opt === 'todos' ? 'Todos' : opt === 'seco' ? 'Secos' : 'Molhados'}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.alerts}>
            {stats.criticos > 0 && (
              <span className={styles.alertBadge} style={{ backgroundColor: 'var(--danger)' }}>
                {stats.criticos} Críticos
              </span>
            )}
            {stats.baixos > 0 && (
              <span className={styles.alertBadge} style={{ backgroundColor: 'var(--danger)' }}>
                {stats.baixos} Baixos
              </span>
            )}
          </div>
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
                key: 'estoqueMinimo',
                label: 'Mínimo',
                className: 'mono',
                align: 'right',
                width: '80px',
                render: item => String(item.estoqueMinimo),
              },
              {
                key: 'status',
                label: 'Status',
                width: '100px',
                render: item => getStatusBadge(item.status),
              },
            ]}
            data={items}
          />
        </div>
      </div>
    </div>
  );
}
