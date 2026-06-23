import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  FraniAuthClient,
  type AppConfig,
  type FraniAuthConfig,
  type LoginCredentials,
  type LoginResult,
  type OtpPayload,
  type RegisterPayload,
  type TokenSet,
  type TokenStorage,
  type UserInfo,
  type VerifyOtpPayload,
  type Validate2faPayload,
  createSessionStorageAdapter,
} from '@frani/auth-sdk';

export interface FraniAuthContextValue {
  client: FraniAuthClient;
  user: UserInfo | null;
  tokens: TokenSet | null;
  appConfig: AppConfig | null;
  tenantId?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setTenantId: (tenantId: string | undefined) => void;
  refreshUser: () => Promise<UserInfo | null>;
  refreshSession: () => Promise<TokenSet | null>;
  startOAuthLogin: (tenantId?: string) => Promise<void>;
  handleOAuthCallback: (searchParams: URLSearchParams) => Promise<{ tokens: TokenSet; user: UserInfo }>;
  login: (payload: LoginCredentials) => Promise<LoginResult>;
  register: (payload: RegisterPayload) => Promise<LoginResult>;
  sendOtp: (payload: OtpPayload) => Promise<{ message: string }>;
  verifyOtp: (payload: VerifyOtpPayload) => Promise<LoginResult>;
  validate2fa: (payload: Validate2faPayload) => Promise<LoginResult>;
  logout: () => Promise<void>;
  loadAppConfig: (clientSecret?: string) => Promise<AppConfig>;
}

const FraniAuthContext = createContext<FraniAuthContextValue | null>(null);

export interface FraniAuthProviderProps {
  config: FraniAuthConfig;
  storage?: TokenStorage;
  tenantId?: string;
  autoLoadAppConfig?: boolean;
  children: ReactNode;
}

