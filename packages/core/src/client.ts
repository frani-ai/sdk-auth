import {
  FraniAuthError,
  type AppConfig,
  type ChangePasswordPayload,
  type ConsentInfo,
  type ForgotPasswordPayload,
  type ForceChangePasswordPayload,
  type FraniAuthConfig,
  type LoginCredentials,
  type LoginResult,
  type OtpPayload,
  type PkceState,
  type RegisterPayload,
  type ResetPasswordPayload,
  type ServerAuthConfig,
  type SsoSession,
  type TokenIntrospection,
  type TokenSet,
  type TokenStorage,
  type TwoFactorSetup,
  type UserInfo,
  type Validate2faPayload,
  type VerifyOtpPayload,
} from './types.js';
import {
  buildAuthorizeUrl,
  generateOAuthState,
  generatePkce,
  normalizeUserInfo,
  parseJwt,
} from './pkce.js';
import { createSessionStorageAdapter } from './storage.js';

async function parseResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (body as { message?: string; error_description?: string; error?: string }).message ??
      (body as { error_description?: string }).error_description ??
      (body as { error?: string }).error ??
      `Request failed (${res.status})`;
    throw new FraniAuthError(message, res.status, body);
  }
  return body as T;
}

export class FraniAuthClient {
  private readonly tokenProxyUrl: string;
  private readonly refreshProxyUrl: string;
  private readonly configProxyUrl: string;
  private cachedPublicConfig: Pick<FraniAuthConfig, 'authApiUrl' | 'clientId' | 'redirectUri'> | null = null;

  constructor(
    private readonly config: FraniAuthConfig,
    private readonly storage: TokenStorage = createSessionStorageAdapter(),
  ) {
    this.tokenProxyUrl = config.tokenProxyUrl ?? '/api/oauth/token';
    this.refreshProxyUrl = config.refreshProxyUrl ?? '/api/oauth/refresh';
    this.configProxyUrl = config.configProxyUrl ?? '/api/config';
  }

  getConfig(): FraniAuthConfig {
    return this.config;
  }

  /** Config pública (clientId, redirectUri, authApiUrl) — via proxy ou env inline. */
  async getPublicConfig(): Promise<Pick<FraniAuthConfig, 'authApiUrl' | 'clientId' | 'redirectUri'>> {
    if (this.cachedPublicConfig) return this.cachedPublicConfig;

    if (this.config.authApiUrl && this.config.clientId && this.config.redirectUri) {
      this.cachedPublicConfig = {
        authApiUrl: this.config.authApiUrl,
        clientId: this.config.clientId,
        redirectUri: this.config.redirectUri,
      };
      return this.cachedPublicConfig;
    }

    const res = await fetch(this.configProxyUrl, { cache: 'no-store' });
    this.cachedPublicConfig = await parseResponse(res);
    return this.cachedPublicConfig!;
  }

  /** Metadados da aplicação (login UI, tenant, 2FA, etc.). */
  async getAppConfig(clientSecret?: string): Promise<AppConfig> {
    const cfg = await this.resolveApiConfig();
    const params = new URLSearchParams({ client_id: cfg.clientId });
    const secret = clientSecret ?? this.config.clientSecret;
    if (secret) params.set('client_secret', secret);

    const res = await fetch(`${cfg.authApiUrl}/auth/app-config?${params.toString()}`);
    return parseResponse<AppConfig>(res);
  }

  async generatePkce() {
    return generatePkce();
  }

  generateState() {
    return generateOAuthState();
  }

  async getAuthorizeUrl(codeChallenge: string, state?: string, tenantId?: string): Promise<string> {
    const cfg = await this.resolveApiConfig();
    const oauthState = state ?? this.generateState();
    return buildAuthorizeUrl(
      { ...cfg, scopes: this.config.scopes, tenantId: tenantId ?? this.config.tenantId },
      { state: oauthState, codeChallenge, tenantId: tenantId ?? this.config.tenantId },
    );
  }

