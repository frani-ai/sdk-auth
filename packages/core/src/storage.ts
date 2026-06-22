import type { PkceState, TokenSet, TokenStorage, UserInfo } from './types.js';

const TOKENS_KEY = 'frani_auth_tokens';
const USER_KEY = 'frani_auth_user';
const PKCE_KEY = 'frani_auth_pkce';

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: Storage, key: string, value: unknown | null): void {
  if (value === null) storage.removeItem(key);
  else storage.setItem(key, JSON.stringify(value));
}

export function createSessionStorageAdapter(storage: Storage = sessionStorage): TokenStorage {
  return {
    getTokens: () => readJson<TokenSet>(storage, TOKENS_KEY),
    setTokens: (tokens) => writeJson(storage, TOKENS_KEY, tokens),
    getUser: () => readJson<UserInfo>(storage, USER_KEY),
    setUser: (user) => writeJson(storage, USER_KEY, user),
    getPkceState: () => readJson<PkceState>(storage, PKCE_KEY),
    setPkceState: (state) => writeJson(storage, PKCE_KEY, state),
  };
}

export function createLocalStorageAdapter(storage: Storage = localStorage): TokenStorage {
  return createSessionStorageAdapter(storage);
}

export function createMemoryStorageAdapter(): TokenStorage {
  let tokens: TokenSet | null = null;
  let user: UserInfo | null = null;
  let pkce: PkceState | null = null;

  return {
    getTokens: () => tokens,
    setTokens: (value) => {
      tokens = value;
    },
    getUser: () => user,
    setUser: (value) => {
      user = value;
    },
    getPkceState: () => pkce,
    setPkceState: (value) => {
      pkce = value;
    },
  };
}
