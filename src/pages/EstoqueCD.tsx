import { useMemo, useState, useEffect } from 'react';
import { useWmsStore } from '../store/wmsStore';
import { UNIDADE_LABELS, type Unidade } from '../types';
import { Header } from '../components/layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import styles from './EstoqueCD.module.css';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

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
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'critico' | 'baixo'>('todos');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
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

  const itemsFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (statusFiltro !== 'todos' && i.status !== statusFiltro) return false;
      if (q && !i.codigo.toLowerCase().includes(q) && !i.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, statusFiltro]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtro, search, statusFiltro]);

  const totalPages = Math.max(1, Math.ceil(itemsFiltrados.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return itemsFiltrados.slice(start, start + pageSize);
  }, [itemsFiltrados, currentPage, pageSize]);

  const startItem = itemsFiltrados.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, itemsFiltrados.length);

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
          <div className={styles.searchWrapper}>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código ou nome..."
              className={styles.searchInput}
            />
          </div>
          <div className={styles.alerts}>
            {stats.criticos > 0 && (
              <button
                type="button"
                onClick={() => setStatusFiltro(statusFiltro === 'critico' ? 'todos' : 'critico')}
                className={`${styles.alertBadge} ${styles.critico} ${statusFiltro === 'critico' ? styles.alertActive : ''}`}
                aria-pressed={statusFiltro === 'critico'}
                title="Mostrar apenas itens críticos"
              >
                {stats.criticos} Críticos
              </button>
            )}
            {stats.baixos > 0 && (
              <button
                type="button"
                onClick={() => setStatusFiltro(statusFiltro === 'baixo' ? 'todos' : 'baixo')}
                className={`${styles.alertBadge} ${styles.baixo} ${statusFiltro === 'baixo' ? styles.alertActive : ''}`}
                aria-pressed={statusFiltro === 'baixo'}
                title="Mostrar apenas itens baixos"
              >
                {stats.baixos} Baixos
              </button>
            )}
            {statusFiltro !== 'todos' && (
              <button
                type="button"
                onClick={() => setStatusFiltro('todos')}
                className={styles.clearAlert}
                title="Limpar filtro de status"
              >
                ✕ Limpar
              </button>
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
            data={paginatedItems}
          />

          {itemsFiltrados.length > 0 && (
            <div className={styles.pagination}>
              <div className={styles.pageSize}>
                <label htmlFor="pageSize">Itens por página:</label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className={styles.pageSizeSelect}
                >
                  {PAGE_SIZE_OPTIONS.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className={styles.pageInfo}>
                {startItem}–{endItem} de {itemsFiltrados.length}
              </div>

              <div className={styles.pageControls}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={styles.pageBtn}
                >
                  Anterior
                </button>
                <span className={styles.pageNumber}>
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={styles.pageBtn}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
