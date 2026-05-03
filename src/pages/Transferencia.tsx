import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWmsStore } from '../store/wmsStore';
import { UNIDADE_LABELS, type Unidade } from '../types';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import styles from './Transferencia.module.css';

interface LineItem {
  produtoId: string;
  quantidade: number;
}

const KIOSQUES = ['Mariano', 'Chapada', 'Mufatto', 'Oficinas'] as const;
type Kiosk = typeof KIOSQUES[number];

export function Transferencia() {
  const navigate = useNavigate();
  const produtos = useWmsStore(s => s.produtos);
  const estoque = useWmsStore(s => s.estoque);
  const transferirParaQuiosque = useWmsStore(s => s.transferirParaQuiosque);

  const [kiosk, setKiosk] = useState<Kiosk>('Mariano');
  const [linhas, setLinhas] = useState<LineItem[]>([{ produtoId: '', quantidade: 0 }]);
  const [observacao, setObservacao] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const produtosAtivos = produtos.filter(p => p.ativo);

  const estoqueCD = useMemo(() => {
    const map = new Map<string, number>();
    estoque.forEach(e => {
      if (e.local === 'CD') {
        map.set(e.produtoId, e.quantidade);
      }
    });
    return map;
  }, [estoque]);

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

  const validarTransferencia = (): { valid: boolean; msg?: string; linhas?: LineItem[] } => {
    const linhasValidas = linhas.filter(l => l.produtoId && l.quantidade > 0);
    if (linhasValidas.length === 0) return { valid: false, msg: 'Adicione pelo menos um produto com quantidade válida.' };

    for (const linha of linhasValidas) {
      const estoqueAtual = estoqueCD.get(linha.produtoId) ?? 0;
      if (estoqueAtual < linha.quantidade) {
        const produto = produtos.find(p => p.id === linha.produtoId);
        return {
          valid: false,
          msg: `Estoque insuficiente em CD: ${produto?.codigo} (disponível: ${estoqueAtual}, solicitado: ${linha.quantidade})`,
        };
      }
    }

    return { valid: true, linhas: linhasValidas };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const validation = validarTransferencia();
    if (!validation.valid) {
      setErrorMsg(validation.msg || 'Erro na validação');
      return;
    }

    setLoading(true);
    try {
      const transferLinhas = validation.linhas || [];
      await transferirParaQuiosque(kiosk, transferLinhas, observacao);
      setSuccessMsg(`Transferência de ${transferLinhas.length} produto(s) para ${kiosk} registrada!`);
      setLinhas([{ produtoId: '', quantidade: 0 }]);
      setObservacao('');
      setTimeout(() => {
        navigate('/movimentacoes');
      }, 1500);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Erro ao registrar transferência');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Header
        title="Transferência"
        subtitle="Transfira produtos do CD para os quiosques"
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
          <div className={styles.twoCol}>
            <section className={styles.section}>
              <label htmlFor="kiosk" className={styles.label}>Quiosque Destino</label>
              <select
                id="kiosk"
                value={kiosk}
                onChange={(e) => setKiosk(e.target.value as Kiosk)}
                className={styles.select}
              >
                {KIOSQUES.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </section>

            <section className={styles.section}>
              <label className={styles.label}>Estoque no CD</label>
              <div className={styles.cdSummary}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Total CD:</span>
                  <span className={styles.statValue}>
                    {Array.from(estoqueCD.values()).reduce((a, b) => a + b, 0)}
                  </span>
                </div>
              </div>
            </section>
          </div>

          <section className={styles.section}>
            <h2>Produtos para Transferir</h2>
            <div className={styles.linhasContainer}>
              {linhas.map((linha, idx) => {
                const estoqueAtual = linha.produtoId ? (estoqueCD.get(linha.produtoId) ?? 0) : 0;
                const produto = linha.produtoId ? produtos.find(p => p.id === linha.produtoId) : null;
                const temEstoque = estoqueAtual >= linha.quantidade;
                const statusClass = temEstoque ? '' : styles.erro;

                return (
                  <div key={idx} className={`${styles.linha} ${statusClass}`}>
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
                      placeholder="Qtd"
                      className={styles.input}
                    />
                    {produto && (
                      <>
                        <Badge variant="info">{UNIDADE_LABELS[produto.unidade as Unidade] ?? produto.unidade}</Badge>
                        <span className={styles.estoqueInfo} title={`Disponível: ${estoqueAtual}`}>
                          {estoqueAtual} disp.
                        </span>
                      </>
                    )}
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
                );
              })}
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
              placeholder="Descreva os detalhes da transferência (opcional)"
              className={styles.textarea}
              rows={4}
            />
          </section>

          <div className={styles.actions}>
            <Button variant="secondary" type="button" onClick={() => navigate('/estoque-cd')}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Transferindo...' : 'Registrar Transferência'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
