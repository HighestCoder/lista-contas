import React from 'react';
import type { Transacao } from '../types/transaction';
import { formatDateBR } from '../utils/formatters';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteConfirmModalProps {
  transaction: Transacao | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onConfirm,
  loading,
}) => {
  if (!isOpen || !transaction) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-icon danger">
            <AlertTriangle size={20} />
          </div>
          <h3>Confirmar Exclusão</h3>
        </div>

        <p className="modal-body-text">
          Deseja realmente excluir o lançamento <strong>"{transaction.Descricao}"</strong> do dia{' '}
          <strong>{formatDateBR(transaction.Data)}</strong>? Esta ação não pode ser desfeita.
        </p>

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            <Trash2 size={16} />
            <span>{loading ? 'Excluindo...' : 'Excluir'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