  /** Inicia OAuth PKCE — guarda state/verifier e devolve URL de redirect. */
  async startOAuthLogin(tenantId?: string): Promise<{ url: string; state: string }> {
    const { codeVerifier, codeChallenge } = await this.generatePkce();
    const state = this.generateState();
    this.storage.setPkceState({ codeVerifier, state });
    const url = await this.getAuthorizeUrl(codeChallenge, state, tenantId);
    return { url, state };
  }

  /** Processa callback OAuth (?code=&state=). */
  async handleOAuthCallback(params: {
    code?: string | null;
    state?: string | null;
    error?: string | null;
    errorDescription?: string | null;
  }): Promise<{ tokens: TokenSet; user: UserInfo }> {
    if (params.error) {
      throw new FraniAuthError(params.errorDescription ?? params.error);
    }
    if (!params.code) {
      throw new FraniAuthError('Authorization code em falta');
    }

    const pkce = this.storage.getPkceState();
    if (!pkce?.codeVerifier) {
      throw new FraniAuthError('PKCE state em falta — inicie o login novamente');
    }
    if (params.state && pkce.state !== params.state) {
      throw new FraniAuthError('State mismatch — possível CSRF');
    }

    const tokens = await this.exchangeCode(params.code, pkce.codeVerifier);
    this.storage.setPkceState(null);
    this.storage.setTokens(tokens);

    const user = await this.fetchUserInfo(tokens.access_token);
    this.storage.setUser(user);

    return { tokens, user };
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<TokenSet> {
    const res = await fetch(this.tokenProxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, codeVerifier }),
    });
    return parseResponse<TokenSet>(res);
  }

  async fetchUserInfo(accessToken?: string): Promise<UserInfo> {
    const token = accessToken ?? this.storage.getTokens()?.access_token;
    if (!token) throw new FraniAuthError('Access token em falta');

    const cfg = await this.resolveApiConfig();
    const res = await fetch(`${cfg.authApiUrl}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseResponse<Record<string, unknown>>(res);
    return normalizeUserInfo(data);
  }

  async fetchProfile(accessToken?: string): Promise<Partial<UserInfo>> {
    const token = accessToken ?? this.storage.getTokens()?.access_token;
    if (!token) throw new FraniAuthError('Access token em falta');

    const cfg = await this.resolveApiConfig();
    const res = await fetch(`${cfg.authApiUrl}/oauth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseResponse<Record<string, unknown>>(res);
    return normalizeUserInfo(data);
  }

  async refreshTokens(refreshToken?: string): Promise<TokenSet> {
    const token = refreshToken ?? this.storage.getTokens()?.refresh_token;
    if (!token) throw new FraniAuthError('Refresh token em falta');

    let tokens: TokenSet;
    if (this.refreshProxyUrl) {
      const res = await fetch(this.refreshProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      });
      tokens = await parseResponse<TokenSet>(res);
    } else {
      const cfg = await this.resolveApiConfig();
      const res = await fetch(`${cfg.authApiUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: token,
          client_id: cfg.clientId,
          ...(this.config.clientSecret ? { client_secret: this.config.clientSecret } : {}),
        }),
      });
      tokens = await parseResponse<TokenSet>(res);
    }

    const merged: TokenSet = {
      ...tokens,
      refresh_token: tokens.refresh_token ?? token,
    };
    this.storage.setTokens(merged);
    return merged;
  }

  async introspectToken(token?: string): Promise<TokenIntrospection> {
    const value = token ?? this.storage.getTokens()?.access_token;
    if (!value) throw new FraniAuthError('Token em falta');

    const cfg = await this.resolveApiConfig();
    const res = await fetch(`${cfg.authApiUrl}/oauth/introspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: value }),
    });
    return parseResponse<TokenIntrospection>(res);
  }

  async revokeToken(token?: string): Promise<void> {
    const value = token ?? this.storage.getTokens()?.access_token;
    if (!value) return;

    const cfg = await this.resolveApiConfig();
    const res = await fetch(`${cfg.authApiUrl}/oauth/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: value }),
    });
    if (!res.ok) await parseResponse(res);
    this.clearSession();
  }

  // --- Login directo (formulários embedded) ---

  async login(payload: LoginCredentials): Promise<LoginResult> {
    return this.authPost<LoginResult>('/auth/login', {
      clientId: this.config.clientId,
      ...(this.config.clientSecret ? { clientSecret: this.config.clientSecret } : {}),
      email: payload.email,
      password: payload.password,
      tenantId: payload.tenantId ?? this.config.tenantId,
      redirectUri: payload.redirectUri ?? this.config.redirectUri,
    });
  }

  async register(payload: RegisterPayload): Promise<LoginResult> {
    return this.authPost<LoginResult>('/auth/register', {
      clientId: this.config.clientId,
      ...(this.config.clientSecret ? { clientSecret: this.config.clientSecret } : {}),
      ...payload,
      tenantId: payload.tenantId ?? this.config.tenantId,
    });
  }

  async sendOtp(payload: OtpPayload): Promise<{ message: string }> {
    return this.authPost('/auth/otp/send', {
      clientId: this.config.clientId,
      ...(this.config.clientSecret ? { clientSecret: this.config.clientSecret } : {}),
      ...payload,
      tenantId: payload.tenantId ?? this.config.tenantId,
    });
  }

  async verifyOtp(payload: VerifyOtpPayload): Promise<LoginResult> {
    return this.authPost<LoginResult>('/auth/otp/verify', {
      clientId: this.config.clientId,
      ...(this.config.clientSecret ? { clientSecret: this.config.clientSecret } : {}),
      ...payload,
      tenantId: payload.tenantId ?? this.config.tenantId,
    });
  }

  async validate2fa(payload: Validate2faPayload): Promise<LoginResult> {
    return this.authPost<LoginResult>('/auth/2fa/validate', {
      clientId: this.config.clientId,
      ...(this.config.clientSecret ? { clientSecret: this.config.clientSecret } : {}),
      ...payload,
      tenantId: payload.tenantId ?? this.config.tenantId,
    });
  }

  async setup2faLogin(setupToken: string): Promise<TwoFactorSetup> {
    return this.authPost('/auth/2fa/login-setup', { setupToken });
  }

  async verify2faLoginSetup(payload: {
    setupToken: string;
    token: string;
    redirectUri?: string;
  }): Promise<LoginResult> {
    return this.authPost('/auth/2fa/login-verify-setup', payload);
  }

  async forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
    return this.authPost('/auth/forgot-password', {
      clientId: this.config.clientId,
      ...(this.config.clientSecret ? { clientSecret: this.config.clientSecret } : {}),
      ...payload,
      tenantId: payload.tenantId ?? this.config.tenantId,
    });
  }

  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    return this.authPost('/auth/reset-password', payload);
  }

  async changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
    return this.authPost('/auth/change-password', {
      clientId: this.config.clientId,
      ...payload,
    });
  }

  async completePasswordChange(payload: {
    passwordChangeToken: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    return this.authPost('/auth/password-change/complete', payload);
  }

  async forceChangePasswordSendOtp(payload: {
    userId: string;
    currentPassword: string;
  }): Promise<{ message: string }> {
    return this.authPost('/auth/force-change-password/send-otp', {
      clientId: this.config.clientId,
      ...(this.config.clientSecret ? { clientSecret: this.config.clientSecret } : {}),
      ...payload,
    });
  }

  async forceChangePassword(payload: ForceChangePasswordPayload): Promise<{ message: string }> {
    return this.authPost('/auth/force-change-password', {
      clientId: this.config.clientId,
      ...(this.config.clientSecret ? { clientSecret: this.config.clientSecret } : {}),
      ...payload,
    });
  }

  async getConsentInfo(userId?: string): Promise<ConsentInfo> {
    const cfg = await this.resolveApiConfig();
    const params = new URLSearchParams({ client_id: cfg.clientId });
    if (userId) params.set('user_id', userId);
    const res = await fetch(`${cfg.authApiUrl}/auth/consent/info?${params.toString()}`, {
      credentials: 'include',
    });
    return parseResponse<ConsentInfo>(res);
  }

  async checkConsent(userId: string): Promise<{ hasConsented: boolean }> {
    const cfg = await this.resolveApiConfig();
    const params = new URLSearchParams({ clientId: cfg.clientId, userId });
    const res = await fetch(`${cfg.authApiUrl}/auth/consent/check?${params.toString()}`, {
      credentials: 'include',
    });
    return parseResponse(res);
  }

  async giveConsent(userId: string): Promise<{ success: boolean }> {
    const cfg = await this.resolveApiConfig();
    const res = await fetch(`${cfg.authApiUrl}/auth/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ clientId: cfg.clientId, userId }),
    });
    return parseResponse(res);
  }

  async checkSsoSession(): Promise<SsoSession> {
    const cfg = await this.resolveApiConfig();
    const params = new URLSearchParams({ client_id: cfg.clientId });
    const res = await fetch(`${cfg.authApiUrl}/auth/sso/session?${params.toString()}`, {
      credentials: 'include',
    });
    return parseResponse<SsoSession>(res);
  }

  async ssoLogout(): Promise<{ success: boolean }> {
    const cfg = await this.resolveApiConfig();
    const res = await fetch(`${cfg.authApiUrl}/auth/sso/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return parseResponse(res);
  }

  /** Persiste tokens após login directo (password/OTP/2FA). */
  persistLoginResult(result: LoginResult): TokenSet | null {
    if (!result.access_token) return null;
    const tokens: TokenSet = {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
    };
    this.storage.setTokens(tokens);
    return tokens;
  }

  getStoredTokens(): TokenSet | null {
    return this.storage.getTokens();
  }

  getStoredUser(): UserInfo | null {
    return this.storage.getUser();
  }

  setStoredUser(user: UserInfo | null): void {
    this.storage.setUser(user);
  }

  getPkceState(): PkceState | null {
    return this.storage.getPkceState();
  }

  clearSession(): void {
    this.storage.setTokens(null);
    this.storage.setUser(null);
    this.storage.setPkceState(null);
  }

  parseJwt<T = Record<string, unknown>>(token: string): T | null {
    return parseJwt<T>(token);
  }

  private async resolveApiConfig(): Promise<Pick<FraniAuthConfig, 'authApiUrl' | 'clientId' | 'redirectUri'>> {
    if (this.config.authApiUrl && this.config.clientId && this.config.redirectUri) {
      return {
        authApiUrl: this.config.authApiUrl.replace(/\/$/, ''),
        clientId: this.config.clientId,
        redirectUri: this.config.redirectUri,
      };
    }
    const publicCfg = await this.getPublicConfig();
    return {
      authApiUrl: publicCfg.authApiUrl.replace(/\/$/, ''),
      clientId: publicCfg.clientId,
      redirectUri: publicCfg.redirectUri,
    };
  }

  private async authPost<T>(path: string, body: object): Promise<T> {
    const cfg = await this.resolveApiConfig();
    const res = await fetch(`${cfg.authApiUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    return parseResponse<T>(res);
  }
}

/** Troca authorization code por tokens — usar no servidor (Route Handler / Vite middleware). */
export async function exchangeCodeOnServer(
  config: ServerAuthConfig,
  code: string,
  codeVerifier: string,
): Promise<TokenSet> {
  const res = await fetch(`${config.authApiUrl.replace(/\/$/, '')}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code_verifier: codeVerifier,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new FraniAuthError(
      (body as { message?: string; error_description?: string }).message ??
        (body as { error_description?: string }).error_description ??
        'Falha ao trocar code por tokens',
      res.status,
      body,
    );
  }
  return body as TokenSet;
}

export function getPublicConfigFromServer(config: ServerAuthConfig) {
  return {
    authApiUrl: config.authApiUrl,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    tenantId: config.tenantId,
  };
}
