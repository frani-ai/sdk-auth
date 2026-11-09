export {
  readAuthConfigFromEnv,
  handleTokenExchangeRequest,
  handleRefreshTokenRequest,
  handleRevokeTokenRequest,
  handlePublicConfigRequest,
  exchangeCodeOnServer,
  getPublicConfigFromServer,
  refreshTokensOnServer,
  revokeTokenOnServer,
  type EnvReader,
} from './handlers.js';

export { verifyAccessToken, type VerifiedAccessToken } from './verify.js';

export {
  BifrostProvisioningClient,
  createProvisioningClientFromEnv,
  type BifrostProvisioningConfig,
} from './provision.js';

export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requirePermission,
  permissionKey,
  permissionsFromClaims,
} from '../permissions.js';
export {
  hasRole,
  hasAnyRole,
  hasAllRoles,
  matchRoles,
  requireRole,
  rolesFromClaims,
  type RoleMatchingMode,
} from '../roles.js';
export {
  evaluateAuthz,
  assertAuthz,
  type AuthzRequirement,
  type AuthzSubject,
  type AuthzDecision,
  type EvaluateAuthzOptions,
  type PolicyEnforcementMode,
} from '../authorize.js';

export type {
  ServerAuthConfig,
  PublicAuthConfig,
  AccessTokenClaims,
  OAuthClientType,
  AcrLevel,
} from '../types.js';
