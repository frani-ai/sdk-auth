#!/usr/bin/env node
/**
 * Bump semântico sincronizado dos packages do sdk-auth.
 * Uso: node scripts/bump-version.mjs [patch|minor|major]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const bump = (process.argv[2] || 'patch').toLowerCase();

if (!['patch', 'minor', 'major'].includes(bump)) {
  console.error(`Bump inválido: ${bump}. Use patch | minor | major.`);
  process.exit(1);
}

function bumpSemver(version, type) {
  const [major, minor, patch] = version.split('.').map((n) => parseInt(n, 10));
  if ([major, minor, patch].some((n) => Number.isNaN(n))) {
    throw new Error(`Versão inválida: ${version}`);
  }
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

const packageDirs = ['packages/core', 'packages/react', 'packages/next'];
const corePath = resolve(root, 'packages/core/package.json');
const core = readJson(corePath);
const next = bumpSemver(core.version, bump);

for (const dir of packageDirs) {
  const path = resolve(root, dir, 'package.json');
  const pkg = readJson(path);
  pkg.version = next;
  if (pkg.dependencies?.['@frani-ai/auth-sdk']) {
    pkg.dependencies['@frani-ai/auth-sdk'] = next;
  }
  writeJson(path, pkg);
}

const rootPkgPath = resolve(root, 'package.json');
const rootPkg = readJson(rootPkgPath);
rootPkg.version = next;
writeJson(rootPkgPath, rootPkg);

const lockPath = resolve(root, 'package-lock.json');
try {
  const lock = readJson(lockPath);
  lock.version = next;
  if (lock.packages?.['']) lock.packages[''].version = next;
  for (const dir of packageDirs) {
    const key = dir;
    if (lock.packages?.[key]) lock.packages[key].version = next;
    if (lock.packages?.[key]?.dependencies?.['@frani-ai/auth-sdk']) {
      lock.packages[key].dependencies['@frani-ai/auth-sdk'] = next;
    }
  }
  writeJson(lockPath, lock);
} catch {
  // lock opcional
}

console.log(next);
