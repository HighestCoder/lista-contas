import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  AlertCircle,
  CheckCircle,
  Wallet,
  UserPlus,
  LogIn,
  HelpCircle,
  Sparkles,
  Info
} from 'lucide-react';

export const Login: React.FC = () => {
  const { signIn, signUp, signInDemo, isConfigured, authError, clearError } = useAuth();
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    setSuccess(null);

    if (!email.trim() || !password.trim()) {
      setLocalError('Por favor, preencha o e-mail e a senha.');
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setLocalError('As senhas não coincidem.');
      return;
    }

    if (isRegistering && password.length < 6) {
      setLocalError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      if (isRegistering) {
        setSuccess('Criando conta...');
        await signUp(email, password);
        setSuccess('Conta criada com sucesso! Redirecionando para o Dashboard...');
      } else {
        setSuccess('Autenticando...');
        await signIn(email, password);
        setSuccess('Login realizado com sucesso! Redirecionando...');
      }
    } catch {
      // O erro é tratado e disponibilizado via authError no AuthContext
      setSuccess(null);
    } finally {
      setSubmitting(false);
    }
  };

  // Erro ativo (local ou do serviço de autenticação)
  const activeError = authError;

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Cabeçalho */}
        <div className="login-header">
          <div className="app-badge">
            <Wallet className="icon" size={28} />
          </div>
          <h1>Canetona do Cabeça</h1>
          <p className="subtitle">Controle financeiro seguro com sincronização em nuvem</p>
        </div>

        {/* ========================================================= */}
        {/* TRATAMENTO DE ERROS VISÍVEL COM DIAGNÓSTICO DETALHADO     */}
        {/* ========================================================= */}
        {activeError && (
          <div
            className={`alert-banner-box ${
              activeError.type === 'configuration' ? 'alert-config' : 'alert-credential'
            }`}
          >
            <div className="alert-box-header">
              <AlertCircle size={20} className="alert-box-icon" />
              <strong>{activeError.title}</strong>
              {activeError.code && <span className="error-code-badge">{activeError.code}</span>}
            </div>

            <p className="alert-box-message">{activeError.message}</p>

            {activeError.actionHint && (
              <div className="alert-box-hint">
                <Info size={14} />
                <span>{activeError.actionHint}</span>
              </div>
            )}
          </div>
        )}

        {/* Erro de validação local (ex: senhas não coincidem) */}
        {localError && !activeError && (
          <div className="alert-banner danger">
            <AlertCircle size={18} className="alert-icon" />
            <span>{localError}</span>
          </div>
        )}

        {/* Mensagem de Sucesso no Redirecionamento */}
        {success && (
          <div className="alert-banner success">
            <CheckCircle size={18} className="alert-icon" />
            <span>{success}</span>
          </div>
        )}

        {/* Formulário de Autenticação */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (activeError) clearError();
                  if (localError) setLocalError(null);
                }}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (activeError) clearError();
                  if (localError) setLocalError(null);
                }}
                required
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
              />
            </div>
          </div>

          {isRegistering && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar Senha</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting ? (
              <span className="spinner-text">Processando...</span>
            ) : isRegistering ? (
              <>
                <UserPlus size={18} />
                <span>Cadastrar e Acessar</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Entrar no Sistema</span>
              </>
            )}
          </button>
        </form>

        {/* Alternador entre Login e Criação de Conta */}
        <div className="login-footer">
          {isRegistering ? (
            <p>
              Já possui uma conta?{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setIsRegistering(false);
                  clearError();
                  setLocalError(null);
                  setSuccess(null);
                }}
              >
                Fazer login
              </button>
            </p>
          ) : (
            <p>
              Não tem uma conta?{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setIsRegistering(true);
                  clearError();
                  setLocalError(null);
                  setSuccess(null);
                }}
              >
                Criar nova conta
              </button>
            </p>
          )}
        </div>

        {/* ========================================================= */}
        {/* BOTÃO DE MODO DEMONSTRAÇÃO / TESTE IMEDIATO               */}
        {/* ========================================================= */}
        <div className="demo-mode-section">
          <div className="demo-divider">
            <span>OU</span>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-block demo-btn"
            onClick={() => signInDemo()}
            title="Acessar o painel imediatamente para testar todas as funcionalidades"
          >
            <Sparkles size={16} className="text-primary" />
            <span>Entrar em Modo Demonstração / Teste</span>
          </button>

          {!isConfigured && (
            <p className="demo-caption">
              <HelpCircle size={13} />
              <span>
                As credenciais do Firebase ainda não estão no <code>.env</code>. Você pode usar o
                modo demonstração para ver o painel agora mesmo!
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
