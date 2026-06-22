import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import {
  handlePublicConfigRequest,
  handleTokenExchangeRequest,
  readAuthConfigFromEnv,
  type EnvReader,
} from '@frani/auth-sdk/server';

export interface FraniAuthVitePluginOptions {
  /** Prefixo das rotas proxy (default: /api) */
  apiPrefix?: string;
  /** Leitor de env customizado (default: process.env) */
  env?: EnvReader;
}

/**
 * Plugin Vite — expõe /api/config e /api/oauth/token em dev
 * para trocar tokens sem expor client_secret no browser.
 */
export function franiAuthVitePlugin(options: FraniAuthVitePluginOptions = {}): Plugin {
  const apiPrefix = options.apiPrefix ?? '/api';
  const configPath = `${apiPrefix}/config`;
  const tokenPath = `${apiPrefix}/oauth/token`;

  return {
    name: 'frani-auth-vite',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url?.split('?')[0];
        if (!url || !req.method) return next();

        const env = options.env ?? ((key: string) => process.env[key]);
        const config = readAuthConfigFromEnv(env);

        if (url === configPath && req.method === 'GET') {
          const response = handlePublicConfigRequest(config);
          const body = await response.text();
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(body);
          return;
        }

        if (url === tokenPath && req.method === 'POST') {
          let raw = '';
          req.on('data', (chunk: Buffer) => {
            raw += chunk.toString('utf8');
          });
          req.on('end', async () => {
            try {
              const request = new Request(`http://localhost${tokenPath}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: raw,
              });
              const response = await handleTokenExchangeRequest(request, config);
              const body = await response.text();
              res.statusCode = response.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(body);
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ message: err instanceof Error ? err.message : 'Erro interno' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}
