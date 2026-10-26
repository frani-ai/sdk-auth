# Bifrost Identity SDK

SDK para integrar aplicações **Next.js** e **React (Vite)** com o [Bifrost](https://identity.frani.com.br/docs) (Frani Identity).

Protocolo: OAuth 2.0 Authorization Code + PKCE S256 + OpenID Connect.

Fale **só com o portal**. Não chame o host Nest, IP interno nem o prefixo `/authenticate`.

| Env | Portal | Issuer |
|-----|--------|--------|
| HML | `https://identity-hml.frani.com.br` | `https://identity-hml.frani.com.br/org/{orgSlug}` |
| Prod | `https://identity.frani.com.br` | `https://identity.frani.com.br/org/{orgSlug}` |
| Local | `http://localhost:3000` | `http://localhost:3000/org/{orgSlug}` |

`ISSUER` é a raiz pública. Discovery: `GET {ISSUER}/.well-known/openid-configuration`.

`POST /oauth/token`, `/oauth/introspect` e `/oauth/revoke` enviam **JSON** (`Content-Type: application/json`), não `x-www-form-urlencoded`.

## Pacotes

| Pacote | Descrição |
|--------|-----------|
| `@frani-ai/auth-sdk` | Cliente HTTP, PKCE, login, tenant, tokens |
| `@frani-ai/auth-sdk/server` | Token exchange, JWKS, provisionamento (`sk_…`) |
| `@frani-ai/auth-react` | Provider React + hooks |
| `@frani-ai/auth-next` | Route handlers App Router |
| `@frani-ai/auth-react/vite` | Plugin Vite (proxy de token no dev) |

## Instalação (GitHub Packages)

```ini
@frani-ai:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
export NODE_AUTH_TOKEN=ghp_seu_token
npm install @frani-ai/auth-sdk @frani-ai/auth-react
# Next.js
npm install @frani-ai/auth-next
```

## Variáveis de ambiente

```env
# Browser (públicas)
NEXT_PUBLIC_BIFROST_ISSUER=https://identity-hml.frani.com.br/org/SEU_SLUG
NEXT_PUBLIC_BIFROST_PORTAL=https://identity-hml.frani.com.br
NEXT_PUBLIC_CLIENT_ID=<client_id>
NEXT_PUBLIC_REDIRECT_URI=https://app.exemplo.com/callback
NEXT_PUBLIC_TENANT_ID=                    # opcional — slug do tenant (não é ObjectId)
NEXT_PUBLIC_BIFROST_LANGUAGE=pt-BR        # opcional — pt-BR | en

# Servidor
BIFROST_ISSUER=https://identity-hml.frani.com.br/org/SEU_SLUG
BIFROST_PORTAL=https://identity-hml.frani.com.br
BIFROST_CLIENT_ID=<client_id>
BIFROST_CLIENT_SECRET=<client_secret>     # nunca NEXT_PUBLIC_ / VITE_
BIFROST_REDIRECT_URI=https://app.exemplo.com/callback
BIFROST_API_KEY=sk_…                      # só para provisionar tenant/utilizador
```

Aliases ainda aceites: `AUTH_API_URL`, `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`, `TENANT_ID`.

O `client_secret` e a API key **nunca** vão para o browser. Use route handlers (Next) ou o plugin Vite.

---

## Next.js (App Router)

### 1. Route handlers

```ts
// app/api/oauth/token/route.ts
import { createTokenExchangeHandler } from '@frani-ai/auth-next';
export const { dynamic, POST } = createTokenExchangeHandler();
```

```ts
// app/api/oauth/refresh/route.ts
import { createRefreshTokenHandler } from '@frani-ai/auth-next';
export const { dynamic, POST } = createRefreshTokenHandler();
```

```ts
// app/api/oauth/revoke/route.ts
import { createRevokeTokenHandler } from '@frani-ai/auth-next';
export const { dynamic, POST } = createRevokeTokenHandler();
```

```ts
// app/api/config/route.ts
import { createPublicConfigHandler } from '@frani-ai/auth-next';
export const { dynamic, GET } = createPublicConfigHandler();
```

### 2. Provider

```tsx
'use client';

import { FraniAuthProvider } from '@frani-ai/auth-react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FraniAuthProvider
      config={{
        issuer: process.env.NEXT_PUBLIC_BIFROST_ISSUER!,
        portalUrl: process.env.NEXT_PUBLIC_BIFROST_PORTAL,
        clientId: process.env.NEXT_PUBLIC_CLIENT_ID!,
        redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI!,
        tenantId: process.env.NEXT_PUBLIC_TENANT_ID,
        language: 'pt-BR',
        tokenProxyUrl: '/api/oauth/token',
        refreshProxyUrl: '/api/oauth/refresh',
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

### 4. Tenant (slug)

`tenant` no authorize e `tenantId` no login/registo são o **slug** público (`frani-ia`), não o ObjectId.

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

### 5. Validar access token no backend

```ts
import { verifyAccessToken, readAuthConfigFromEnv } from '@frani-ai/auth-next';

export async function requireUser(authorization?: string) {
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('missing_token');
  return verifyAccessToken(token, readAuthConfigFromEnv());
}
```

O JWT é RS256. Conferir `iss === ISSUER`, `aud === client_id`, `typ === "access"`. Não aceite `id_token` como Bearer da sua API.

---

## React + Vite

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { franiAuthVitePlugin } from '@frani-ai/auth-react/vite';

export default defineConfig({
  plugins: [react(), franiAuthVitePlugin()],
});
```

Em produção, exponha `/api/config`, `/api/oauth/token`, `/api/oauth/refresh` e `/api/oauth/revoke` no BFF.

---

## API do cliente (`@frani-ai/auth-sdk`)

```ts
import { FraniAuthClient, BIFROST_PORTALS, bifrostIssuer } from '@frani-ai/auth-sdk';

const client = new FraniAuthClient({
  issuer: bifrostIssuer(BIFROST_PORTALS.hml, 'frani'),
  portalUrl: BIFROST_PORTALS.hml,
  clientId: '...',
  redirectUri: 'https://app.com/callback',
  tenantId: 'minha-empresa', // slug
  language: 'pt-BR',
});

const discovery = await client.getDiscovery();
const app = await client.getAppConfig();

const { url } = await client.startOAuthLogin();
window.location.href = url;

// Login directo (embedded) — envie turnstileToken se app.turnstileEnabled
const result = await client.login({
  email,
  password,
  tenantId: 'acme',
  turnstileToken,
});

await client.refreshTokens();
await client.fetchUserInfo();
await client.revokeToken();
await client.listSsoAccounts();
```

Turnstile (Cloudflare, transparente): a site key vem de `getAppConfig().turnstileSiteKey`. Envie o token em login, registo, OTP e forgot-password.

---

## Pré-cadastro / workspace (Hubfin)

Dados de negócio ficam na sua base. O Bifrost só guarda tenant + utilizador.

**Não** use `POST /auth/register` nem a página `/register` do portal para um wizard de workspace. Use a API key no **servidor**:

```ts
import { BifrostProvisioningClient } from '@frani-ai/auth-sdk/server';

const admin = new BifrostProvisioningClient({
  portalUrl: process.env.BIFROST_PORTAL!,
  apiKey: process.env.BIFROST_API_KEY!, // sk_…
});

const { tenant, user } = await admin.provision({
  tenant: {
    name: 'Acme',
    slug: 'acme',
    settings: { metadata: { workspaceId: 'id-interno' } },
  },
  user: { email: 'ana@acme.com', name: 'Ana Silva', password: 'opcional-do-form' },
});
```

Se o slug já existir, o tenant é reutilizado. E-mail duplicado nesse tenant → 409. Depois o utilizador entra pelo OAuth com `tenant=acme`.

---

## Features suportadas

- OAuth 2.0 Authorization Code + PKCE S256 (issuer `/org/{slug}`)
- Discovery OIDC + JWKS RS256
- Config da aplicação (métodos, tenant, 2FA, locale, Turnstile)
- Login password / OTP / 2FA / registo / reset password
- Tenant por **slug** no authorize e no login
- Idioma (`language` / `ui_locales`)
- SSO (session, accounts, consent)
- Token refresh, introspect, revoke, userinfo, profile (JSON)
- Provisionamento de tenant + utilizador (`X-Api-Key`)
- RBAC (`hasPermission` / `getPermissions`) sobre claim `permissions` (`resource:action`)

## Permissions RBAC (`resource:action`)

O access token (e o `/oauth/userinfo`) inclui `permissions: string[]`. A acção `manage` num resource cobre qualquer outra acção desse resource.

```ts
import { FraniAuthClient, hasPermission, requirePermission } from '@frani-ai/auth-sdk';

const client = new FraniAuthClient({ /* ... */ });

if (client.hasPermission('notifications', 'create')) {
  // pode criar
}

client.requirePermission('tenants', 'read'); // lança FraniAuthError 403 se faltar
```

## Desenvolvimento local

```bash
npm install
npm run build
```

## Release / publish

1. Actions → **Release** → Run workflow
2. Escolhe `patch` / `minor` / `major`
3. A tag dispara **Publish** dos três packages

```bash
npm run version:patch   # ou version:minor / version:major
```
