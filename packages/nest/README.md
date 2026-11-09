# `@frani-ai/auth-nest`

Guards e decorators NestJS para validar access tokens Bifrost (JWKS) e autorizar rotas com **permissions** (`resource:action`) e **roles** — no espírito do [nest-keycloak-connect](https://github.com/ferrerojosh/nest-keycloak-connect).

## Instalação

```bash
npm install @frani-ai/auth-nest @frani-ai/auth-sdk
# peers Nest
npm install @nestjs/common @nestjs/core reflect-metadata
```

## Módulo

```ts
import { BifrostAuthModule } from '@frani-ai/auth-nest';

@Module({
  imports: [
    BifrostAuthModule.register({
      issuer: 'https://identity-hml.frani.com.br/org/frani',
      clientId: 'seu-client-id',
      policyEnforcement: 'permissive', // ou 'enforcing'
      // globalGuards: false — se preferir @UseGuards manual
    }),
  ],
})
export class AppModule {}
```

Ordem dos guards globais: `AuthGuard` → `PermissionGuard` → `RoleGuard`.

## Controller

```ts
import {
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import {
  Public,
  Resource,
  Scopes,
  Roles,
  CurrentUser,
  AccessToken,
} from '@frani-ai/auth-nest';

@Controller('posts')
@Resource('posts')
export class PostsController {
  @Get()
  @Public()
  listPublic() {
    return [];
  }

  @Get('mine')
  @Scopes('read')
  listMine(@CurrentUser() user: { sub: string; email?: string }) {
    return { userId: user.sub };
  }

  @Post()
  @Scopes('create')
  @Roles({ roles: ['editor', 'admin'], mode: 'any' })
  create(@AccessToken() token: string) {
    return { ok: true, tokenLength: token.length };
  }
}
```

- `@Scopes('read')` + `@Resource('posts')` → exige `posts:read` (ou `posts:manage`).
- `@Roles` usa o claim `roles` do JWT.
- `policyEnforcement: 'enforcing'` exige `@Scopes` e/ou `@Roles` em toda rota autenticada.

## Sem Nest

Use `@frani-ai/auth-sdk/server`:

```ts
import { verifyAccessToken, assertAuthz } from '@frani-ai/auth-sdk/server';

const user = await verifyAccessToken(bearer, { issuer, clientId });
assertAuthz(user, { resource: 'posts', scopes: ['read'], roles: ['admin'] });
```
