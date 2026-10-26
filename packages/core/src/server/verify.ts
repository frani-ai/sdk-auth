import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { FraniAuthError, type AccessTokenClaims, type ServerAuthConfig } from '../types.js';
import { resolveBifrostUrls } from '../urls.js';

export type VerifiedAccessToken = JWTPayload & AccessTokenClaims;

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwksForIssuer(issuer: string) {
  const key = issuer.replace(/\/$/, '');
  let jwks = jwksCache.get(key);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${key}/.well-known/jwks.json`));
    jwksCache.set(key, jwks);
  }
  return jwks;
}

/**
 * Valida access token RS256 via JWKS do issuer.
 * Rejeita `id_token` (`typ !== access`) como Bearer da API.
 */
export async function verifyAccessToken(
  token: string,
  config: Pick<ServerAuthConfig, 'issuer' | 'portalUrl' | 'orgSlug' | 'authApiUrl' | 'clientId'>,
): Promise<VerifiedAccessToken> {
  const { issuer } = resolveBifrostUrls(config);
  const { payload } = await jwtVerify(token, jwksForIssuer(issuer), {
    issuer,
    audience: config.clientId,
    algorithms: ['RS256'],
  });
  if (payload.typ && payload.typ !== 'access') {
    throw new FraniAuthError('Token is not an access token', 401);
  }
  return payload as VerifiedAccessToken;
}
