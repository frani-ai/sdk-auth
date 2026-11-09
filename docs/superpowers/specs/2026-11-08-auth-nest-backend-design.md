# Bifrost Auth Backend — Design

**Date:** 2026-11-08  
**Status:** approved

## Goal

Protect backend APIs with Bifrost access tokens: validate JWT (JWKS) and authorize routes by **permissions** (`resource:action`) and **roles**, with NestJS decorators/guards inspired by [nest-keycloak-connect](https://github.com/ferrerojosh/nest-keycloak-connect), plus framework-agnostic helpers for non-Nest apps.

## Packages

| Package | Role |
|---------|------|
| `@frani-ai/auth-sdk` | Core: `verifyAccessToken`, permission + role helpers, claims types (`acr`/`amr`) |
| `@frani-ai/auth-sdk/server` | Same server exports; no Nest coupling |
| `@frani-ai/auth-nest` (new) | Nest module, guards, decorators |

## Nest API (target UX)

```ts
BifrostAuthModule.register({
  issuer: 'https://identity-hml.frani.com.br/org/frani', // or portalUrl + orgSlug
  clientId: 'my-api-client-id',
  policyEnforcement: 'permissive', // | 'enforcing'
  tokenValidation: 'offline',      // JWKS only in v1
});

// APP_GUARD order: AuthGuard → PermissionGuard → RoleGuard

@Public()
@Resource('posts')
@Scopes('read') // posts:read or posts:manage
@Roles({ roles: ['admin'], mode: 'any' }) // any | all
@CurrentUser() user
@AccessToken() rawJwt
```

## Behavior

- **AuthGuard:** extract Bearer; verify RS256 via JWKS; attach user + token to request; missing/invalid → 401; `@Public()` skips.
- **PermissionGuard:** if `@Resource` + `@Scopes` present, require `resource:action` (and `resource:manage` wildcard).
- **RoleGuard:** if `@Roles` present, require claim roles with `any`/`all` matching.
- **Permissive:** authenticated routes without authz decorators pass.
- **Enforcing:** authenticated routes must have at least one of `@Scopes`/`@Roles` (or controller-level `@Resource` with method scopes).
- **Without Nest:** use `verifyAccessToken` + `hasPermission` / `hasRole` in middleware.

## Non-goals (v1)

- Keycloak Authorization Services / remote policy endpoint
- Nest token-exchange BFF (already in auth-next)
- Online introspect validation (optional later)
- DCR, Device Code, PAR

## Constraints

- Speak only to public portal/issuer URLs (never internal Nest/API hosts in docs).
- Peer deps Nest optional for nest package; core stays free of Nest.
- `manage` continues to cover any action on a resource.
