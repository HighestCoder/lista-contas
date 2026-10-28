import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type { Transacao, NovaTransacao } from '../types/transaction';
import { roundCurrency } from '../utils/formatters';

const COLLECTION_NAME = 'Transacoes';
const LOCAL_STORAGE_TRANSACTIONS = 'livro_caixa_local_transacoes';

function getLocalTransactions(userId: string): Transacao[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS);
    const all: Transacao[] = raw ? JSON.parse(raw) : [];
    return all.filter((t) => t.userId === userId || !t.userId);
  } catch {
    return [];
  }
}

function saveLocalTransactions(items: Transacao[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_TRANSACTIONS, JSON.stringify(items));
  } catch (err) {
    console.error('Erro ao salvar localmente:', err);
  }
}

/**
 * Escuta em tempo real as transações do usuário autenticado.
 * Usa o Cloud Firestore se configurado, ou sincronização local se em modo de teste.
 */
export function subscribeToTransactions(
  userId: string,
  onSuccess: (transactions: Transacao[]) => void,
  onError: (error: Error) => void
) {
  if (!isFirebaseConfigured || userId === 'demo-local-user-id') {
    const loadLocal = () => {
      let items = getLocalTransactions(userId);
      if (items.length === 0) {
        items = [
          {
            id: 'demo-1',
            Data: '2026-10-25',
            Descricao: 'Saldo Inicial de Caixa',
            Entrada: 5000.0,
            Saida: 0,
            userId,
            createdAt: '2026-10-25T10:00:00Z',
          },
          {
            id: 'demo-2',
            Data: '2026-10-26',
            Descricao: 'Venda de Mercadorias / Serviços',
            Entrada: 1250.0,
            Saida: 0,
            userId,
            createdAt: '2026-10-26T14:30:00Z',
          },
          {
            id: 'demo-3',
            Data: '2026-10-27',
            Descricao: 'Pagamento de Fornecedor',
            Entrada: 0,
            Saida: 820.0,
            userId,
            createdAt: '2026-10-27T09:15:00Z',
          },
        ];
        saveLocalTransactions(items);
      }
      onSuccess(items);
    };

    loadLocal();

    const storageHandler = () => loadLocal();
    window.addEventListener('storage', storageHandler);
    window.addEventListener('transacoes_updated', storageHandler);

    return () => {
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener('transacoes_updated', storageHandler);
    };
  }

  // Modo Firebase Firestore Real
  const transacoesRef = collection(db, COLLECTION_NAME);
  const q = query(transacoesRef, where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Transacao[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data({ serverTimestamps: 'estimate' });
        return {
          id: docSnap.id,
          Data: data.Data || '',
          Descricao: data.Descricao || '',
          Entrada: roundCurrency(data.Entrada),
          Saida: roundCurrency(data.Saida),
          userId: data.userId,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
        };
      });

      onSuccess(items);
    },
    (error) => {
      onError(error);
    }
  );
}

/**
 * Adiciona uma nova transação à coleção Transacoes
 */
export async function addTransaction(transaction: NovaTransacao, userId: string): Promise<string> {
  if (!transaction.Data) throw new Error('O campo Data é obrigatório.');
  if (!transaction.Descricao?.trim()) throw new Error('O campo Descrição é obrigatório.');

  const entrada = roundCurrency(transaction.Entrada);
  const saida = roundCurrency(transaction.Saida);

  if (!isFirebaseConfigured || userId === 'demo-local-user-id') {
    const raw = localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS);
    const all: Transacao[] = raw ? JSON.parse(raw) : [];
    const newId = 'local-' + Date.now();
    const newDoc: Transacao = {
      id: newId,
      Data: transaction.Data,
      Descricao: transaction.Descricao.trim(),
      Entrada: entrada,
      Saida: saida,
      userId,
      createdAt: new Date().toISOString(),
    };
    all.push(newDoc);
    saveLocalTransactions(all);
    window.dispatchEvent(new Event('transacoes_updated'));
    return newId;
  }

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    Data: transaction.Data,
    Descricao: transaction.Descricao.trim(),
    Entrada: entrada,
    Saida: saida,
    userId,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Exclui uma transação
 */
export async function deleteTransaction(transactionId: string): Promise<void> {
  if (transactionId.startsWith('local-') || transactionId.startsWith('demo-') || !isFirebaseConfigured) {
    const raw = localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS);
    const all: Transacao[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter((t) => t.id !== transactionId);
    saveLocalTransactions(filtered);
    window.dispatchEvent(new Event('transacoes_updated'));
    return;
  }

  const docRef = doc(db, COLLECTION_NAME, transactionId);
  await deleteDoc(docRef);
}

/**
 * Atualiza uma transação existente
 */
export async function updateTransaction(
  transactionId: string,
  data: Partial<NovaTransacao>
): Promise<void> {
  const sanitizedData: Partial<NovaTransacao> = {
    ...data,
    ...(data.Descricao !== undefined ? { Descricao: data.Descricao.trim() } : {}),
    ...(data.Entrada !== undefined ? { Entrada: roundCurrency(data.Entrada) } : {}),
    ...(data.Saida !== undefined ? { Saida: roundCurrency(data.Saida) } : {}),
  };

  if (transactionId.startsWith('local-') || transactionId.startsWith('demo-') || !isFirebaseConfigured) {
    const raw = localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS);
    const all: Transacao[] = raw ? JSON.parse(raw) : [];
    const updated = all.map((t) => (t.id === transactionId ? { ...t, ...sanitizedData } : t));
    saveLocalTransactions(updated);
    window.dispatchEvent(new Event('transacoes_updated'));
    return;
  }

  const docRef = doc(db, COLLECTION_NAME, transactionId);
  await updateDoc(docRef, {
    ...sanitizedData,
    updatedAt: serverTimestamp(),
  });
}
