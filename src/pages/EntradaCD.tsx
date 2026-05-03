import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWmsStore } from '../store/wmsStore';
import { UNIDADE_LABELS, type Unidade } from '../types';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import styles from './EntradaCD.module.css';

interface LineItem {
  produtoId: string;
  quantidade: number;
}

export function EntradaCD() {
  const navigate = useNavigate();
  const produtos = useWmsStore(s => s.produtos);
  const receberNaCD = useWmsStore(s => s.receberNaCD);

  const [linhas, setLinhas] = useState<LineItem[]>([{ produtoId: '', quantidade: 0 }]);
  const [observacao, setObservacao] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const produtosAtivos = produtos.filter(p => p.ativo);

  const adicionarLinha = () => {
    setLinhas([...linhas, { produtoId: '', quantidade: 0 }]);
  };

  const removerLinha = (idx: number) => {
    setLinhas(linhas.filter((_, i) => i !== idx));
  };

  const atualizarLinha = (idx: number, field: keyof LineItem, value: any) => {
    const novasLinhas = [...linhas];
    novasLinhas[idx] = { ...novasLinhas[idx], [field]: value };
    setLinhas(novasLinhas);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const linhasValidas = linhas.filter(l => l.produtoId && l.quantidade > 0);
    if (linhasValidas.length === 0) {
      setErrorMsg('Adicione pelo menos um produto com quantidade válida.');
      return;
    }

    setLoading(true);
    try {
      await receberNaCD(linhasValidas, observacao);
      setSuccessMsg(`Entrada de ${linhasValidas.length} produto(s) registrada com sucesso!`);
      setLinhas([{ produtoId: '', quantidade: 0 }]);
      setObservacao('');
    } catch (err) {
      setErrorMsg((err as Error).message || 'Erro ao registrar entrada');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Header
        title="Entrada CD"
        subtitle="Registre novos produtos recebidos no centro de distribuição"
      />
      <div className={styles.content}>
        {successMsg && (
          <div className={styles.banner + ' ' + styles.success}>
            <span>✓ {successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className={styles.banner + ' ' + styles.error}>
            <span>✕ {errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <section className={styles.section}>
            <h2>Produtos</h2>
            <div className={styles.linhasContainer}>
              {linhas.map((linha, idx) => (
                <div key={idx} className={styles.linha}>
                  <select
                    value={linha.produtoId}
                    onChange={(e) => atualizarLinha(idx, 'produtoId', e.target.value)}
                    className={styles.select}
                  >
                    <option value="">Selecionar produto...</option>
                    {produtosAtivos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} - {p.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={linha.quantidade === 0 ? '' : String(linha.quantidade)}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '');
                      atualizarLinha(idx, 'quantidade', v === '' ? 0 : parseInt(v, 10));
                    }}
                    placeholder="Quantidade"
                    className={styles.input}
                  />
                  {linha.produtoId && (() => {
                    const u = produtosAtivos.find(p => p.id === linha.produtoId)?.unidade as Unidade | undefined;
                    return u ? <Badge variant="info">{UNIDADE_LABELS[u] ?? u}</Badge> : null;
                  })()}
                  {linhas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerLinha(idx)}
                      className={styles.removeBtn}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="secondary" type="button" onClick={adicionarLinha}>
              + Adicionar Produto
            </Button>
          </section>

          <section className={styles.section}>
            <label className={styles.label}>Observações</label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva os detalhes da entrada (opcional)"
              className={styles.textarea}
              rows={4}
            />
          </section>

          <div className={styles.actions}>
            <Button variant="secondary" type="button" onClick={() => navigate('/estoque-cd')}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Entrada'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
