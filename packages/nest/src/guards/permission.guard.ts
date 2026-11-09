import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  evaluateAuthz,
  permissionsFromClaims,
  rolesFromClaims,
  type RoleMatchingMode,
} from '@frani-ai/auth-sdk';
import type { VerifiedAccessToken } from '@frani-ai/auth-sdk/server';
import {
  BIFROST_AUTH_OPTIONS,
  META_PUBLIC,
  META_RESOURCE,
  META_SCOPES,
  META_SCOPES_MODE,
  REQUEST_USER_KEY,
} from '../constants.js';
import type { BifrostAuthModuleOptions } from '../interfaces.js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(BIFROST_AUTH_OPTIONS)
    private readonly options: BifrostAuthModuleOptions,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(META_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const resource = this.reflector.getAllAndOverride<string | undefined>(META_RESOURCE, [
      context.getHandler(),
      context.getClass(),
    ]);
    const scopes = this.reflector.getAllAndOverride<string[] | undefined>(META_SCOPES, [
      context.getHandler(),
      context.getClass(),
    ]);
    const scopesMode = this.reflector.getAllAndOverride<RoleMatchingMode | undefined>(
      META_SCOPES_MODE,
      [context.getHandler(), context.getClass()],
    );

    // Sem @Resource/@Scopes: RoleGuard / policy enforcing tratam o resto.
    if (!resource || !scopes?.length) return true;

    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const user = request[REQUEST_USER_KEY] as VerifiedAccessToken | undefined;
    if (!user) {
      throw new ForbiddenException('Utilizador não autenticado');
    }

    const decision = evaluateAuthz(
      {
        permissions: permissionsFromClaims(user as Record<string, unknown>),
        roles: rolesFromClaims(user as Record<string, unknown>),
      },
      {
        resource,
        scopes,
        scopesMode: scopesMode ?? 'any',
      },
      {
        authenticated: true,
        policyEnforcement: this.options.policyEnforcement ?? 'permissive',
      },
    );

    if (!decision.allowed) {
      throw new ForbiddenException(decision.reason);
    }
    return true;
  }
}
