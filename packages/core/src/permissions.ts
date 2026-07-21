import { FraniAuthError } from './types.js';

/** Formato JWT / claim: `resource:action` (ex.: `posts:read`). */
export function permissionKey(resource: string, action: string): string {
  return `${resource}:${action}`;
}

/**
 * Verifica se a lista de permissions (claim do access token) inclui `resource:action`.
 * `resource:manage` cobre qualquer action desse resource.
 */
export function hasPermission(
  permissions: string[] | undefined,
  resource: string,
  action: string,
): boolean {
  if (!permissions?.length || !resource || !action) return false;
  const needed = permissionKey(resource, action);
  if (permissions.includes(needed)) return true;
  return permissions.includes(permissionKey(resource, 'manage'));
}

export function hasAnyPermission(
  permissions: string[] | undefined,
  checks: Array<{ resource: string; action: string }>,
): boolean {
  return checks.some((c) => hasPermission(permissions, c.resource, c.action));
}

export function hasAllPermissions(
  permissions: string[] | undefined,
  checks: Array<{ resource: string; action: string }>,
): boolean {
  return checks.every((c) => hasPermission(permissions, c.resource, c.action));
}

/**
 * Lança `FraniAuthError` se a permission estiver em falta.
 * Útil em guards de UI / middleware de apps de terceiros.
 */
export function requirePermission(
  permissions: string[] | undefined,
  resource: string,
  action: string,
): void {
  if (!hasPermission(permissions, resource, action)) {
    throw new FraniAuthError(
      `Permissão insuficiente: ${permissionKey(resource, action)}`,
      403,
    );
  }
}

/** Extrai `permissions` de um payload JWT já parseado. */
export function permissionsFromClaims(
  claims: Record<string, unknown> | null | undefined,
): string[] {
  if (!claims) return [];
  const raw = claims.permissions;
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is string => typeof p === 'string');
}
