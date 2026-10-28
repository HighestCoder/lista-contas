import type { AuthErrorDetails } from '../types/user';

export function parseAuthError(err: any): AuthErrorDetails {
  const code = err?.code || '';
  const rawMessage = err?.message || String(err);

  // Erros de Configuração do Firebase
  if (
    code === 'auth/api-key-not-valid' ||
    code === 'auth/invalid-api-key' ||
    rawMessage.includes('API key not valid')
  ) {
    return {
      type: 'configuration',
      title: 'Erro de Configuração: API Key Inválida',
      code,
      message: 'A chave da API (VITE_FIREBASE_API_KEY) informada no arquivo .env é inválida ou expirou.',
      actionHint: 'Acesse o Firebase Console > Configurações do Projeto > Geral e copie a apiKey correta para o seu .env.',
    };
  }

  if (code === 'auth/operation-not-allowed') {
    return {
      type: 'configuration',
      title: 'Erro de Configuração: E-mail/Senha Não Habilitado',
      code,
      message: 'O provedor de autenticação por E-mail/Senha não está ativado no Firebase Console.',
      actionHint: 'Acesse o Firebase Console > Authentication > Guia "Sign-in method" > E-mail/senha e clique em "Ativar".',
    };
  }

  if (
    code === 'auth/configuration-not-found' ||
    code === 'auth/project-not-found' ||
    rawMessage.includes('project')
  ) {
    return {
      type: 'configuration',
      title: 'Erro de Configuração: Projeto Não Encontrado',
      code,
      message: 'O projeto Firebase configurado no .env não existe ou o Authentication não foi iniciado.',
      actionHint: 'Verifique se VITE_FIREBASE_PROJECT_ID e VITE_FIREBASE_AUTH_DOMAIN no .env correspondem exatamente ao seu projeto Firebase.',
    };
  }

  if (code === 'auth/unauthorized-domain') {
    return {
      type: 'configuration',
      title: 'Erro de Configuração: Domínio Não Autorizado',
      code,
      message: 'O domínio atual (localhost) não está na lista de domínios autorizados do Firebase.',
      actionHint: 'Vá em Firebase Console > Authentication > Settings > Authorized domains e adicione "localhost".',
    };
  }

  // Erros de Credencial
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return {
      type: 'credential',
      title: 'Credencial Inválida',
      code,
      message: 'E-mail ou senha incorretos. Se ainda não possui uma conta, clique em "Criar nova conta".',
      actionHint: 'Verifique se digitou o e-mail e senha corretamente.',
    };
  }

  if (code === 'auth/email-already-in-use') {
    return {
      type: 'credential',
      title: 'E-mail Já Cadastrado',
      code,
      message: 'Este e-mail já está sendo utilizado por outra conta.',
      actionHint: 'Alterne para a aba "Fazer login" e digite sua senha.',
    };
  }

  if (code === 'auth/weak-password') {
    return {
      type: 'credential',
      title: 'Senha Muito Fraca',
      code,
      message: 'A senha informada deve conter pelo menos 6 caracteres.',
      actionHint: 'Escolha uma senha mais segura com no mínimo 6 dígitos ou letras.',
    };
  }

  if (code === 'auth/invalid-email') {
    return {
      type: 'credential',
      title: 'Formato de E-mail Inválido',
      code,
      message: 'O endereço de e-mail informado não possui um formato válido.',
      actionHint: 'Exemplo correto: seu.nome@exemplo.com',
    };
  }

  if (code === 'auth/user-disabled') {
    return {
      type: 'credential',
      title: 'Conta Desativada',
      code,
      message: 'Esta conta de usuário foi desativada pelo administrador.',
      actionHint: 'Entre em contato com o administrador do sistema.',
    };
  }

  // Erros de Rede
  if (code === 'auth/network-request-failed') {
    return {
      type: 'network',
      title: 'Erro de Conexão com o Firebase',
      code,
      message: 'Não foi possível conectar aos servidores do Firebase. Verifique sua conexão com a internet.',
      actionHint: 'Verifique se o seu computador tem acesso à internet ou se há algum firewall/bloqueador ativo.',
    };
  }

  // Erro Geral
  return {
    type: 'unknown',
    title: 'Falha na Autenticação',
    code: code || 'auth/unknown',
    message: rawMessage || 'Ocorreu um erro inesperado ao autenticar.',
    actionHint: 'Verifique suas credenciais e a configuração do seu arquivo .env.',
  };
}
