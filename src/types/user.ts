export interface AppUser {
  uid: string;
  email: string | null;
  isDemo?: boolean;
}

export interface AuthErrorDetails {
  type: 'configuration' | 'credential' | 'network' | 'unknown';
  title: string;
  message: string;
  code?: string;
  actionHint?: string;
}
