import type {
  PolicyEnforcementMode,
  RoleMatchingMode,
} from '@frani-ai/auth-sdk';

export type TokenValidationMode = 'offline';

export interface BifrostAuthModuleOptions {
  /**
   * Issuer OIDC público, ex.: `https://identity-hml.frani.com.br/org/frani`.
   * Alternativa: `portalUrl` + `orgSlug`.
   */
  issuer?: string;
  portalUrl?: string;
  orgSlug?: string;
  /** @deprecated Prefer `issuer`. */
  authApiUrl?: string;
  /** client_id da aplicação Bifrost (também usado como `aud` do JWT). */
  clientId: string;
  /**
   * `permissive` (default): rotas autenticadas sem @Scopes/@Roles passam.
   * `enforcing`: exige pelo menos um critério de autorização.
   */
  policyEnforcement?: PolicyEnforcementMode;
  /** v1: só JWKS offline. */
  tokenValidation?: TokenValidationMode;
  /** Cookie name if Bearer header is absent (optional). */
  cookieKey?: string;
}

export interface BifrostAuthOptionsFactory {
  createBifrostAuthOptions():
    | Promise<BifrostAuthModuleOptions>
    | BifrostAuthModuleOptions;
}

export interface BifrostAuthModuleAsyncOptions {
  imports?: unknown[];
  useExisting?: new (...args: never[]) => BifrostAuthOptionsFactory;
  useClass?: new (...args: never[]) => BifrostAuthOptionsFactory;
  useFactory?: (
    ...args: unknown[]
  ) => Promise<BifrostAuthModuleOptions> | BifrostAuthModuleOptions;
  inject?: unknown[];
}

export interface RolesDecoratorOptions {
  roles: string[];
  mode?: RoleMatchingMode;
}

export interface ScopesDecoratorOptions {
  scopes: string[];
  mode?: RoleMatchingMode;
}
