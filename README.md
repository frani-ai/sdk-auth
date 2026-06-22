# Frani Auth SDK

SDK para integrar aplicações **Next.js** e **React (Vite)** com o Frani Auth Portal.

## Pacotes

| Pacote | Descrição |
|--------|-----------|
| `@frani/auth-sdk` | Cliente HTTP, PKCE, login, tenant, tokens |
| `@frani/auth-react` | Provider React + hooks |
| `@frani/auth-next` | Route handlers App Router |
| `@frani/auth-react/vite` | Plugin Vite (proxy dev para token exchange) |

## Instalação

```bash
npm install @frani/auth-sdk @frani/auth-react
# Next.js
npm install @frani/auth-next
```

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
import { createTokenExchangeHandler } from '@frani/auth-next';

export const { dynamic, POST } = createTokenExchangeHandler();
```

```ts
// app/api/config/route.ts
import { createPublicConfigHandler } from '@frani/auth-next';

export const { dynamic, GET } = createPublicConfigHandler();
```

### 2. Provider

```tsx
// app/providers.tsx
'use client';

import { FraniAuthProvider } from '@frani/auth-react';

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
import { useFraniAuth } from '@frani/auth-react';

export function LoginButton() {
  const { startOAuthLogin } = useFraniAuth();
  return <button onClick={() => startOAuthLogin()}>Entrar</button>;
}
```

```tsx
'use client';
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFraniAuth } from '@frani/auth-react';

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
import { useFraniTenant } from '@frani/auth-react';

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
import { franiAuthVitePlugin } from '@frani/auth-react/vite';

export default defineConfig({
  plugins: [react(), franiAuthVitePlugin()],
});
```

Em produção, expõe os mesmos endpoints (`/api/config`, `/api/oauth/token`) no teu BFF ou reverse proxy.

### 2. Provider + hooks

Igual ao Next.js — usa `FraniAuthProvider` com `tokenProxyUrl: '/api/oauth/token'`.

---

## API do cliente (`@frani/auth-sdk`)

```ts
import { FraniAuthClient } from '@frani/auth-sdk';

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
