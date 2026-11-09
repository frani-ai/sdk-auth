# Auth Nest Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add role helpers + claim updates to `@frani-ai/auth-sdk` and ship `@frani-ai/auth-nest` with Auth/Permission/Role guards and decorators (nest-keycloak-connect style).

**Architecture:** Pure authorization logic lives in core (`permissions.ts`, new `roles.ts`, shared policy helpers). Nest package is a thin adapter: module options, Reflector metadata, three guards, decorators.

**Tech Stack:** TypeScript ESM, jose (existing), NestJS 10+ peer (`@nestjs/common`, `@nestjs/core`).

**Spec:** `docs/superpowers/specs/2026-11-08-auth-nest-backend-design.md`

## Global Constraints

- Public portal/issuer only in docs and examples.
- Core must not import Nest.
- Permission key remains `resource:action`; `manage` covers all actions.
- Token validation v1 = offline JWKS (`verifyAccessToken`).

## File map

| File | Responsibility |
|------|----------------|
| `packages/core/src/roles.ts` | Role helpers |
| `packages/core/src/permissions.ts` | Existing + optional policy helper |
| `packages/core/src/authorize.ts` | Shared evaluateAuthz (scopes + roles + policy) |
| `packages/core/src/types.ts` | `acr`/`amr` on claims; authz option types |
| `packages/core/src/index.ts` | Re-exports |
| `packages/nest/*` | New Nest package |

## Tasks

### Task 1: Core roles + claims + authorize

- [x] Add `roles.ts` (`hasRole`, `hasAnyRole`, `hasAllRoles`, `requireRole`, `rolesFromClaims`)
- [x] Extend `AccessTokenClaims` / `UserInfo` with optional `acr`, `amr`
- [x] Add `authorize.ts` evaluating `{ permissions, roles }` against required scopes/roles + policy mode
- [x] Export from `index.ts`; bump types; `tsc` passes

### Task 2: Scaffold `@frani-ai/auth-nest`

- [x] Create package.json, tsconfig, mirror next/react patterns
- [x] Wire workspace + root `publish:packages`
- [x] `BifrostAuthModule.register` / `registerAsync` with options

### Task 3: Decorators + guards

- [x] Decorators: `Public`, `Resource`, `Scopes`, `Roles`, `CurrentUser`, `AccessToken`
- [x] Guards: `AuthGuard`, `PermissionGuard`, `RoleGuard`
- [x] Request keys for user + raw token
- [x] Build nest package

### Task 4: Docs

- [x] README sections for Nest + framework-agnostic middleware
- [x] Package README for auth-nest
