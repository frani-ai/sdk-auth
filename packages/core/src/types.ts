export type AuthMethod = 'password' | 'google' | 'microsoft' | 'otp';

export type AppLocale = 'pt-BR' | 'en';

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

export interface AppConfigPortal {
  organizationId?: string;
  displayName?: string;
  logoUrl?: string;
  slug?: string;
}

export interface AppConfig {
  clientId: string;
  name: string;
  authMethods: AuthMethod[];
  tenantEnabled: boolean;
  logoUrl?: string;
  coverImageUrl?: string;
  primaryColor?: string;
  authTemplate?: string;
  defaultLocale?: AppLocale;
  turnstileEnabled?: boolean;
  turnstileSiteKey?: string;
  allowSelfRegistration: boolean;
  sharedAccessEnabled?: boolean;
  sharedAccessScope?: 'organization' | 'applications' | 'tenants' | 'global';
  shareUsersAcrossTenants?: boolean;
  termsUrl?: string;
  privacyUrl?: string;
  lgpdUrl?: string;
  loginMode: 'password' | 'otp';
  twoFactorEnabled: boolean;
  twoFactorRequired: boolean;
  profileFieldsConfig?: ProfileFieldsConfig;
  portal?: AppConfigPortal;
}

export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
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
  /** Claim RBAC `resource:action` emitido no access token. */
  permissions?: string[];
  tenantId?: string;
  applicationId?: string;
  avatarUrl?: string;
  picture?: string;
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

export interface AccessTokenClaims {
  sub: string;
  email?: string;
  name?: string;
  roles?: string[];
  permissions?: string[];
  applicationId?: string;
  tenantId?: string;
  claims?: Record<string, string | number | boolean>;
  scope?: string;
  typ?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
}

export interface OpenIdConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  profile_endpoint?: string;
  introspection_endpoint: string;
  revocation_endpoint: string;
  jwks_uri: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  scopes_supported: string[];
  code_challenge_methods_supported: string[];
  organization?: { slug: string; name: string };
}

export interface LoginResult {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  requiresConsent?: boolean;
  requires2fa?: boolean;
  requires2faSetup?: boolean;
  setupToken?: string;
  /** Short-lived JWT for TOTP challenge; required by `/auth/2fa/validate`. */
  challengeToken?: string;
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
  primaryColor?: string;
  authTemplate?: string;
  defaultLocale?: AppLocale;
  termsUrl?: string;
  privacyUrl?: string;
  lgpdUrl?: string;
  crossApp?: boolean;
  crossTenant?: boolean;
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

export interface SsoAccount {
  sessionId: string;
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  isActive: boolean;
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
  /**
   * Issuer OIDC — raiz pública. Ex.: https://identity-hml.frani.com.br/org/frani
   * Preferir este campo. Não use o host Nest nem `/authenticate`.
   */
  issuer?: string;
  /** Origem do portal. Ex.: https://identity-hml.frani.com.br */
  portalUrl?: string;
  /** Slug da organização (realm). Usado para montar o issuer se ele não for passado. */
  orgSlug?: string;
  /**
   * @deprecated Use `issuer` (OAuth) + `portalUrl` (BFF `/api`).
   * Mantido para apps que ainda apontam para um único base URL.
   */
  authApiUrl?: string;
  /**
   * @deprecated Use `issuer`. URL pública do OAuth no browser.
   */
  oauthPublicUrl?: string;
  clientId: string;
  /** Apenas no servidor — nunca expor no browser */
  clientSecret?: string;
  redirectUri: string;
  /** Slug público do tenant (`tenant=frani-ia`). Não é ObjectId. */
  tenantId?: string;
  /** `pt-BR` | `en` — enviado como `language` no authorize. */
  language?: string;
  scopes?: string;
  /** Proxy local para troca de tokens (default: /api/oauth/token) */
  tokenProxyUrl?: string;
  /** Proxy local para refresh token (default: /api/oauth/refresh) */
  refreshProxyUrl?: string;
  /** Proxy local para revoke (default: /api/oauth/revoke) */
  revokeProxyUrl?: string;
  /** Proxy local para config pública (default: /api/config) */
  configProxyUrl?: string;
}

export interface ServerAuthConfig {
  issuer?: string;
  portalUrl?: string;
  orgSlug?: string;
  /** @deprecated Use `issuer`. */
  authApiUrl?: string;
  oauthPublicUrl?: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tenantId?: string;
  language?: string;
  /** API key `sk_…` — só no servidor, para provisionar tenant/utilizador. */
  apiKey?: string;
}

export interface PublicAuthConfig {
  issuer: string;
  portalUrl: string;
  authApiUrl: string;
  oauthPublicUrl?: string;
  clientId: string;
  redirectUri: string;
  tenantId?: string;
  orgSlug?: string;
  language?: string;
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
  turnstileToken?: string;
}

export interface RegisterPayload {
  email: string;
  name: string;
  password?: string;
  tenantId?: string;
  profileData?: Record<string, string | boolean>;
  turnstileToken?: string;
}

export interface OtpPayload {
  email: string;
  tenantId?: string;
  turnstileToken?: string;
}

export interface VerifyOtpPayload extends OtpPayload {
  code: string;
}

export interface Validate2faPayload {
  challengeToken: string;
  token: string;
  tenantId?: string;
}

export interface ForgotPasswordPayload {
  email: string;
  tenantId?: string;
  turnstileToken?: string;
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

export interface ProvisionTenantInput {
  name: string;
  slug: string;
  isActive?: boolean;
  settings?: {
    logoUrl?: string;
    primaryColor?: string;
    allowSelfRegistration?: boolean;
    customDomain?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface ProvisionUserInput {
  email: string;
  name: string;
  password?: string;
  tenantId?: string;
  tenantSlug?: string;
  fullName?: string;
  gender?: string;
  phone?: string;
  bio?: string;
  socialNetworks?: { platform: string; url: string }[];
  customClaims?: Record<string, string | number | boolean>;
  profileData?: Record<string, string | boolean>;
  roles?: string[];
  sendInvite?: boolean;
}

export interface ProvisionedTenant {
  id?: string;
  name: string;
  slug: string;
  applicationId?: string;
  isActive?: boolean;
  settings?: Record<string, unknown>;
  created?: boolean;
}

export interface ProvisionedUser {
  id?: string;
  email: string;
  name: string;
  fullName?: string;
  phone?: string;
  roles: string[];
  applicationId?: string;
  tenantId?: string;
  status?: string;
  emailVerified?: boolean;
  mustChangePassword?: boolean;
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
