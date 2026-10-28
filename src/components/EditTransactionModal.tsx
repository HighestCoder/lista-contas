import React, { useState } from 'react';
import type { Transacao, NovaTransacao } from '../types/transaction';
import { roundCurrency } from '../utils/formatters';
import { X, Check, AlertCircle } from 'lucide-react';

interface EditTransactionModalProps {
  transaction: Transacao | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: NovaTransacao) => Promise<void>;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSave,
}) => {
  const [data, setData] = useState(transaction?.Data || '');
  const [descricao, setDescricao] = useState(transaction?.Descricao || '');
  const [tipo, setTipo] = useState<'entrada' | 'saida'>(
    (transaction?.Entrada ?? 0) > 0 ? 'entrada' : 'saida'
  );
  const [valor, setValor] = useState<number | ''>(
    (transaction?.Entrada ?? 0) > 0
      ? transaction?.Entrada ?? ''
      : transaction?.Saida ?? ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!data) {
      setError('Por favor, informe a Data.');
      return;
    }
    if (!descricao.trim()) {
      setError('Por favor, informe a Descrição.');
      return;
    }
    const rawNum = typeof valor === 'number' ? valor : parseFloat(String(valor));
    const numValor = roundCurrency(rawNum);
    if (!numValor || numValor <= 0) {
      setError('Por favor, informe um Valor válido maior que zero.');
      return;
    }

    try {
      setLoading(true);
      const entrada = tipo === 'entrada' ? numValor : 0;
      const saida = tipo === 'saida' ? numValor : 0;

      await onSave(transaction.id!, {
        Data: data,
        Descricao: descricao.trim(),
        Entrada: entrada,
        Saida: saida,
        userId: transaction.userId,
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar alterações.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Editar Lançamento</h3>
          <button className="icon-btn close-btn" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="modal-alert danger">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group flex-1">
              <label>Data</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>

            <div className="form-group flex-1">
              <label>Tipo de Operação</label>
              <div className="type-toggle">
                <button
                  type="button"
                  className={`type-btn income ${tipo === 'entrada' ? 'active' : ''}`}
                  onClick={() => setTipo('entrada')}
                >
                  Entrada (+)
                </button>
                <button
                  type="button"
                  className={`type-btn expense ${tipo === 'saida' ? 'active' : ''}`}
                  onClick={() => setTipo('saida')}
                >
                  Saída (-)
                </button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Descrição</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Fornecedor, Venda, Aluguel..."
              required
            />
          </div>

          <div className="form-group">
            <label>Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="0,00"
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Check size={16} />
              <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
