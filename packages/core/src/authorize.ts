import { hasAllPermissions, hasAnyPermission, permissionKey } from './permissions.js';
import { matchRoles, type RoleMatchingMode } from './roles.js';
import { FraniAuthError } from './types.js';

export type PolicyEnforcementMode = 'permissive' | 'enforcing';

export interface AuthzRequirement {
  /** Resource name from `@Resource` (combined with each scope → `resource:action`). */
  resource?: string;
  /** Actions / scopes required on the resource. */
  scopes?: string[];
  /** When true, all scopes are required; default any. */
  scopesMode?: RoleMatchingMode;
  roles?: string[];
  rolesMode?: RoleMatchingMode;
}

export interface AuthzSubject {
  permissions?: string[];
  roles?: string[];
}

export interface EvaluateAuthzOptions {
  policyEnforcement?: PolicyEnforcementMode;
  /** Route marked `@Public` — always allow. */
  isPublic?: boolean;
  /** Caller already authenticated (AuthGuard passed). */
  authenticated?: boolean;
}

export type AuthzDecision =
  | { allowed: true }
  | { allowed: false; status: 401 | 403; reason: string };

function permissionChecks(resource: string | undefined, scopes: string[] | undefined) {
  if (!resource || !scopes?.length) return [];
  return scopes.map((action) => ({ resource, action }));
}

/**
 * Avalia permissions (`resource:action`) e roles juntos.
 * - Sem requisitos e policy `permissive` → allow (se autenticado ou público).
 * - Sem requisitos e policy `enforcing` → deny 403.
 */
export function evaluateAuthz(
  subject: AuthzSubject,
  requirement: AuthzRequirement,
  options: EvaluateAuthzOptions = {},
): AuthzDecision {
  if (options.isPublic) return { allowed: true };

  if (options.authenticated === false) {
    return { allowed: false, status: 401, reason: 'Não autenticado' };
  }

  const checks = permissionChecks(requirement.resource, requirement.scopes);
  const hasScopeReq = checks.length > 0;
  const hasRoleReq = (requirement.roles?.length ?? 0) > 0;
  const policy = options.policyEnforcement ?? 'permissive';

  if (!hasScopeReq && !hasRoleReq) {
    if (policy === 'enforcing') {
      return {
        allowed: false,
        status: 403,
        reason: 'Rota sem @Scopes/@Roles sob policy enforcing',
      };
    }
    return { allowed: true };
  }

  if (hasScopeReq) {
    const mode = requirement.scopesMode ?? 'any';
    const ok =
      mode === 'all'
        ? hasAllPermissions(subject.permissions, checks)
        : hasAnyPermission(subject.permissions, checks);
    if (!ok) {
      const needed = checks.map((c) => permissionKey(c.resource, c.action)).join(', ');
      return {
        allowed: false,
        status: 403,
        reason: `Permissão insuficiente: ${needed}`,
      };
    }
  }

  if (hasRoleReq) {
    const ok = matchRoles(
      subject.roles,
      requirement.roles ?? [],
      requirement.rolesMode ?? 'any',
    );
    if (!ok) {
      return {
        allowed: false,
        status: 403,
        reason: `Role insuficiente: ${(requirement.roles ?? []).join(', ')}`,
      };
    }
  }

  return { allowed: true };
}

/** Atalho que lança `FraniAuthError` quando `evaluateAuthz` nega. */
export function assertAuthz(
  subject: AuthzSubject,
  requirement: AuthzRequirement,
  options?: EvaluateAuthzOptions,
): void {
  const decision = evaluateAuthz(subject, requirement, options);
  if (!decision.allowed) {
    throw new FraniAuthError(decision.reason, decision.status);
  }
}
