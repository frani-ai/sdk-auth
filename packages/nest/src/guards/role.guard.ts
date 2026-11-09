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
  META_ROLES,
  META_SCOPES,
  REQUEST_USER_KEY,
} from '../constants.js';
import type { BifrostAuthModuleOptions, RolesDecoratorOptions } from '../interfaces.js';

@Injectable()
export class RoleGuard implements CanActivate {
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

    const rolesMeta = this.reflector.getAllAndOverride<RolesDecoratorOptions | undefined>(
      META_ROLES,
      [context.getHandler(), context.getClass()],
    );
    const resource = this.reflector.getAllAndOverride<string | undefined>(META_RESOURCE, [
      context.getHandler(),
      context.getClass(),
    ]);
    const scopes = this.reflector.getAllAndOverride<string[] | undefined>(META_SCOPES, [
      context.getHandler(),
      context.getClass(),
    ]);

    const hasScopeReq = Boolean(resource && scopes?.length);
    const hasRoleReq = Boolean(rolesMeta?.roles?.length);
    const policy = this.options.policyEnforcement ?? 'permissive';

    if (!hasRoleReq) {
      if (policy === 'enforcing' && !hasScopeReq) {
        throw new ForbiddenException('Rota sem @Scopes/@Roles sob policy enforcing');
      }
      return true;
    }

    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const user = request[REQUEST_USER_KEY] as VerifiedAccessToken | undefined;
    if (!user) {
      throw new ForbiddenException('Utilizador não autenticado');
    }

    const decision = evaluateAuthz(
      {
        permissions: permissionsFromClaims(user as unknown as Record<string, unknown>),
        roles: rolesFromClaims(user as unknown as Record<string, unknown>),
      },
      {
        roles: rolesMeta!.roles,
        rolesMode: (rolesMeta!.mode ?? 'any') as RoleMatchingMode,
      },
      {
        authenticated: true,
        policyEnforcement: 'permissive',
      },
    );

    if (!decision.allowed) {
      throw new ForbiddenException(decision.reason);
    }
    return true;
  }
}
