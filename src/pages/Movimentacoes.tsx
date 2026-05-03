import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useWmsStore } from '../store/wmsStore';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import styles from './Movimentacoes.module.css';

interface MovimentacaoDisplay {
  id: string;
  tipo: 'entrada_cd' | 'transferencia';
  produtoCodigo: string;
  produtoNome: string;
  quantidade: number;
  de: string | null;
  para: string;
  data: string;
  usuario: string;
  observacao?: string;
}

export function Movimentacoes() {
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada_cd' | 'transferencia'>('todos');
  const produtos = useWmsStore(s => s.produtos);
  const movimentacoes = useWmsStore(s => s.movimentacoes);

  const movimentacoesDisplay = useMemo((): MovimentacaoDisplay[] => {
    return movimentacoes
      .map(mov => {
        const produto = produtos.find(p => p.id === mov.produtoId);
        return {
          id: mov.id,
          tipo: mov.tipo,
          produtoCodigo: produto?.codigo ?? '—',
          produtoNome: produto?.nome ?? '—',
          quantidade: mov.quantidade,
          de: mov.de,
          para: mov.para,
          data: mov.data,
          usuario: mov.usuario,
          observacao: mov.observacao,
        };
      })
      .filter(mov => {
        if (filtroTipo === 'todos') return true;
        return mov.tipo === filtroTipo;
      })
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [movimentacoes, produtos, filtroTipo]);

  const stats = useMemo(() => {
    return {
      total: movimentacoesDisplay.length,
      entradas: movimentacoesDisplay.filter(m => m.tipo === 'entrada_cd').length,
      transferencias: movimentacoesDisplay.filter(m => m.tipo === 'transferencia').length,
    };
  }, [movimentacoesDisplay]);

  const exportCSV = () => {
    const headers = ['Data', 'Tipo', 'Código Produto', 'Produto', 'Quantidade', 'De', 'Para', 'Usuário', 'Observação'];
    const rows = movimentacoesDisplay.map(mov => [
      format(parseISO(mov.data), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      mov.tipo === 'entrada_cd' ? 'Entrada CD' : 'Transferência',
      mov.produtoCodigo,
      mov.produtoNome,
      mov.quantidade.toString(),
      mov.de ?? '—',
      mov.para,
      mov.usuario,
      mov.observacao ?? '',
    ]);

    const csv = [
      '﻿', // BOM for UTF-8
      headers.map(h => `"${h}"`).join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `movimentacoes_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.page}>
      <Header
        title="Movimentações"
        subtitle={`${stats.total} registro(s) | ${stats.entradas} entradas, ${stats.transferencias} transferências`}
      />
      <div className={styles.content}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Filtrar por:</label>
            <div className={styles.buttonGroup}>
              {(['todos', 'entrada_cd', 'transferencia'] as const).map(opt => (
                <button
                  key={opt}
                  className={`${styles.filterBtn} ${filtroTipo === opt ? styles.active : ''}`}
                  onClick={() => setFiltroTipo(opt)}
                >
                  {opt === 'todos' ? 'Todos' : opt === 'entrada_cd' ? 'Entradas CD' : 'Transferências'}
                </button>
              ))}
            </div>
          </div>
          <Button variant="secondary" onClick={exportCSV}>
            📥 Exportar CSV
          </Button>
        </div>

        <div className={styles.tableContainer}>
          {movimentacoesDisplay.length === 0 ? (
            <div className={styles.empty}>
              <p>Nenhuma movimentação registrada.</p>
            </div>
          ) : (
            <DataTable<MovimentacaoDisplay>
              columns={[
                {
                  key: 'data',
                  label: 'Data',
                  className: 'mono',
                  width: '160px',
                  render: item => format(parseISO(item.data), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
                },
                {
                  key: 'tipo',
                  label: 'Tipo',
                  width: '120px',
                  render: item => (
                    <Badge variant={item.tipo === 'entrada_cd' ? 'success' : 'info'}>
                      {item.tipo === 'entrada_cd' ? 'Entrada CD' : 'Transferência'}
                    </Badge>
                  ),
                },
                { key: 'produtoCodigo', label: 'Código', className: 'mono', width: '100px' },
                { key: 'produtoNome', label: 'Produto' },
                {
                  key: 'quantidade',
                  label: 'Quantidade',
                  className: 'mono',
                  align: 'right',
                  width: '100px',
                },
                {
                  key: 'de',
                  label: 'Origem',
                  width: '100px',
                  render: item => item.de ?? '—',
                },
                {
                  key: 'para',
                  label: 'Destino',
                  width: '100px',
                },
                { key: 'usuario', label: 'Usuário', width: '100px' },
                {
                  key: 'observacao',
                  label: 'Observação',
                  render: item => item.observacao ? (
                    <span title={item.observacao} className={styles.obsPreview}>
                      {item.observacao.substring(0, 30)}...
                    </span>
                  ) : '—',
                },
              ]}
              data={movimentacoesDisplay}
            />
          )}
        </div>
      </div>
    </div>
  );
}
