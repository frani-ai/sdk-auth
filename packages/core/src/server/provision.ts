import {
  FraniAuthError,
  type ProvisionedTenant,
  type ProvisionedUser,
  type ProvisionTenantInput,
  type ProvisionUserInput,
} from '../types.js';
import { resolveBifrostUrls, stripSlash } from '../urls.js';

export interface BifrostProvisioningConfig {
  portalUrl: string;
  apiKey: string;
}

export class BifrostProvisioningClient {
  private readonly portalUrl: string;
  private readonly apiKey: string;

  constructor(config: BifrostProvisioningConfig) {
    if (typeof window !== 'undefined') {
      throw new FraniAuthError(
        'BifrostProvisioningClient só pode ser usado no servidor. A API key nunca vai para o browser.',
      );
    }
    if (!config.apiKey?.trim()) {
      throw new FraniAuthError('BIFROST_API_KEY (sk_…) é obrigatória');
    }
    this.portalUrl = stripSlash(config.portalUrl);
    this.apiKey = config.apiKey.trim();
  }

  /** Cria (ou reusa) tenant + utilizador no fim de um wizard de workspace. */
  async provision(input: {
    tenant: ProvisionTenantInput;
    user: ProvisionUserInput;
    applicationId?: string;
  }): Promise<{ tenant: ProvisionedTenant; user: ProvisionedUser }> {
    return this.post('/api/system/provision', input);
  }

  async createTenant(input: ProvisionTenantInput & { applicationId?: string }): Promise<ProvisionedTenant> {
    return this.post('/api/system/tenants', input);
  }

  async createUser(input: ProvisionUserInput): Promise<ProvisionedUser> {
    return this.post('/api/system/users', input);
  }

  async findTenantBySlug(slug: string, applicationId?: string): Promise<ProvisionedTenant> {
    const params = new URLSearchParams({ slug });
    if (applicationId) params.set('applicationId', applicationId);
    return this.get(`/api/system/tenants/by-slug?${params.toString()}`);
  }

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Api-Key': this.apiKey,
    };
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.portalUrl}${path}`, { headers: this.headers() });
    return parseProvisionResponse<T>(res);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.portalUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    return parseProvisionResponse<T>(res);
  }
}

export function createProvisioningClientFromEnv(env: (key: string) => string | undefined = (key) => process.env[key]): BifrostProvisioningClient {
  const urls = resolveBifrostUrls({
    issuer: env('BIFROST_ISSUER') ?? env('NEXT_PUBLIC_BIFROST_ISSUER'),
    portalUrl:
      env('BIFROST_PORTAL') ??
      env('BIFROST_PORTAL_URL') ??
      env('NEXT_PUBLIC_BIFROST_PORTAL'),
    orgSlug: env('BIFROST_ORG_SLUG') ?? env('NEXT_PUBLIC_BIFROST_ORG_SLUG'),
  });
  const apiKey = env('BIFROST_API_KEY') ?? env('AUTH_API_KEY') ?? '';
  return new BifrostProvisioningClient({ portalUrl: urls.portalUrl, apiKey });
}

async function parseProvisionResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new FraniAuthError(
      (body as { message?: string }).message ?? `Provision failed (${res.status})`,
      res.status,
      body,
    );
  }
  return body as T;
}
