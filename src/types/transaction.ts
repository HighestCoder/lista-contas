export interface Transacao {
  id?: string;
  Data: string; // Formato YYYY-MM-DD
  Descricao: string;
  Entrada: number;
  Saida: number;
  userId?: string;
  createdAt?: string | number | null;
}

export interface TransacaoComSaldo extends Transacao {
  saldoAcumulado: number;
}

export type NovaTransacao = Omit<Transacao, 'id' | 'createdAt'>;
