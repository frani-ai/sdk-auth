# Frani Auth SDK

SDK para integrar aplicações **Next.js** e **React (Vite)** com o Frani Auth Portal.

## Pacotes

| Pacote | Descrição |
|--------|-----------|
| `@frani-ai/auth-sdk` | Cliente HTTP, PKCE, login, tenant, tokens |
| `@frani-ai/auth-react` | Provider React + hooks |
| `@frani-ai/auth-next` | Route handlers App Router |
| `@frani-ai/auth-react/vite` | Plugin Vite (proxy dev para token exchange) |

## Instalação (GitHub Packages)

Pacotes públicos no GitHub Packages (`@frani-ai`).

1. No projecto consumidor, cria/atualiza `.npmrc`:

```ini
@frani-ai:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

2. Autentica com um PAT que tenha `read:packages` (mesmo em pacotes públicos o registry GitHub pode pedir auth):

```bash
export NODE_AUTH_TOKEN=ghp_seu_token
npm install @frani-ai/auth-sdk @frani-ai/auth-react
# Next.js
npm install @frani-ai/auth-next
```

## Publicar (maintainers)

```bash
# 1. Bump / commit
# 2. Tag e push
git tag v0.1.1
git push origin v0.1.1
```

Ou: Actions → **Publish to GitHub Packages** → Run workflow (opcional dry-run).

Ordem de publicação: `auth-sdk` → `auth-react` → `auth-next`.

## Variáveis de ambiente

```env
AUTH_API_URL=https://api-hml.frani.com.br/authenticate
CLIENT_ID=<client_id>
CLIENT_SECRET=<client_secret>   # só no servidor
REDIRECT_URI=https://demo.frani.com.br/callback
TENANT_ID=                      # opcional — slug/id do tenant
```

> O `client_secret` **nunca** deve ir para o browser. Use route handlers (Next) ou middleware (Vite dev plugin).

---

## Next.js (App Router)

### 1. Route handlers

```ts
// app/api/oauth/token/route.ts
import { createTokenExchangeHandler } from '@frani-ai/auth-next';

export const { dynamic, POST } = createTokenExchangeHandler();
```

```ts
// app/api/config/route.ts
import { createPublicConfigHandler } from '@frani-ai/auth-next';

export const { dynamic, GET } = createPublicConfigHandler();
```

### 2. Provider

```tsx
// app/providers.tsx
'use client';

import { FraniAuthProvider } from '@frani-ai/auth-react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FraniAuthProvider
      config={{
        authApiUrl: process.env.NEXT_PUBLIC_AUTH_API_URL!,
        clientId: process.env.NEXT_PUBLIC_CLIENT_ID!,
        redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI!,
        tokenProxyUrl: '/api/oauth/token',
        configProxyUrl: '/api/config',
      }}
    >
      {children}
    </FraniAuthProvider>
  );
}
```

### 3. Login OAuth + callback

```tsx
'use client';
import { useFraniAuth } from '@frani-ai/auth-react';

export function LoginButton() {
  const { startOAuthLogin } = useFraniAuth();
  return <button onClick={() => startOAuthLogin()}>Entrar</button>;
}
```

```tsx
'use client';
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFraniAuth } from '@frani-ai/auth-react';

export default function CallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { handleOAuthCallback } = useFraniAuth();

  useEffect(() => {
    handleOAuthCallback(params).then(() => router.push('/dashboard'));
  }, [params, handleOAuthCallback, router]);

  return <p>A autenticar...</p>;
}
```

### 4. Tenant

```tsx
import { useFraniTenant } from '@frani-ai/auth-react';

function TenantSelector() {
  const { tenantId, setTenantId, tenantEnabled } = useFraniTenant();
  if (!tenantEnabled) return null;
  return (
    <input
      value={tenantId ?? ''}
      onChange={(e) => setTenantId(e.target.value || undefined)}
      placeholder="Tenant slug"
    />
  );
}
```

---

## React + Vite

### 1. Plugin Vite (dev)

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { franiAuthVitePlugin } from '@frani-ai/auth-react/vite';

export default defineConfig({
  plugins: [react(), franiAuthVitePlugin()],
});
```

Em produção, expõe os mesmos endpoints (`/api/config`, `/api/oauth/token`) no teu BFF ou reverse proxy.

### 2. Provider + hooks

Igual ao Next.js — usa `FraniAuthProvider` com `tokenProxyUrl: '/api/oauth/token'`.

---

## API do cliente (`@frani-ai/auth-sdk`)

```ts
import { FraniAuthClient } from '@frani-ai/auth-sdk';

const client = new FraniAuthClient({
  authApiUrl: 'https://api.frani.com.br/authenticate',
  clientId: '...',
  redirectUri: 'https://app.com/callback',
});

// Config da app (UI de login, tenant, 2FA)
const app = await client.getAppConfig();

// OAuth PKCE
const { url } = await client.startOAuthLogin('tenant-slug');
window.location.href = url;

// Login directo (embedded)
const result = await client.login({ email, password, tenantId: 'acme' });

// Tokens
await client.refreshTokens();
await client.fetchUserInfo();
await client.revokeToken();
```

---

## Features suportadas

- OAuth 2.0 Authorization Code + PKCE
- Config da aplicação (`clientId`, auth methods, tenant, 2FA, branding)
- Login password / OTP / 2FA / registo / reset password
- Tenant (`tenantId` no fluxo OAuth e login)
- SSO session check + consent
- Token refresh, introspect, revoke, userinfo, profile

## Desenvolvimento local

```bash
npm install
npm run build
```

## Release / publish

Publicação no GitHub Packages com bump sincronizado (`auth-sdk`, `auth-react`, `auth-next`):

1. Actions → **Release** → Run workflow (branch `main`/`master`)
2. Escolhe `patch` (0.1.0 → 0.1.1), `minor` ou `major`
3. Commit `chore(release): vX.Y.Z` + tag `vX.Y.Z`
4. A tag dispara **Publish** dos três packages

Local (só bump):

```bash
npm run version:patch   # ou version:minor / version:major
```
