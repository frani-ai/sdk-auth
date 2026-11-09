import { FraniAuthError } from './types.js';

export type RoleMatchingMode = 'any' | 'all';

/** Verifica se a lista de roles do token inclui `role`. */
export function hasRole(roles: string[] | undefined, role: string): boolean {
  if (!roles?.length || !role) return false;
  return roles.includes(role);
}

export function hasAnyRole(roles: string[] | undefined, needed: string[]): boolean {
  if (!needed.length) return true;
  return needed.some((role) => hasRole(roles, role));
}

export function hasAllRoles(roles: string[] | undefined, needed: string[]): boolean {
  if (!needed.length) return true;
  return needed.every((role) => hasRole(roles, role));
}

export function matchRoles(
  roles: string[] | undefined,
  needed: string[],
  mode: RoleMatchingMode = 'any',
): boolean {
  return mode === 'all' ? hasAllRoles(roles, needed) : hasAnyRole(roles, needed);
}

/**
 * Lança `FraniAuthError` (403) se a role estiver em falta.
 */
export function requireRole(roles: string[] | undefined, role: string): void {
  if (!hasRole(roles, role)) {
    throw new FraniAuthError(`Role insuficiente: ${role}`, 403);
  }
}

/** Extrai `roles` de um payload JWT já parseado. */
export function rolesFromClaims(
  claims: Record<string, unknown> | null | undefined,
): string[] {
  if (!claims) return [];
  const raw = claims.roles;
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is string => typeof r === 'string');
}
