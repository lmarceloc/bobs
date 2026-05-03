import { useState, useMemo } from 'react';
import { useWmsStore } from '../store/wmsStore';
import { UNIDADE_LABELS, type Unidade } from '../types';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import styles from './Produtos.module.css';

interface ProdutoForm {
  codigo: string;
  nome: string;
  categoria: 'seco' | 'molhado';
  unidade: 'cx' | 'bag' | 'un' | 'lt' | 'kg';
  estoqueMinimo: number;
}

interface ProdutoDisplay {
  id: string;
  codigo: string;
  nome: string;
  categoria: 'seco' | 'molhado';
  unidade: string;
  estoqueMinimo: number;
  ativo: boolean;
}

const UNIDADES = ['cx', 'bag', 'un', 'lt', 'kg'] as const;

export function Produtos() {
  const produtos = useWmsStore(s => s.produtos);
  const adicionarProduto = useWmsStore(s => s.adicionarProduto);
  const editarProduto = useWmsStore(s => s.editarProduto);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProdutoForm>({
    codigo: '',
    nome: '',
    categoria: 'seco',
    unidade: 'cx',
    estoqueMinimo: 10,
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const produtosAtivos = useMemo(() => {
    return produtos
      .filter(p => p.ativo)
      .map(p => ({
        id: p.id,
        codigo: p.codigo,
        nome: p.nome,
        categoria: p.categoria,
        unidade: p.unidade,
        estoqueMinimo: p.estoqueMinimo,
        ativo: p.ativo,
      }))
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [produtos]);

  const openNewModal = () => {
    setEditingId(null);
    setForm({ codigo: '', nome: '', categoria: 'seco', unidade: 'cx', estoqueMinimo: 10 });
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (produto: ProdutoDisplay) => {
    setEditingId(produto.id);
    setForm({
      codigo: produto.codigo,
      nome: produto.nome,
      categoria: produto.categoria,
      unidade: produto.unidade as any,
      estoqueMinimo: produto.estoqueMinimo,
    });
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.codigo.trim() || !form.nome.trim()) {
      setErrorMsg('Código e nome são obrigatórios.');
      return;
    }

    if (form.estoqueMinimo < 0) {
      setErrorMsg('Estoque mínimo não pode ser negativo.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await editarProduto(editingId, form);
      } else {
        await adicionarProduto(form);
      }
      setShowModal(false);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Desativar este produto? O histórico de movimentações será preservado.')) return;
    try {
      await editarProduto(id, { ativo: false });
    } catch (err) {
      alert((err as Error).message || 'Erro ao desativar produto');
    }
  };

  return (
    <div className={styles.page}>
      <Header
        title="Produtos"
        subtitle={`${produtosAtivos.length} produto(s) cadastrado(s)`}
      />
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <Button variant="primary" onClick={openNewModal}>
            + Novo Produto
          </Button>
        </div>

        <div className={styles.tableContainer}>
          <DataTable<ProdutoDisplay>
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
                key: 'estoqueMinimo',
                label: 'Mínimo',
                width: '80px',
                className: 'mono',
                align: 'right',
              },
              {
                key: 'id',
                label: 'Ações',
                width: '140px',
                render: item => (
                  <div className={styles.acoes}>
                    <button
                      onClick={() => openEditModal(item)}
                      className={styles.actionBtn + ' ' + styles.edit}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeactivate(item.id)}
                      className={styles.actionBtn + ' ' + styles.deactivate}
                    >
                      Desativar
                    </button>
                  </div>
                ),
              },
            ]}
            data={produtosAtivos}
          />
        </div>
      </div>

      {showModal && (
        <Modal
          isOpen={showModal}
          title={editingId ? 'Editar Produto' : 'Novo Produto'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className={styles.form}>
            {errorMsg && <div className={styles.error}>{errorMsg}</div>}

            <div className={styles.formGroup}>
              <label htmlFor="codigo">Código</label>
              <input
                id="codigo"
                type="text"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                placeholder="Ex: ARR001"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="nome">Produto</label>
              <input
                id="nome"
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Arroz Integral"
                className={styles.input}
              />
            </div>

            <div className={styles.twoCol}>
              <div className={styles.formGroup}>
                <label htmlFor="categoria">Categoria</label>
                <select
                  id="categoria"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value as 'seco' | 'molhado' })}
                  className={styles.input}
                >
                  <option value="seco">Seco</option>
                  <option value="molhado">Molhado</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="unidade">Unidade</label>
                <select
                  id="unidade"
                  value={form.unidade}
                  onChange={(e) => setForm({ ...form, unidade: e.target.value as any })}
                  className={styles.input}
                >
                  {UNIDADES.map(u => (
                    <option key={u} value={u}>{UNIDADE_LABELS[u]} ({u})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="estoqueMinimo">Estoque Mínimo</label>
              <input
                id="estoqueMinimo"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.estoqueMinimo === 0 ? '' : String(form.estoqueMinimo)}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setForm({ ...form, estoqueMinimo: v === '' ? 0 : parseInt(v, 10) });
                }}
                placeholder="0"
                className={styles.input}
              />
            </div>

            <div className={styles.actions}>
              <Button variant="secondary" type="button" onClick={() => setShowModal(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Produto'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
