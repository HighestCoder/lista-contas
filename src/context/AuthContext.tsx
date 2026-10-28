import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';
import type { AppUser, AuthErrorDetails } from '../types/user';
import { parseAuthError } from '../services/authErrorHandler';

export interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isConfigured: boolean;
  authError: AuthErrorDetails | null;
  signIn: (email: string, pass: string) => Promise<boolean>;
  signUp: (email: string, pass: string) => Promise<boolean>;
  signInDemo: () => void;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'livro_caixa_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);
  const [authError, setAuthError] = useState<AuthErrorDetails | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          const appUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            isDemo: false,
          };
          setUser(appUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(appUser));
        } else {
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached) {
            try {
              const parsed: AppUser = JSON.parse(cached);
              if (parsed.isDemo) {
                setLoading(false);
                return;
              }
            } catch {
              // ignore
            }
          }
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Erro no listener de autenticação:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const clearError = () => {
    setAuthError(null);
  };

  const signIn = async (email: string, pass: string): Promise<boolean> => {
    setAuthError(null);

    if (!isFirebaseConfigured) {
      const configErr: AuthErrorDetails = {
        type: 'configuration',
        title: 'Firebase Não Configurado',
        code: 'firebase/not-configured',
        message: 'As credenciais do Firebase ainda não foram inseridas no arquivo .env.',
        actionHint:
          'Abra o arquivo .env na raiz do projeto e substitua pelas chaves do seu console Firebase, ou utilize o botão de Modo Demonstração abaixo para testar imediatamente.',
      };
      setAuthError(configErr);
      throw configErr;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const loggedUser: AppUser = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        isDemo: false,
      };

      setUser(loggedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
      return true;
    } catch (err: unknown) {
      console.error('Falha no signIn:', err);
      const parsed = parseAuthError(err);
      setAuthError(parsed);
      throw parsed;
    }
  };

  const signUp = async (email: string, pass: string): Promise<boolean> => {
    setAuthError(null);

    if (!isFirebaseConfigured) {
      const configErr: AuthErrorDetails = {
        type: 'configuration',
        title: 'Firebase Não Configurado',
        code: 'firebase/not-configured',
        message: 'As credenciais do Firebase ainda não foram inseridas no arquivo .env.',
        actionHint:
          'Abra o arquivo .env na raiz do projeto e substitua pelas chaves do seu console Firebase, ou utilize o botão de Modo Demonstração abaixo para testar imediatamente.',
      };
      setAuthError(configErr);
      throw configErr;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const newUser: AppUser = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        isDemo: false,
      };

      setUser(newUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      return true;
    } catch (err: unknown) {
      console.error('Falha no signUp:', err);
      const parsed = parseAuthError(err);
      setAuthError(parsed);
      throw parsed;
    }
  };

  const signInDemo = () => {
    setAuthError(null);
    const demoUser: AppUser = {
      uid: 'demo-local-user-id',
      email: 'usuario.demo@livrocaixa.com',
      isDemo: true,
    };
    setUser(demoUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
  };

  const signOut = async () => {
    setAuthError(null);
    try {
      if (isFirebaseConfigured && !user?.isDemo) {
        await firebaseSignOut(auth);
      }
    } catch (err) {
      console.error('Erro ao sair:', err);
    } finally {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured: isFirebaseConfigured,
        authError,
        signIn,
        signUp,
        signInDemo,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
