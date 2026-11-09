import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyAccessToken, type VerifiedAccessToken } from '@frani-ai/auth-sdk/server';
import {
  BIFROST_AUTH_OPTIONS,
  META_PUBLIC,
  REQUEST_ACCESS_TOKEN_KEY,
  REQUEST_USER_KEY,
} from '../constants.js';
import type { BifrostAuthModuleOptions } from '../interfaces.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(BIFROST_AUTH_OPTIONS)
    private readonly options: BifrostAuthModuleOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(META_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Bearer token em falta');
    }

    try {
      const user: VerifiedAccessToken = await verifyAccessToken(token, {
        issuer: this.options.issuer,
        portalUrl: this.options.portalUrl,
        orgSlug: this.options.orgSlug,
        authApiUrl: this.options.authApiUrl,
        clientId: this.options.clientId,
      });
      request[REQUEST_USER_KEY] = user;
      request[REQUEST_ACCESS_TOKEN_KEY] = token;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token inválido';
      throw new UnauthorizedException(message);
    }
  }

  private extractToken(request: Record<string, unknown>): string | null {
    const headers = (request.headers ?? {}) as Record<string, string | string[] | undefined>;
    const auth = headers.authorization ?? headers.Authorization;
    const header = Array.isArray(auth) ? auth[0] : auth;
    if (typeof header === 'string') {
      const [scheme, value] = header.split(/\s+/);
      if (scheme?.toLowerCase() === 'bearer' && value) return value.trim();
    }

    const cookieKey = this.options.cookieKey;
    if (cookieKey) {
      const cookies = request.cookies as Record<string, string> | undefined;
      const fromCookie = cookies?.[cookieKey];
      if (fromCookie) return fromCookie;
    }
    return null;
  }
}
