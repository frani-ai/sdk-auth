function getWebCrypto(): Crypto {
  const webCrypto = globalThis.crypto;
  if (!webCrypto?.subtle) {
    throw new Error(
      'Web Crypto indisponível. Use HTTPS ou localhost para iniciar OAuth PKCE.',
    );
  }
  return webCrypto;
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return getWebCrypto().subtle.digest('SHA-256', encoder.encode(plain));
}

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  getWebCrypto().getRandomValues(array);
  return base64UrlEncode(array);
}

export async function generatePkce(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const codeVerifier = generateRandomString(32);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(hashed);
  return { codeVerifier, codeChallenge };
}

export function generateOAuthState(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto && 'randomUUID' in webCrypto) {
    return webCrypto.randomUUID();
  }
  return generateRandomString(16);
}

export function parseJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as T;
  } catch {
    return null;
  }
}

export function buildAuthorizeUrl(
  config: { authApiUrl: string; clientId: string; redirectUri: string; scopes?: string; tenantId?: string },
  params: { state: string; codeChallenge: string; tenantId?: string },
): string {
  const search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes ?? 'openid profile email',
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
  });

  const tenant = params.tenantId ?? config.tenantId;
  if (tenant) search.set('tenant', tenant);

  const base = config.authApiUrl.replace(/\/$/, '');
  return `${base}/oauth/authorize?${search.toString()}`;
}

export function normalizeUserInfo(
  data: Partial<Record<string, unknown>>,
): import('./types.js').UserInfo {
  return {
    sub: String(data.sub ?? ''),
    email: String(data.email ?? ''),
    email_verified: Boolean(data.email_verified),
    name: String(data.name ?? ''),
    roles: Array.isArray(data.roles) ? (data.roles as string[]) : [],
    tenantId: data.tenantId as string | undefined,
    avatarUrl: data.avatarUrl as string | undefined,
    totpEnabled: Boolean(data.totpEnabled),
    updated_at: data.updated_at as number | undefined,
    fullName: (data.fullName ?? data.full_name) as string | undefined,
    gender: data.gender as string | undefined,
    phone: data.phone as string | undefined,
    bio: data.bio as string | undefined,
    socialNetworks: (data.socialNetworks ?? data.social_networks) as
      | { platform: string; url: string }[]
      | undefined,
    profileFieldsConfig: data.profileFieldsConfig as import('./types.js').ProfileFieldsConfig | undefined,
    clientId: data.clientId as string | undefined,
    claims: data.claims as Record<string, string | number | boolean> | undefined,
  };
}
