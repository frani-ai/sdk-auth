#!/usr/bin/env node
/**
 * Bump semântico sincronizado dos packages do sdk-auth + CHANGELOG.
 *
 * Uso:
 *   node scripts/bump-version.mjs [patch|minor|major]
 *   npm run version:patch
 *   npm run version:minor
 *   npm run version:major
 *
 * Saída: imprime a nova versão (stdout) para o workflow de release.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

/** Move ## [Unreleased] para ## [version] - date e recria Unreleased vazio. */
function updateChangelog(changelogPath, version) {
  if (!existsSync(changelogPath)) return;
  const raw = readFileSync(changelogPath, 'utf8');
  const unreleasedHeader = '## [Unreleased]';
  const idx = raw.indexOf(unreleasedHeader);
  if (idx === -1) {
    console.warn('CHANGELOG.md sem secção [Unreleased] — a saltar actualização do changelog.');
    return;
  }

  const afterHeader = idx + unreleasedHeader.length;
  const nextSection = raw.indexOf('\n## [', afterHeader);
  const bodyStart = afterHeader;
  const bodyEnd = nextSection === -1 ? raw.length : nextSection;
  const unreleasedBody = raw.slice(bodyStart, bodyEnd).replace(/^\n+/, '').replace(/\n+$/, '');

  const before = raw.slice(0, idx);
  const after = nextSection === -1 ? '' : raw.slice(nextSection);

  const emptyUnreleased = `${unreleasedHeader}\n\n`;
  const released =
    unreleasedBody.trim().length > 0
      ? `## [${version}] - ${todayISO()}\n\n${unreleasedBody}\n\n`
      : `## [${version}] - ${todayISO()}\n\n### Changed\n\n- Release ${version}.\n\n`;

  let next = `${before}${emptyUnreleased}${released}${after.replace(/^\n+/, '')}`;

  // Actualiza links Keep a Changelog no rodapé, se existirem
  const repoCompare = 'https://github.com/frani-ai/sdk-auth/compare';
  const repoTag = 'https://github.com/frani-ai/sdk-auth/releases/tag';
  if (next.includes(`[Unreleased]:`)) {
    next = next.replace(
      /\[Unreleased\]:.*$/m,
      `[Unreleased]: ${repoCompare}/v${version}...HEAD`,
    );
  } else {
    next = `${next.trimEnd()}\n\n[Unreleased]: ${repoCompare}/v${version}...HEAD\n`;
  }
  if (!next.includes(`[${version}]:`)) {
    next = `${next.trimEnd()}\n[${version}]: ${repoTag}/v${version}\n`;
  }

  writeFileSync(changelogPath, next.endsWith('\n') ? next : `${next}\n`);
}

const packageDirs = ['packages/core', 'packages/react', 'packages/next', 'packages/nest'];
const corePath = resolve(root, 'packages/core/package.json');
const core = readJson(corePath);
const previous = core.version;
const next = bumpSemver(previous, bump);

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

updateChangelog(resolve(root, 'CHANGELOG.md'), next);

console.error(`Versão ${previous} → ${next} (${bump})`);
console.log(next);
