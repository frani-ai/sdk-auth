import {
  handlePublicConfigRequest,
  handleTokenExchangeRequest,
  readAuthConfigFromEnv,
  type EnvReader,
  type ServerAuthConfig,
} from '@frani/auth-sdk/server';

export { readAuthConfigFromEnv, type EnvReader, type ServerAuthConfig };

export function createTokenExchangeHandler(config?: ServerAuthConfig) {
  const resolved = config ?? readAuthConfigFromEnv();
  return {
    dynamic: 'force-dynamic' as const,
    POST: (request: Request) => handleTokenExchangeRequest(request, resolved),
  };
}

export function createPublicConfigHandler(config?: ServerAuthConfig) {
  const resolved = config ?? readAuthConfigFromEnv();
  return {
    dynamic: 'force-dynamic' as const,
    GET: () => handlePublicConfigRequest(resolved),
  };
}

/** Cria handlers para App Router: config + token exchange. */
export function createFraniAuthHandlers(config?: ServerAuthConfig) {
  return {
    config: createPublicConfigHandler(config),
    token: createTokenExchangeHandler(config),
  };
}
