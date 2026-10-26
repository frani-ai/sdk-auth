import {
  handlePublicConfigRequest,
  handleRefreshTokenRequest,
  handleRevokeTokenRequest,
  handleTokenExchangeRequest,
  readAuthConfigFromEnv,
  type EnvReader,
  type ServerAuthConfig,
} from '@frani-ai/auth-sdk/server';

export { readAuthConfigFromEnv, type EnvReader, type ServerAuthConfig };

export {
  verifyAccessToken,
  BifrostProvisioningClient,
  createProvisioningClientFromEnv,
} from '@frani-ai/auth-sdk/server';

export function createTokenExchangeHandler(config?: ServerAuthConfig) {
  const resolved = config ?? readAuthConfigFromEnv();
  return {
    dynamic: 'force-dynamic' as const,
    POST: (request: Request) => handleTokenExchangeRequest(request, resolved),
  };
}

export function createRefreshTokenHandler(config?: ServerAuthConfig) {
  const resolved = config ?? readAuthConfigFromEnv();
  return {
    dynamic: 'force-dynamic' as const,
    POST: (request: Request) => handleRefreshTokenRequest(request, resolved),
  };
}

export function createRevokeTokenHandler(config?: ServerAuthConfig) {
  const resolved = config ?? readAuthConfigFromEnv();
  return {
    dynamic: 'force-dynamic' as const,
    POST: (request: Request) => handleRevokeTokenRequest(request, resolved),
  };
}

export function createPublicConfigHandler(config?: ServerAuthConfig) {
  const resolved = config ?? readAuthConfigFromEnv();
  return {
    dynamic: 'force-dynamic' as const,
    GET: () => handlePublicConfigRequest(resolved),
  };
}

/** Cria handlers para App Router: config + token + refresh + revoke. */
export function createFraniAuthHandlers(config?: ServerAuthConfig) {
  return {
    config: createPublicConfigHandler(config),
    token: createTokenExchangeHandler(config),
    refresh: createRefreshTokenHandler(config),
    revoke: createRevokeTokenHandler(config),
  };
}
