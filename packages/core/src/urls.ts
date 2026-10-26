export const BIFROST_PORTALS = {
  hml: 'https://identity-hml.frani.com.br',
  prod: 'https://identity.frani.com.br',
  local: 'http://localhost:3000',
} as const;

export const DEFAULT_OAUTH_SCOPES = 'openid profile email offline_access';

export function stripSlash(url: string): string {
  return url.replace(/\/$/, '');
}

export function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return stripSlash(url);
  }
}

export function bifrostIssuer(portalUrl: string, orgSlug: string): string {
  return `${stripSlash(portalUrl)}/org/${orgSlug.trim()}`;
}

export interface ResolvedBifrostUrls {
  /** Issuer OIDC, ex.: https://identity.frani.com.br/org/frani */
  issuer: string;
  /** Origem do portal, ex.: https://identity.frani.com.br */
  portalUrl: string;
  /** BFF `/api` para login embedded, app-config, SSO e provision. */
  authApiUrl: string;
}

export function resolveBifrostUrls(config: {
  issuer?: string;
  portalUrl?: string;
  orgSlug?: string;
  authApiUrl?: string;
  oauthPublicUrl?: string;
}): ResolvedBifrostUrls {
  const portal = config.portalUrl ? stripSlash(config.portalUrl) : '';
  const slug = config.orgSlug?.trim();
  const fromParts = portal && slug ? bifrostIssuer(portal, slug) : '';
  const issuer = stripSlash(
    config.issuer || fromParts || config.oauthPublicUrl || config.authApiUrl || '',
  );
  const portalUrl = portal || (issuer ? originOf(issuer) : '');
  const authApiUrl = stripSlash(
    config.authApiUrl || (portalUrl ? `${portalUrl}/api` : issuer),
  );

  if (!issuer && !authApiUrl) {
    throw new Error(
      'Configure `issuer` (ex.: https://identity-hml.frani.com.br/org/SEU_SLUG) ou `portalUrl` + `orgSlug`.',
    );
  }

  return {
    issuer: issuer || authApiUrl,
    portalUrl,
    authApiUrl: authApiUrl || issuer,
  };
}
