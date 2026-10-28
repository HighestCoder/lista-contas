import type { Transacao } from '../types/transaction';

/**
 * Arredonda valores financeiros para 2 casas decimais evitando erros de ponto flutuante (IEEE 754)
 */
export function roundCurrency(value: number): number {
  const num = Number(value) || 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Formata número para moeda brasileira (R$ 1.234,56)
 */
export function formatCurrencyBRL(value: number): string {
  return roundCurrency(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Converte data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/AAAA)
 */
export function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Retorna a data atual no fuso horário local do usuário no formato YYYY-MM-DD
 */
export function getLocalTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Compara duas transações em ordem estritamente cronológica (mais antiga primeiro),
 * utilizando Data, timestamp de criação e ID como critérios de desempate determinísticos.
 */
export function compareTransactionsChronologically(a: Transacao, b: Transacao): number {
  const dateCmp = (a.Data || '').localeCompare(b.Data || '');
  if (dateCmp !== 0) return dateCmp;

  const createdA = a.createdAt ? String(a.createdAt) : '9999-12-31T23:59:59.999Z';
  const createdB = b.createdAt ? String(b.createdAt) : '9999-12-31T23:59:59.999Z';
  const createdCmp = createdA.localeCompare(createdB);
  if (createdCmp !== 0) return createdCmp;

  return (a.id || '').localeCompare(b.id || '');
}
