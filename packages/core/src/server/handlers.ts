import {
  exchangeCodeOnServer,
  getPublicConfigFromServer,
} from '../client.js';
import type { ServerAuthConfig } from '../types.js';

export type EnvReader = (key: string) => string | undefined;

const DEFAULT_ENV: EnvReader = (key) =>
  typeof process !== 'undefined' ? process.env[key] : undefined;

/** Lê config a partir de variáveis de ambiente (runtime). */
export function readAuthConfigFromEnv(env: EnvReader = DEFAULT_ENV): ServerAuthConfig {
  const authApiUrl =
    env('AUTH_API_URL') ??
    env('NEXT_PUBLIC_AUTH_API_URL') ??
    env('VITE_AUTH_API_URL') ??
    'http://localhost:3001/authenticate';

  const clientId =
    env('CLIENT_ID') ?? env('NEXT_PUBLIC_CLIENT_ID') ?? env('VITE_CLIENT_ID') ?? '';

  const clientSecret =
    env('CLIENT_SECRET') ??
    env('NEXT_PUBLIC_CLIENT_SECRET') ??
    env('VITE_CLIENT_SECRET') ??
    '';

  const redirectUri =
    env('REDIRECT_URI') ??
    env('NEXT_PUBLIC_REDIRECT_URI') ??
    env('VITE_REDIRECT_URI') ??
    'http://localhost:3000/callback';

  const tenantId =
    env('TENANT_ID') ?? env('NEXT_PUBLIC_TENANT_ID') ?? env('VITE_TENANT_ID');

  return { authApiUrl, clientId, clientSecret, redirectUri, tenantId };
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
    const message = err instanceof Error ? err.message : 'Erro ao trocar tokens';
    const status = typeof (err as { status?: number }).status === 'number'
      ? (err as { status: number }).status
      : 502;
    return Response.json({ message }, { status });
  }
}

/** Handler fetch-compatible para GET /api/config */
export function handlePublicConfigRequest(config: ServerAuthConfig): Response {
  if (!config.clientId) {
    return Response.json({ message: 'CLIENT_ID não configurado' }, { status: 500 });
  }
  return Response.json(getPublicConfigFromServer(config));
}

export { exchangeCodeOnServer, getPublicConfigFromServer };
