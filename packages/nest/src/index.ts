export { BifrostAuthModule, type BifrostAuthRegisterOptions } from './auth.module.js';
export {
  Public,
  Resource,
  Scopes,
  Roles,
  CurrentUser,
  AccessToken,
} from './decorators.js';
export { AuthGuard } from './guards/auth.guard.js';
export { PermissionGuard } from './guards/permission.guard.js';
export { RoleGuard } from './guards/role.guard.js';
export {
  BIFROST_AUTH_OPTIONS,
  REQUEST_USER_KEY,
  REQUEST_ACCESS_TOKEN_KEY,
} from './constants.js';
export type {
  BifrostAuthModuleOptions,
  BifrostAuthModuleAsyncOptions,
  BifrostAuthOptionsFactory,
  RolesDecoratorOptions,
  ScopesDecoratorOptions,
  TokenValidationMode,
} from './interfaces.js';
