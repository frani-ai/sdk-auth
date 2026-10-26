import {
  exchangeCodeOnServer,
  getPublicConfigFromServer,
  refreshTokensOnServer,
  revokeTokenOnServer,
} from '../client.js';
import type { ServerAuthConfig } from '../types.js';

export type EnvReader = (key: string) => string | undefined;

const DEFAULT_ENV: EnvReader = (key) =>
  typeof process !== 'undefined' ? process.env[key] : undefined;

function first(env: EnvReader, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = env(key)?.trim();
    if (value) return value;
  }
  return undefined;
}

/** Lê config a partir de variáveis de ambiente (runtime). */
export function readAuthConfigFromEnv(env: EnvReader = DEFAULT_ENV): ServerAuthConfig {
  const portalUrl =
    first(env, [
      'BIFROST_PORTAL',
      'BIFROST_PORTAL_URL',
      'NEXT_PUBLIC_BIFROST_PORTAL',
      'VITE_BIFROST_PORTAL',
    ]);

  const orgSlug = first(env, [
    'BIFROST_ORG_SLUG',
    'NEXT_PUBLIC_BIFROST_ORG_SLUG',
    'VITE_BIFROST_ORG_SLUG',
  ]);

  const issuer = first(env, [
    'BIFROST_ISSUER',
    'NEXT_PUBLIC_BIFROST_ISSUER',
    'VITE_BIFROST_ISSUER',
    'AUTH_API_URL',
    'NEXT_PUBLIC_AUTH_API_URL',
    'VITE_AUTH_API_URL',
  ]);

  const authApiUrl = first(env, [
    'AUTH_API_URL',
    'NEXT_PUBLIC_AUTH_API_URL',
    'VITE_AUTH_API_URL',
  ]);

  const clientId =
    first(env, ['BIFROST_CLIENT_ID', 'CLIENT_ID', 'NEXT_PUBLIC_CLIENT_ID', 'VITE_CLIENT_ID', 'NEXT_PUBLIC_BIFROST_CLIENT_ID', 'VITE_BIFROST_CLIENT_ID']) ??
    '';

  const clientSecret =
    first(env, ['BIFROST_CLIENT_SECRET', 'CLIENT_SECRET']) ??
    '';

  const redirectUri =
    first(env, [
      'BIFROST_REDIRECT_URI',
      'REDIRECT_URI',
      'NEXT_PUBLIC_REDIRECT_URI',
      'VITE_REDIRECT_URI',
      'NEXT_PUBLIC_BIFROST_REDIRECT_URI',
      'VITE_BIFROST_REDIRECT_URI',
    ]) ?? 'http://localhost:3000/callback';

  const tenantId = first(env, [
    'BIFROST_TENANT',
    'TENANT_ID',
    'NEXT_PUBLIC_TENANT_ID',
    'VITE_TENANT_ID',
    'NEXT_PUBLIC_BIFROST_TENANT',
  ]);

  const language = first(env, ['BIFROST_LANGUAGE', 'NEXT_PUBLIC_BIFROST_LANGUAGE', 'VITE_BIFROST_LANGUAGE']);

  const oauthPublicUrl = first(env, [
    'OAUTH_PUBLIC_URL',
    'NEXT_PUBLIC_OAUTH_PUBLIC_URL',
    'VITE_OAUTH_PUBLIC_URL',
  ]);

  const apiKey = first(env, ['BIFROST_API_KEY']);
  const resolvedPortal =
    portalUrl ?? (issuer || authApiUrl ? undefined : 'http://localhost:3000');

  return {
    issuer:
      issuer ??
      (resolvedPortal && orgSlug
        ? `${resolvedPortal.replace(/\/$/, '')}/org/${orgSlug}`
        : undefined),
    ...(resolvedPortal ? { portalUrl: resolvedPortal } : {}),
    ...(orgSlug ? { orgSlug } : {}),
    ...(authApiUrl ? { authApiUrl } : {}),
    ...(oauthPublicUrl ? { oauthPublicUrl } : {}),
    clientId,
    clientSecret,
    redirectUri,
    tenantId,
    language,
    apiKey,
  };
}

function errorResponse(err: unknown, fallback: string): Response {
  const message = err instanceof Error ? err.message : fallback;
  const status =
    typeof (err as { status?: number }).status === 'number'
      ? (err as { status: number }).status
      : 502;
  return Response.json({ message }, { status });
}

/** Handler fetch-compatible para POST /api/oauth/token */
export async function handleTokenExchangeRequest(
  request: Request,
  config: ServerAuthConfig,
): Promise<Response> {
  const { code, codeVerifier } = (await request.json()) as {
    code?: string;
    codeVerifier?: string;
  };

  if (!code || !codeVerifier) {
    return Response.json({ message: 'code e codeVerifier são obrigatórios' }, { status: 400 });
  }

  if (!config.clientId || !config.clientSecret) {
    return Response.json(
      { message: 'CLIENT_ID / CLIENT_SECRET não configurados no servidor' },
      { status: 500 },
    );
  }

  try {
    const tokens = await exchangeCodeOnServer(config, code, codeVerifier);
    return Response.json(tokens);
  } catch (err) {
    return errorResponse(err, 'Erro ao trocar tokens');
  }
}

/** Handler fetch-compatible para POST /api/oauth/refresh */
export async function handleRefreshTokenRequest(
  request: Request,
  config: ServerAuthConfig,
): Promise<Response> {
  const { refreshToken } = (await request.json()) as { refreshToken?: string };
  if (!refreshToken) {
    return Response.json({ message: 'refreshToken é obrigatório' }, { status: 400 });
  }
  if (!config.clientId || !config.clientSecret) {
    return Response.json(
      { message: 'CLIENT_ID / CLIENT_SECRET não configurados no servidor' },
      { status: 500 },
    );
  }
  try {
    const tokens = await refreshTokensOnServer(config, refreshToken);
    return Response.json(tokens);
  } catch (err) {
    return errorResponse(err, 'Erro ao renovar tokens');
  }
}

/** Handler fetch-compatible para POST /api/oauth/revoke */
export async function handleRevokeTokenRequest(
  request: Request,
  config: ServerAuthConfig,
): Promise<Response> {
  const { token } = (await request.json()) as { token?: string };
  if (!token) {
    return Response.json({ message: 'token é obrigatório' }, { status: 400 });
  }
  try {
    await revokeTokenOnServer(config, token);
    return Response.json({ success: true });
  } catch (err) {
    return errorResponse(err, 'Erro ao revogar token');
  }
}

/** Handler fetch-compatible para GET /api/config */
export function handlePublicConfigRequest(config: ServerAuthConfig): Response {
  if (!config.clientId) {
    return Response.json({ message: 'CLIENT_ID não configurado' }, { status: 500 });
  }
  try {
    return Response.json(getPublicConfigFromServer(config));
  } catch (err) {
    return errorResponse(err, 'Configuração Bifrost incompleta');
  }
}

export {
  exchangeCodeOnServer,
  getPublicConfigFromServer,
  refreshTokensOnServer,
  revokeTokenOnServer,
};
