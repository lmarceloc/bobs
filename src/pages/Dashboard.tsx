import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useWmsStore } from '../store/wmsStore';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import styles from './Dashboard.module.css';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

interface AlertItem {
  id: string;
  produtoId: string;
  codigo: string;
  nome: string;
  categoria: 'seco' | 'molhado';
  estoqueMinimo: number;
  estoqueAtual: number;
  diferenca: number;
}

export function Dashboard() {
  const produtos = useWmsStore(s => s.produtos);
  const estoque = useWmsStore(s => s.estoque);

  const stats = useMemo(() => {
    const totalProdutos = produtos.filter(p => p.ativo).length;
    const secoCount = produtos.filter(p => p.ativo && p.categoria === 'seco').length;
    const molhadoCount = produtos.filter(p => p.ativo && p.categoria === 'molhado').length;

    return {
      totalProdutos,
      secoCount,
      molhadoCount,
    };
  }, [produtos]);

  const alertas = useMemo((): AlertItem[] => {
    return produtos
      .filter(p => p.ativo)
      .map(p => {
        const estoqueCD = estoque.find(e => e.produtoId === p.id && e.local === 'CD');
        const estoqueAtual = estoqueCD?.quantidade ?? 0;
        return {
          id: p.id,
          produtoId: p.id,
          codigo: p.codigo,
          nome: p.nome,
          categoria: p.categoria,
          estoqueMinimo: p.estoqueMinimo,
          estoqueAtual,
          diferenca: estoqueAtual - p.estoqueMinimo,
        };
      })
      .filter(item => item.estoqueAtual <= item.estoqueMinimo)
      .sort((a, b) => a.diferenca - b.diferenca);
  }, [produtos, estoque]);

  const [alertasPageSize, setAlertasPageSize] = useState<number>(10);
  const [alertasPage, setAlertasPage] = useState(1);
  const alertasTotalPages = Math.max(1, Math.ceil(alertas.length / alertasPageSize));
  useEffect(() => {
    if (alertasPage > alertasTotalPages) setAlertasPage(alertasTotalPages);
  }, [alertasPage, alertasTotalPages]);
  const alertasPaginados = useMemo(() => {
    const start = (alertasPage - 1) * alertasPageSize;
    return alertas.slice(start, start + alertasPageSize);
  }, [alertas, alertasPage, alertasPageSize]);
  const alertasStart = alertas.length === 0 ? 0 : (alertasPage - 1) * alertasPageSize + 1;
  const alertasEnd = Math.min(alertasPage * alertasPageSize, alertas.length);

  return (
    <div className={styles.dashboard}>
      <Header
        title="Dashboard"
        subtitle={`Atualizado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`}
      />
      <div className={styles.content}>
        <section className={styles.stats}>
          <StatCard
            label="Total de Produtos"
            value={stats.totalProdutos}
          />
          <StatCard
            label="Secos"
            value={stats.secoCount}
          />
          <StatCard
            label="Molhados"
            value={stats.molhadoCount}
          />
        </section>

        <section className={styles.section}>
          <h2>Produtos Abaixo do Estoque Mínimo</h2>
          {alertas.length === 0 ? (
            <p className={styles.empty}>Todos os produtos estão com estoque adequado.</p>
          ) : (
            <>
              <DataTable<AlertItem>
                columns={[
                  { key: 'codigo', label: 'Código', className: 'mono', align: 'center' },
                  { key: 'nome', label: 'Produto', align: 'center' },
                  {
                    key: 'categoria',
                    label: 'Categoria',
                    align: 'center',
                    render: (item) => (
                      <Badge variant={item.categoria === 'seco' ? 'default' : 'info'}>
                        {item.categoria}
                      </Badge>
                    ),
                  },
                  {
                    key: 'estoqueAtual',
                    label: 'Estoque Atual',
                    className: 'mono',
                    align: 'center',
                  },
                  {
                    key: 'estoqueMinimo',
                    label: 'Mínimo',
                    className: 'mono',
                    align: 'center',
                  },
                  {
                    key: 'diferenca',
                    label: 'Diferença',
                    className: 'mono',
                    align: 'center',
                    render: (item) => (
                      <Badge variant="danger">
                        {item.diferenca}
                      </Badge>
                    ),
                  },
                ]}
                data={alertasPaginados}
              />

              <div className={styles.pagination}>
                <div className={styles.pageSize}>
                  <label htmlFor="alertasPageSize">Itens por página:</label>
                  <select
                    id="alertasPageSize"
                    value={alertasPageSize}
                    onChange={(e) => {
                      setAlertasPageSize(Number(e.target.value));
                      setAlertasPage(1);
                    }}
                    className={styles.pageSizeSelect}
                  >
                    {PAGE_SIZE_OPTIONS.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.pageInfo}>
                  {alertasStart}–{alertasEnd} de {alertas.length}
                </div>

                <div className={styles.pageControls}>
                  <button
                    type="button"
                    onClick={() => setAlertasPage(p => Math.max(1, p - 1))}
                    disabled={alertasPage === 1}
                    className={styles.pageBtn}
                  >
                    Anterior
                  </button>
                  <span className={styles.pageNumber}>
                    Página {alertasPage} de {alertasTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAlertasPage(p => Math.min(alertasTotalPages, p + 1))}
                    disabled={alertasPage === alertasTotalPages}
                    className={styles.pageBtn}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

      </div>
    </div>
  );
}
