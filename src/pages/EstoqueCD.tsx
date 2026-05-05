import { useMemo, useState, useEffect, useRef } from 'react';
import { useWmsStore } from '../store/wmsStore';
import { UNIDADE_LABELS, UNIDADES, CATEGORIAS, type Unidade, type Categoria } from '../types';
import { Header } from '../components/layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import styles from './EstoqueCD.module.css';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

interface EstoqueItem {
  id: string;
  produtoId: string;
  codigo: string;
  nome: string;
  categoria: Categoria;
  unidade: Unidade;
  quantidade: number;
  estoqueMinimo: number;
  status: 'ok' | 'baixo' | 'critico';
}

interface EditForm {
  categoria: Categoria;
  unidade: Unidade;
  quantidade: number;
  estoqueMinimo: number;
}

export function EstoqueCD() {
  const [filtro, setFiltro] = useState<'todos' | 'seco' | 'molhado'>('todos');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'critico' | 'baixo'>('todos');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EstoqueItem | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    categoria: 'seco',
    unidade: 'cx',
    quantidade: 0,
    estoqueMinimo: 0,
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const produtos = useWmsStore(s => s.produtos);
  const estoque = useWmsStore(s => s.estoque);
  const editarProduto = useWmsStore(s => s.editarProduto);
  const ajustarEstoque = useWmsStore(s => s.ajustarEstoque);

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

  useEffect(() => {
    if (!menuOpenId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenId]);

  const openEditModal = (item: EstoqueItem) => {
    setEditingItem(item);
    setEditForm({
      categoria: item.categoria,
      unidade: item.unidade,
      quantidade: item.quantidade,
      estoqueMinimo: item.estoqueMinimo,
    });
    setErrorMsg('');
    setMenuOpenId(null);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setErrorMsg('');

    if (editForm.quantidade < 0 || editForm.estoqueMinimo < 0) {
      setErrorMsg('Quantidade e mínimo não podem ser negativos.');
      return;
    }

    setSaving(true);
    try {
      const produtoChanged =
        editForm.categoria !== editingItem.categoria ||
        editForm.unidade !== editingItem.unidade ||
        editForm.estoqueMinimo !== editingItem.estoqueMinimo;

      if (produtoChanged) {
        await editarProduto(editingItem.produtoId, {
          categoria: editForm.categoria,
          unidade: editForm.unidade,
          estoqueMinimo: editForm.estoqueMinimo,
        });
      }

      if (editForm.quantidade !== editingItem.quantidade) {
        await ajustarEstoque(editingItem.produtoId, 'CD', editForm.quantidade);
      }

      closeEditModal();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

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
                render: item => UNIDADE_LABELS[item.unidade] ?? item.unidade,
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
              {
                key: 'id',
                label: 'Ação',
                width: '70px',
                align: 'center',
                render: item => (
                  <div className={styles.actionCell}>
                    <button
                      type="button"
                      className={styles.actionTrigger}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === item.id ? null : item.id);
                      }}
                      aria-label="Abrir menu de ações"
                      aria-haspopup="menu"
                      aria-expanded={menuOpenId === item.id}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="5" r="1.8" />
                        <circle cx="12" cy="12" r="1.8" />
                        <circle cx="12" cy="19" r="1.8" />
                      </svg>
                    </button>
                    {menuOpenId === item.id && (
                      <div ref={menuRef} className={styles.actionMenu} role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          className={styles.actionMenuItem}
                          onClick={() => openEditModal(item)}
                        >
                          Editar
                        </button>
                      </div>
                    )}
                  </div>
                ),
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

      {editingItem && (
        <Modal
          isOpen={editingItem !== null}
          title={`Editar ${editingItem.codigo} — ${editingItem.nome}`}
          onClose={closeEditModal}
        >
          <form onSubmit={handleSubmit} className={styles.editForm}>
            {errorMsg && <div className={styles.editError}>{errorMsg}</div>}

            <div className={styles.editTwoCol}>
              <div className={styles.editFormGroup}>
                <label htmlFor="edit-categoria">Categoria</label>
                <select
                  id="edit-categoria"
                  value={editForm.categoria}
                  onChange={(e) =>
                    setEditForm({ ...editForm, categoria: e.target.value as Categoria })
                  }
                  className={styles.editInput}
                >
                  {CATEGORIAS.map(c => (
                    <option key={c} value={c}>
                      {c === 'seco' ? 'Seco' : 'Molhado'}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.editFormGroup}>
                <label htmlFor="edit-unidade">Unidade</label>
                <select
                  id="edit-unidade"
                  value={editForm.unidade}
                  onChange={(e) =>
                    setEditForm({ ...editForm, unidade: e.target.value as Unidade })
                  }
                  className={styles.editInput}
                >
                  {UNIDADES.map(u => (
                    <option key={u} value={u}>
                      {UNIDADE_LABELS[u]} ({u})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.editTwoCol}>
              <div className={styles.editFormGroup}>
                <label htmlFor="edit-quantidade">Quantidade</label>
                <input
                  id="edit-quantidade"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={editForm.quantidade === 0 ? '' : String(editForm.quantidade)}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '');
                    setEditForm({ ...editForm, quantidade: v === '' ? 0 : parseInt(v, 10) });
                  }}
                  placeholder="0"
                  className={styles.editInput}
                />
              </div>

              <div className={styles.editFormGroup}>
                <label htmlFor="edit-minimo">Mínimo</label>
                <input
                  id="edit-minimo"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={editForm.estoqueMinimo === 0 ? '' : String(editForm.estoqueMinimo)}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '');
                    setEditForm({ ...editForm, estoqueMinimo: v === '' ? 0 : parseInt(v, 10) });
                  }}
                  placeholder="0"
                  className={styles.editInput}
                />
              </div>
            </div>

            <div className={styles.editActions}>
              <Button
                variant="secondary"
                type="button"
                onClick={closeEditModal}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