export function FraniAuthProvider({
  config,
  storage,
  tenantId: initialTenantId,
  autoLoadAppConfig = true,
  children,
}: FraniAuthProviderProps) {
  const client = useMemo(
    () => new FraniAuthClient({ ...config, tenantId: initialTenantId ?? config.tenantId }, storage ?? createSessionStorageAdapter()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.authApiUrl, config.clientId, config.redirectUri, config.tokenProxyUrl, config.refreshProxyUrl, config.configProxyUrl],
  );

  const [tenantId, setTenantId] = useState<string | undefined>(initialTenantId ?? config.tenantId);
  const [user, setUser] = useState<UserInfo | null>(() => client.getStoredUser());
  const [tokens, setTokens] = useState<TokenSet | null>(() => client.getStoredTokens());
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(autoLoadAppConfig);
  const [error, setError] = useState<string | null>(null);

  const loadAppConfig = useCallback(
    async (clientSecret?: string) => {
      setError(null);
      const cfg = await client.getAppConfig(clientSecret);
      setAppConfig(cfg);
      return cfg;
    },
    [client],
  );

  useEffect(() => {
    if (!autoLoadAppConfig) return;
    loadAppConfig().catch((err) => {
      setError(err instanceof Error ? err.message : 'Erro ao carregar config da app');
    }).finally(() => setIsLoading(false));
  }, [autoLoadAppConfig, loadAppConfig]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TokenSet>).detail;
      if (detail?.access_token) setTokens(detail);
    };
    window.addEventListener('frani-auth-tokens-refreshed', handler);
    return () => window.removeEventListener('frani-auth-tokens-refreshed', handler);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!client.getStoredTokens()?.refresh_token) return null;
    try {
      const newTokens = await client.refreshTokens();
      setTokens(newTokens);
      return newTokens;
    } catch {
      return null;
    }
  }, [client]);

  const refreshUser = useCallback(async () => {
    if (!client.getStoredTokens()?.access_token) {
      setUser(null);
      return null;
    }
    try {
      const info = await client.fetchUserInfo();
      client.setStoredUser(info);
      setUser(info);
      return info;
    } catch {
      try {
        const newTokens = await client.refreshTokens();
        setTokens(newTokens);
        const info = await client.fetchUserInfo(newTokens.access_token);
        client.setStoredUser(info);
        setUser(info);
        return info;
      } catch {
        setUser(null);
        return null;
      }
    }
  }, [client]);

  const startOAuthLogin = useCallback(
    async (overrideTenantId?: string) => {
      const { url } = await client.startOAuthLogin(overrideTenantId ?? tenantId);
      window.location.href = url;
    },
    [client, tenantId],
  );

  const handleOAuthCallback = useCallback(
    async (searchParams: URLSearchParams) => {
      const result = await client.handleOAuthCallback({
        code: searchParams.get('code'),
        state: searchParams.get('state'),
        error: searchParams.get('error'),
        errorDescription: searchParams.get('error_description'),
      });
      setTokens(result.tokens);
      setUser(result.user);
      return result;
    },
    [client],
  );

  const applyLoginResult = useCallback(
    (result: LoginResult) => {
      const saved = client.persistLoginResult(result);
      if (saved) setTokens(saved);
      if (result.userId) {
        setUser({
          sub: result.userId,
          email: result.email ?? '',
          email_verified: false,
          name: result.name ?? '',
          roles: [],
          tenantId,
        });
      }
      return result;
    },
    [client, tenantId],
  );

  const login = useCallback(
    async (payload: LoginCredentials) => applyLoginResult(await client.login({ ...payload, tenantId: payload.tenantId ?? tenantId })),
    [applyLoginResult, client, tenantId],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => applyLoginResult(await client.register({ ...payload, tenantId: payload.tenantId ?? tenantId })),
    [applyLoginResult, client, tenantId],
  );

  const sendOtp = useCallback(
    async (payload: OtpPayload) => client.sendOtp({ ...payload, tenantId: payload.tenantId ?? tenantId }),
    [client, tenantId],
  );

  const verifyOtp = useCallback(
    async (payload: VerifyOtpPayload) => applyLoginResult(await client.verifyOtp({ ...payload, tenantId: payload.tenantId ?? tenantId })),
    [applyLoginResult, client, tenantId],
  );

  const validate2fa = useCallback(
    async (payload: Validate2faPayload) => applyLoginResult(await client.validate2fa({ ...payload, tenantId: payload.tenantId ?? tenantId })),
    [applyLoginResult, client, tenantId],
  );

  const logout = useCallback(async () => {
    await client.revokeToken().catch(() => undefined);
    client.clearSession();
    setTokens(null);
    setUser(null);
  }, [client]);

  const value = useMemo<FraniAuthContextValue>(
    () => ({
      client,
      user,
      tokens,
      appConfig,
      tenantId,
      isAuthenticated: Boolean(tokens?.access_token),
      isLoading,
      error,
      setTenantId,
      refreshUser,
      refreshSession,
      startOAuthLogin,
      handleOAuthCallback,
      login,
      register,
      sendOtp,
      verifyOtp,
      validate2fa,
      logout,
      loadAppConfig,
    }),
    [
      client,
      user,
      tokens,
      appConfig,
      tenantId,
      isLoading,
      error,
      refreshUser,
      refreshSession,
      startOAuthLogin,
      handleOAuthCallback,
      login,
      register,
      sendOtp,
      verifyOtp,
      validate2fa,
      logout,
      loadAppConfig,
    ],
  );

  return <FraniAuthContext.Provider value={value}>{children}</FraniAuthContext.Provider>;
}

export function useFraniAuth(): FraniAuthContextValue {
  const ctx = useContext(FraniAuthContext);
  if (!ctx) {
    throw new Error('useFraniAuth deve ser usado dentro de FraniAuthProvider');
  }
  return ctx;
}

export function useFraniUser() {
  const { user, isAuthenticated, refreshUser } = useFraniAuth();
  return { user, isAuthenticated, refreshUser };
}

export function useFraniAppConfig() {
  const { appConfig, isLoading, error, loadAppConfig } = useFraniAuth();
  return { appConfig, isLoading, error, loadAppConfig };
}

export function useFraniTenant() {
  const { tenantId, setTenantId, appConfig } = useFraniAuth();
  return {
    tenantId,
    setTenantId,
    tenantEnabled: appConfig?.tenantEnabled ?? false,
  };
}
