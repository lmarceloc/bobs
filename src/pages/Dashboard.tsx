import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useWmsStore } from '../store/wmsStore';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import styles from './Dashboard.module.css';

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

interface ActivityItem {
  id: string;
  tipo: string;
  produtoCodigo: string;
  produtoNome: string;
  quantidade: number;
  de: string | null;
  para: string;
  data: string;
  usuario: string;
}

export function Dashboard() {
  const produtos = useWmsStore(s => s.produtos);
  const estoque = useWmsStore(s => s.estoque);
  const movimentacoes = useWmsStore(s => s.movimentacoes);

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

  const recentActivity = useMemo((): ActivityItem[] => {
    return movimentacoes
      .slice()
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 10)
      .map(mov => {
        const produto = produtos.find(p => p.id === mov.produtoId);
        return {
          id: mov.id,
          tipo: mov.tipo === 'entrada_cd' ? 'Entrada CD' : 'Transferência',
          produtoCodigo: produto?.codigo ?? '—',
          produtoNome: produto?.nome ?? '—',
          quantidade: mov.quantidade,
          de: mov.de,
          para: mov.para,
          data: mov.data,
          usuario: mov.usuario,
        };
      });
  }, [movimentacoes, produtos]);

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
              data={alertas}
            />
          )}
        </section>

        <section className={styles.section}>
          <h2>Atividades Recentes</h2>
          <DataTable<ActivityItem>
            columns={[
              { key: 'tipo', label: 'Tipo' },
              { key: 'produtoCodigo', label: 'Código', className: 'mono' },
              { key: 'produtoNome', label: 'Produto' },
              {
                key: 'quantidade',
                label: 'Quantidade',
                className: 'mono',
                align: 'right',
              },
              {
                key: 'de',
                label: 'Origem',
                render: (item) => item.de ?? '—',
              },
              { key: 'para', label: 'Destino' },
              {
                key: 'data',
                label: 'Data',
                className: 'mono',
                render: (item) => format(parseISO(item.data), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
              },
              { key: 'usuario', label: 'Usuário' },
            ]}
            data={recentActivity}
          />
        </section>
      </div>
    </div>
  );
}
