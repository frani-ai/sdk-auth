import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { RoleMatchingMode } from '@frani-ai/auth-sdk';
import {
  META_PUBLIC,
  META_RESOURCE,
  META_ROLES,
  META_SCOPES,
  META_SCOPES_MODE,
  REQUEST_ACCESS_TOKEN_KEY,
  REQUEST_USER_KEY,
} from './constants.js';
import type { RolesDecoratorOptions } from './interfaces.js';

/** Marca a rota como pública (sem Bearer). */
export const Public = () => SetMetadata(META_PUBLIC, true);

/** Nome do resource Bifrost (combinado com `@Scopes` → `resource:action`). */
export const Resource = (name: string) => SetMetadata(META_RESOURCE, name);

function applyScopes(
  scopes: string[],
  mode: RoleMatchingMode = 'any',
): MethodDecorator & ClassDecorator {
  const setScopes = SetMetadata(META_SCOPES, scopes);
  const setMode = SetMetadata(META_SCOPES_MODE, mode);
  return ((target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    setScopes(target, key!, descriptor!);
    setMode(target, key!, descriptor!);
    return descriptor as PropertyDescriptor;
  }) as MethodDecorator & ClassDecorator;
}

/** Actions exigidas no resource (ex.: `@Scopes('read', 'update')`). */
export function Scopes(...scopes: string[]): MethodDecorator & ClassDecorator;
export function Scopes(options: {
  scopes: string[];
  mode?: RoleMatchingMode;
}): MethodDecorator & ClassDecorator;
export function Scopes(
  ...args: Array<string | { scopes: string[]; mode?: RoleMatchingMode }>
): MethodDecorator & ClassDecorator {
  if (args.length === 1 && typeof args[0] === 'object') {
    const opts = args[0];
    return applyScopes(opts.scopes, opts.mode ?? 'any');
  }
  return applyScopes(args as string[], 'any');
}

/** Roles do claim JWT. Default mode = `any`. */
export function Roles(options: RolesDecoratorOptions): MethodDecorator & ClassDecorator;
export function Roles(...roles: string[]): MethodDecorator & ClassDecorator;
export function Roles(
  ...args: Array<string | RolesDecoratorOptions>
): MethodDecorator & ClassDecorator {
  if (args.length === 1 && typeof args[0] === 'object') {
    const opts = args[0];
    return SetMetadata(META_ROLES, {
      roles: opts.roles,
      mode: opts.mode ?? 'any',
    });
  }
  return SetMetadata(META_ROLES, {
    roles: args as string[],
    mode: 'any' as RoleMatchingMode,
  });
}

function requestFromContext(ctx: ExecutionContext): Record<string, unknown> {
  return ctx.switchToHttp().getRequest<Record<string, unknown>>();
}

/** Claims verificados do access token. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    requestFromContext(ctx)[REQUEST_USER_KEY],
);

/** JWT Bearer cru. */
export const AccessToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    requestFromContext(ctx)[REQUEST_ACCESS_TOKEN_KEY],
);
