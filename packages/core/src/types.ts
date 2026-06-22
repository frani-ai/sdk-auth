export type AuthMethod = 'password' | 'google' | 'microsoft' | 'otp';

export interface ProfileFieldToggle {
  enabled: boolean;
  required?: boolean;
}

export interface ProfileFieldsConfig {
  fullName?: ProfileFieldToggle;
  gender?: ProfileFieldToggle;
  phone?: ProfileFieldToggle;
  bio?: ProfileFieldToggle;
  socialNetworks?: ProfileFieldToggle;
}

export interface AppConfig {
  clientId: string;
  name: string;
  authMethods: AuthMethod[];
  tenantEnabled: boolean;
  logoUrl?: string;
  coverImageUrl?: string;
  allowSelfRegistration: boolean;
  termsUrl?: string;
  privacyUrl?: string;
  lgpdUrl?: string;
  loginMode: 'password' | 'otp';
  twoFactorEnabled: boolean;
  twoFactorRequired: boolean;
  profileFieldsConfig?: ProfileFieldsConfig;
}

export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  roles: string[];
  tenantId?: string;
  avatarUrl?: string;
  totpEnabled?: boolean;
  updated_at?: number;
  fullName?: string;
  gender?: string;
  phone?: string;
  bio?: string;
  socialNetworks?: { platform: string; url: string }[];
  profileFieldsConfig?: ProfileFieldsConfig;
  clientId?: string;
  claims?: Record<string, string | number | boolean>;
}

export interface LoginResult {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  requiresConsent?: boolean;
  requires2fa?: boolean;
  requires2faSetup?: boolean;
  setupToken?: string;
  mustChangePassword?: boolean;
  passwordExpired?: boolean;
  passwordChangeToken?: string;
  userId?: string;
  email?: string;
  name?: string;
}

export interface ConsentInfo {
  name: string;
  logoUrl?: string;
  coverImageUrl?: string;
  termsUrl?: string;
  privacyUrl?: string;
  lgpdUrl?: string;
  crossApp?: boolean;
  homeAppName?: string;
  groupName?: string;
  dataScopes?: { key: string; required: boolean }[];
}

export interface SsoSession {
  active: boolean;
  userId?: string;
  hasConsented?: boolean;
  requiresConsent?: boolean;
  canAccess?: boolean;
}

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

export interface PkceState {
  codeVerifier: string;
  state: string;
}

export interface FraniAuthConfig {
  /** Base da API, ex.: https://api.frani.com.br/authenticate */
  authApiUrl: string;
  clientId: string;
  /** Apenas no servidor — nunca expor no browser */
  clientSecret?: string;
  redirectUri: string;
  /** Tenant slug ou id passado no fluxo OAuth/login */
  tenantId?: string;
  scopes?: string;
  /** Proxy local para troca de tokens (default: /api/oauth/token) */
  tokenProxyUrl?: string;
  /** Proxy local para config pública (default: /api/config) */
  configProxyUrl?: string;
}

export interface ServerAuthConfig {
  authApiUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tenantId?: string;
}

export interface TokenIntrospection {
  active: boolean;
  sub?: string;
  exp?: number;
  [key: string]: unknown;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
  redirectUri?: string;
}

export interface RegisterPayload {
  email: string;
  name: string;
  password?: string;
  tenantId?: string;
}

export interface OtpPayload {
  email: string;
  tenantId?: string;
}

export interface VerifyOtpPayload extends OtpPayload {
  code: string;
}

export interface Validate2faPayload {
  userId: string;
  token: string;
  tenantId?: string;
}

export interface ForgotPasswordPayload {
  email: string;
  tenantId?: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ForceChangePasswordPayload {
  userId: string;
  currentPassword: string;
  newPassword: string;
  otpCode: string;
}

export interface TokenStorage {
  getTokens(): TokenSet | null;
  setTokens(tokens: TokenSet | null): void;
  getUser(): UserInfo | null;
  setUser(user: UserInfo | null): void;
  getPkceState(): PkceState | null;
  setPkceState(state: PkceState | null): void;
}

export class FraniAuthError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'FraniAuthError';
  }
}
