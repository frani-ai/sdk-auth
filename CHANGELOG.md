# Changelog

Todas as alterações relevantes deste repositório são documentadas neste ficheiro.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

## [0.3.0] - 2026-11-09

### Added

#### `@frani-ai/auth-nest` (novo pacote)
- Módulo NestJS `BifrostAuthModule.register` / `registerAsync` para proteger APIs com JWT Bifrost.
- Guards globais (ordem): `AuthGuard` → `PermissionGuard` → `RoleGuard`.
- Decorators: `@Public()`, `@Resource()`, `@Scopes()`, `@Roles()`, `@CurrentUser()`, `@AccessToken()`.
- Opções `policyEnforcement` (`permissive` | `enforcing`) e validação de token offline via JWKS.
- README do pacote com exemplos Nest e uso sem Nest (`verifyAccessToken` + `assertAuthz`).

#### `@frani-ai/auth-sdk` (core)
- Helpers de roles: `hasRole`, `hasAnyRole`, `hasAllRoles`, `matchRoles`, `requireRole`, `rolesFromClaims`.
- Avaliação conjunta de permissions + roles: `evaluateAuthz`, `assertAuthz` (`packages/core/src/authorize.ts`).
- Tipos `OAuthClientType`, `AcrLevel`; claims `acr` / `amr` em `AccessTokenClaims` e `UserInfo`.
- Campo `recoveryCodesRemaining` em `UserInfo`.
- `acr_values`, `prompt`, `login_hint` e `max_age` em `buildAuthorizeUrl`.
- Suporte a client **public** vs **confidential** no exchange/refresh/revoke e em `ServerAuthConfig` / env (`BIFROST_CLIENT_TYPE`).
- Métodos no `FraniAuthClient`: `getRoles`, `hasRole`, `hasAnyRole`, `requireRole`.
- Reexports de authorize/roles/permissions em `@frani-ai/auth-sdk/server`.

#### Docs e CI
- Design: `docs/superpowers/specs/2026-11-08-auth-nest-backend-design.md`
- Plano: `docs/superpowers/plans/2026-11-08-auth-nest-backend.md`
- README raiz atualizado (Nest, roles, client public, `acr`).
- Publish workflow e `scripts/bump-version.mjs` incluem `@frani-ai/auth-nest`.

### Changed
- `ServerAuthConfig.clientSecret` passou a ser opcional (obrigatório apenas para clients confidential).
- Handlers de token no servidor validam `clientId` / secret conforme `clientType`.
- `OpenIdConfiguration` tipa `acr_values_supported` e `end_session_endpoint`.
- `AuthMethod` inclui `saml` e `webauthn`.
- Scripts npm `version:patch` / `version:minor` / `version:major` (sincroniza packages + CHANGELOG).

## [0.2.0] - 2026-11-08

### Added
- Base do monorepo Bifrost Identity SDK (`auth-sdk`, `auth-react`, `auth-next`).
- OAuth Authorization Code + PKCE, discovery, JWKS, login embutido, SSO, RBAC `resource:action`.
- Provisionamento via API key e proxies BFF (Next / Vite).

[Unreleased]: https://github.com/frani-ai/sdk-auth/compare/v0.3.0...HEAD
[0.2.0]: https://github.com/frani-ai/sdk-auth/releases/tag/v0.2.0
[0.3.0]: https://github.com/frani-ai/sdk-auth/releases/tag/v0.3.0
