import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from '../services/transactionService';
import type { Transacao, TransacaoComSaldo, NovaTransacao } from '../types/transaction';
import { exportCashbookToPdf } from '../services/pdfExportService';
import {
  roundCurrency,
  formatCurrencyBRL,
  formatDateBR,
  getLocalTodayISO,
  compareTransactionsChronologically,
} from '../utils/formatters';
import { EditTransactionModal } from './EditTransactionModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import {
  Wallet,
  LogOut,
  User,
  Plus,
  Search,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  ArrowUpDown,
  FilterX,
  TrendingUp,
  TrendingDown,
  Coins,
  FileDown,
  CheckSquare,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();

  // Estados dos dados e carregamento
  const [transactions, setTransactions] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados do formulário de novo lançamento
  const todayStr = getLocalTodayISO();
  const [formData, setFormData] = useState<string>(todayStr);
  const [formDescricao, setFormDescricao] = useState<string>('');
  const [formTipo, setFormTipo] = useState<'entrada' | 'saida'>('entrada');
  const [formValor, setFormValor] = useState<string>('');
  const [savingNew, setSavingNew] = useState<boolean>(false);

  // Estados dos Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Estados da Paginação
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 50;

  // Estados de Seleção para Exportação PDF
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Estados dos Modais de Edição e Exclusão
  const [editingTransaction, setEditingTransaction] = useState<Transacao | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [deletingTransaction, setDeletingTransaction] = useState<Transacao | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Inscrição em tempo real no Firestore
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToTransactions(
      user.uid,
      (data) => {
        setTransactions(data);
        setLoading(false);
        setErrorMsg(null);
      },
      (err) => {
        console.error('Erro ao ler transações:', err);
        setErrorMsg(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Deriva apenas os IDs selecionados que continuam existindo na lista ativa
  const activeSelectedIds = useMemo(() => {
    if (selectedIds.size === 0) return selectedIds;
    const validIds = new Set(transactions.map((t) => t.id).filter(Boolean) as string[]);
    const filtered = new Set<string>();
    selectedIds.forEach((id) => {
      if (validIds.has(id)) filtered.add(id);
    });
    return filtered;
  }, [selectedIds, transactions]);

  // =========================================================================
  // LÓGICA DO SALDO AUTOMÁTICO (Running Balance Cronológico Imutável)
  // =========================================================================
  const transactionsWithRunningBalance = useMemo<TransacaoComSaldo[]>(() => {
    const sortedChronologically = [...transactions].sort(compareTransactionsChronologically);

    return sortedChronologically.reduce<{ items: TransacaoComSaldo[]; total: number }>(
      (acc, t) => {
        const entrada = roundCurrency(t.Entrada);
        const saida = roundCurrency(t.Saida);
        const nextTotal = roundCurrency(acc.total + entrada - saida);
        acc.items.push({
          ...t,
          Entrada: entrada,
          Saida: saida,
          saldoAcumulado: nextTotal,
        });
        acc.total = nextTotal;
        return acc;
      },
      { items: [], total: 0 }
    ).items;
  }, [transactions]);

  // =========================================================================
  // FILTRAGEM (Busca por Descrição e Filtro Mês/Ano)
  // =========================================================================
  const filteredTransactions = useMemo(() => {
    let result = transactionsWithRunningBalance;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((t) => t.Descricao.toLowerCase().includes(term));
    }

    if (monthFilter) {
      result = result.filter((t) => (t.Data || '').startsWith(monthFilter));
    }

    const finalDisplay = [...result];
    if (sortOrder === 'desc') {
      finalDisplay.reverse();
    }

    return finalDisplay;
  }, [transactionsWithRunningBalance, searchTerm, monthFilter, sortOrder]);

  // =========================================================================
  // PAGINAÇÃO (50 itens por página)
  // =========================================================================
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, safeCurrentPage, itemsPerPage]);

  // =========================================================================
  // LÓGICA DE SELEÇÃO DE LINHAS (CHECKBOXES)
  // =========================================================================
  const isAllPageSelected = useMemo(() => {
    return (
      paginatedTransactions.length > 0 &&
      paginatedTransactions.every((t) => t.id && activeSelectedIds.has(t.id))
    );
  }, [paginatedTransactions, activeSelectedIds]);

  const isSomePageSelected = useMemo(() => {
    return (
      paginatedTransactions.some((t) => t.id && activeSelectedIds.has(t.id)) &&
      !isAllPageSelected
    );
  }, [paginatedTransactions, activeSelectedIds, isAllPageSelected]);

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isSomePageSelected;
    }
  }, [isSomePageSelected]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        paginatedTransactions.forEach((t) => {
          if (t.id) next.delete(t.id);
        });
      } else {
        paginatedTransactions.forEach((t) => {
          if (t.id) next.add(t.id);
        });
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // =========================================================================
  // EXPORTAÇÃO PARA PDF
  // =========================================================================
  const handleExportPdf = () => {
    if (activeSelectedIds.size === 0) return;
    const selectedItems = transactionsWithRunningBalance.filter(
      (t) => t.id && activeSelectedIds.has(t.id)
    );
    exportCashbookToPdf({
      transactions: selectedItems,
      userEmail: user?.email,
    });
  };

  // Totais Gerais com precisão de centavos
  const totalGeralEntradas = useMemo(() => {
    return roundCurrency(
      transactions.reduce((acc, t) => acc + roundCurrency(t.Entrada), 0)
    );
  }, [transactions]);

  const totalGeralSaidas = useMemo(() => {
    return roundCurrency(
      transactions.reduce((acc, t) => acc + roundCurrency(t.Saida), 0)
    );
  }, [transactions]);

  const saldoAtual = roundCurrency(totalGeralEntradas - totalGeralSaidas);

  // =========================================================================
  // AÇÕES: ADICIONAR NOVO REGISTRO
  // =========================================================================
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);

    const valorNum = roundCurrency(parseFloat(formValor.replace(',', '.')));
    if (isNaN(valorNum) || valorNum <= 0) {
      setErrorMsg('Por favor, informe um valor válido maior que zero.');
      return;
    }

    if (!formDescricao.trim()) {
      setErrorMsg('Por favor, preencha a descrição do lançamento.');
      return;
    }

    try {
      setSavingNew(true);
      const nova: NovaTransacao = {
        Data: formData || todayStr,
        Descricao: formDescricao.trim(),
        Entrada: formTipo === 'entrada' ? valorNum : 0,
        Saida: formTipo === 'saida' ? valorNum : 0,
        userId: user.uid,
      };

      await addTransaction(nova, user.uid);

      setFormDescricao('');
      setFormValor('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar novo registro.';
      setErrorMsg(msg);
    } finally {
      setSavingNew(false);
    }
  };

  // =========================================================================
  // AÇÕES: EDITAR E EXCLUIR
  // =========================================================================
  const handleOpenEdit = (t: Transacao) => {
    setEditingTransaction(t);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (id: string, updatedData: NovaTransacao) => {
    await updateTransaction(id, updatedData);
    setIsEditModalOpen(false);
    setEditingTransaction(null);
  };

  const handleOpenDelete = (t: Transacao) => {
    setDeletingTransaction(t);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTransaction?.id) return;
    try {
      setIsDeleting(true);
      await deleteTransaction(deletingTransaction.id);
      if (selectedIds.has(deletingTransaction.id)) {
        handleToggleSelect(deletingTransaction.id);
      }
      setIsDeleteModalOpen(false);
      setDeletingTransaction(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir registro.';
      setErrorMsg(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="dashboard-minimal">
      {/* Barra Superior Minimalista */}
      <header className="minimal-header">
        <div className="header-brand">
          <div className="brand-logo">
            <Wallet size={20} />
          </div>
          <h2>Livro-Caixa</h2>
        </div>

        <div className="header-user">
          {user?.isDemo && (
            <span className="demo-badge-indicator" title="Executando em modo local de teste">
              Modo Teste / Demonstração
            </span>
          )}
          <div className="user-pill" title={user?.email || ''}>
            <User size={15} />
            <span className="email-truncate">{user?.email}</span>
          </div>
          <button
            onClick={() => signOut()}
            className="btn-icon-minimal"
            title="Encerrar sessão"
          >
            <LogOut size={16} />
            <span className="btn-label-desktop">Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="minimal-container">
        {errorMsg && (
          <div className="minimal-alert danger">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="close-alert-btn">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Resumo Rápido e Discreto */}
        <div className="quick-summary">
          <div className="summary-item">
            <span className="summary-label">
              <TrendingUp size={15} className="text-success inline-icon" /> Entradas
            </span>
            <span className="summary-val text-success">
              {formatCurrencyBRL(totalGeralEntradas)}
            </span>
          </div>

          <div className="summary-separator" />

          <div className="summary-item">
            <span className="summary-label">
              <TrendingDown size={15} className="text-danger inline-icon" /> Saídas
            </span>
            <span className="summary-val text-danger">
              {formatCurrencyBRL(totalGeralSaidas)}
            </span>
          </div>

          <div className="summary-separator" />

          <div className="summary-item">
            <span className="summary-label">
              <Coins size={15} className="text-primary inline-icon" /> Saldo Atual
            </span>
            <span
              className={`summary-val ${saldoAtual >= 0 ? 'text-success' : 'text-danger'}`}
            >
              {formatCurrencyBRL(saldoAtual)}
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* FORMULÁRIO DE INSERÇÃO NO TOPO DA TABELA                          */}
        {/* ================================================================= */}
        <section className="form-card">
          <form onSubmit={handleAddTransaction} className="insert-form">
            <div className="form-field field-date">
              <label>Data</label>
              <input
                type="date"
                value={formData}
                onChange={(e) => setFormData(e.target.value)}
                required
              />
            </div>

            <div className="form-field field-desc">
              <label>Descrição</label>
              <input
                type="text"
                placeholder="Ex: Recebimento de cliente, Conta de luz, Reforma..."
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                required
              />
            </div>

            <div className="form-field field-type">
              <label>Operação</label>
              <div className="type-segmented-control">
                <button
                  type="button"
                  className={`segment-btn ${formTipo === 'entrada' ? 'active-income' : ''}`}
                  onClick={() => setFormTipo('entrada')}
                >
                  Entrada
                </button>
                <button
                  type="button"
                  className={`segment-btn ${formTipo === 'saida' ? 'active-expense' : ''}`}
                  onClick={() => setFormTipo('saida')}
                >
                  Saída
                </button>
              </div>
            </div>

            <div className="form-field field-val">
              <label>Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={formValor}
                onChange={(e) => setFormValor(e.target.value)}
                required
              />
            </div>

            <div className="form-field field-btn">
              <label className="desktop-only">&nbsp;</label>
              <button
                type="submit"
                className="btn btn-primary btn-add"
                disabled={savingNew}
              >
                <Plus size={16} />
                <span>{savingNew ? 'Adicionando...' : 'Adicionar'}</span>
              </button>
            </div>
          </form>
        </section>

        {/* ================================================================= */}
        {/* BARRA DE FILTROS, BUSCA E EXPORTAÇÃO PDF                          */}
        {/* ================================================================= */}
        <div className="table-toolbar">
          <div className="toolbar-left">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar por descrição..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="clear-search-btn"
                  title="Limpar busca"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="month-filter-wrapper">
              <Calendar size={16} className="calendar-icon" />
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  setCurrentPage(1);
                }}
                title="Filtrar por mês/ano"
              />
              {monthFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setMonthFilter('');
                    setCurrentPage(1);
                  }}
                  className="clear-filter-btn"
                  title="Mostrar todos os meses"
                >
                  <FilterX size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="toolbar-right">
            {activeSelectedIds.size > 0 && (
              <div className="selection-actions-group">
                <button
                  type="button"
                  className="btn btn-pdf-export"
                  onClick={handleExportPdf}
                  title="Exportar registros selecionados para PDF no formato livro-caixa"
                >
                  <FileDown size={16} />
                  <span>Exportar Selecionados (PDF) ({activeSelectedIds.size})</span>
                </button>

                <button
                  type="button"
                  className="btn-clear-selection"
                  onClick={handleClearSelection}
                  title="Limpar seleção"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <button
              type="button"
              className="btn-sort-toggle"
              onClick={() => {
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                setCurrentPage(1);
              }}
              title={
                sortOrder === 'desc'
                  ? 'Exibindo lançamentos mais recentes primeiro. Clique para ordenar cronologicamente (antigos primeiro).'
                  : 'Exibindo em ordem cronológica (antigos primeiro). Clique para exibir mais recentes no topo.'
              }
            >
              <ArrowUpDown size={14} />
              <span>{sortOrder === 'desc' ? 'Mais recentes' : 'Mais antigos'}</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TABELA CENTRAL COM COLUNA DE CHECKBOX + 5 COLUNAS + AÇÕES DISCRETAS */}
        {/* ================================================================= */}
        <section className="table-card">
          <div className="table-responsive">
            <table className="cashbook-table">
              <thead>
                <tr>
                  <th className="col-checkbox text-center">
                    <input
                      type="checkbox"
                      ref={selectAllCheckboxRef}
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      title="Selecionar / Desmarcar todos desta página"
                      aria-label="Selecionar todos desta página"
                    />
                  </th>
                  <th className="col-data">Data</th>
                  <th className="col-desc">Descrição</th>
                  <th className="col-money text-right">Entrada</th>
                  <th className="col-money text-right">Saída</th>
                  <th className="col-money text-right">Saldo</th>
                  <th className="col-actions text-center" title="Ações"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="table-empty">
                      Carregando lançamentos em tempo real...
                    </td>
                  </tr>
                ) : paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-empty">
                      {searchTerm || monthFilter
                        ? 'Nenhum lançamento encontrado para os filtros selecionados.'
                        : 'Nenhum lançamento cadastrado ainda. Utilize o formulário acima para começar.'}
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((item) => {
                    const isSelected = !!item.id && activeSelectedIds.has(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`table-row ${isSelected ? 'row-selected' : ''}`}
                      >
                        <td className="col-checkbox text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => item.id && handleToggleSelect(item.id)}
                            title="Selecionar para exportar"
                            aria-label={`Selecionar lançamento ${item.Descricao}`}
                          />
                        </td>

                        <td className="col-data">
                          <span className="date-badge">{formatDateBR(item.Data)}</span>
                        </td>

                        <td className="col-desc" title={item.Descricao}>
                          {item.Descricao}
                        </td>

                        <td className="col-money text-right">
                          {item.Entrada > 0 ? (
                            <span className="money-cell income">
                              {formatCurrencyBRL(item.Entrada)}
                            </span>
                          ) : (
                            <span className="money-zero">-</span>
                          )}
                        </td>

                        <td className="col-money text-right">
                          {item.Saida > 0 ? (
                            <span className="money-cell expense">
                              {formatCurrencyBRL(item.Saida)}
                            </span>
                          ) : (
                            <span className="money-zero">-</span>
                          )}
                        </td>

                        <td className="col-money text-right">
                          <span
                            className={`money-cell balance ${
                              item.saldoAcumulado >= 0 ? 'positive' : 'negative'
                            }`}
                          >
                            {formatCurrencyBRL(item.saldoAcumulado)}
                          </span>
                        </td>

                        <td className="col-actions text-center">
                          <div className="row-action-buttons">
                            <button
                              type="button"
                              className="btn-action edit"
                              onClick={() => handleOpenEdit(item)}
                              title="Editar lançamento"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-action delete"
                              onClick={() => handleOpenDelete(item)}
                              title="Excluir lançamento"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredTransactions.length > 0 && (
            <div className="pagination-bar">
              <div className="pagination-info">
                Mostrando{' '}
                <strong>
                  {Math.min(
                    (safeCurrentPage - 1) * itemsPerPage + 1,
                    filteredTransactions.length
                  )}
                  -
                  {Math.min(
                    safeCurrentPage * itemsPerPage,
                    filteredTransactions.length
                  )}
                </strong>{' '}
                de <strong>{filteredTransactions.length}</strong> registros
                {activeSelectedIds.size > 0 && (
                  <span className="selected-counter-badge">
                    <CheckSquare size={12} />
                    {activeSelectedIds.size} selecionado(s)
                  </span>
                )}
              </div>

              <div className="pagination-controls">
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                  disabled={safeCurrentPage <= 1}
                  title="Página anterior"
                >
                  <ChevronLeft size={16} />
                  <span>Anterior</span>
                </button>

                <span className="page-current">
                  Página <strong>{safeCurrentPage}</strong> de {totalPages}
                </span>

                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  title="Próxima página"
                >
                  <span>Próxima</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Modais de Edição e Exclusão */}
      <EditTransactionModal
        key={editingTransaction?.id || 'closed'}
        isOpen={isEditModalOpen}
        transaction={editingTransaction}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveEdit}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        transaction={deletingTransaction}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingTransaction(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />
    </div>
  );
};
