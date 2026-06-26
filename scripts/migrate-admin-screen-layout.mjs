/**
 * Migrates admin screens from raw <Screen style={adminScreenStyles.canvas}> to AdminScreenLayout.
 * Run: node scripts/migrate-admin-screen-layout.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const adminDir = path.join(root, 'apps/unified-app/src/screens/admin');

const OPEN_PATTERNS = [
  /<Screen\s+keyboardDismiss=\{false\}\s+padded=\{false\}\s+safeAreaTop=\{false\}\s+style=\{adminScreenStyles\.canvas\}>/g,
  /<Screen\s+keyboardDismiss=\{false\}\s+padded=\{false\}\s+style=\{adminScreenStyles\.canvas\}>/g,
  /<Screen\s+keyboardDismiss=\{false\}\s+style=\{adminScreenStyles\.canvas\}\s+padded=\{false\}>/g,
  /<Screen\s+padded=\{false\}\s+keyboardDismiss=\{false\}\s+safeAreaTop=\{false\}\s+style=\{adminScreenStyles\.canvas\}>/g,
  /<Screen\s+padded=\{false\}\s+safeAreaTop=\{false\}\s+style=\{adminScreenStyles\.canvas\}\s+keyboardDismiss=\{false\}>/g,
  /<Screen\s+padded=\{false\}\s+safeAreaTop=\{false\}\s+style=\{adminScreenStyles\.canvas\}>/g,
  /<Screen\s+padded=\{false\}\s+style=\{adminScreenStyles\.canvas\}\s+safeAreaTop=\{false\}>/g,
  /<Screen\s+safeAreaTop=\{false\}\s+padded=\{false\}\s+style=\{adminScreenStyles\.canvas\}>/g,
  /<Screen\s+safeAreaTop=\{false\}\s+style=\{adminScreenStyles\.canvas\}>/g,
  /<Screen\s+style=\{adminScreenStyles\.canvas\}\s+safeAreaTop=\{false\}>/g,
  /<Screen\s+style=\{adminScreenStyles\.canvas\}\s+keyboardDismiss=\{false\}>/g,
  /<Screen\s+style=\{adminScreenStyles\.canvas\}\s+padded=\{false\}\s+safeAreaTop=\{false\}>/g,
  /<Screen\s+style=\{adminScreenStyles\.canvas\}\s+padded=\{false\}>/g,
  /<Screen\s+padded=\{false\}\s+style=\{adminScreenStyles\.canvas\}>/g,
  /<Screen\s+style=\{adminScreenStyles\.canvas\}>/g,
  /<Screen\s+style=\{\[adminScreenStyles\.canvas,\s*styles\.screenPadding\]\}>/g,
  /<Screen\s+style=\{\[adminScreenStyles\.canvas,\s*styles\.padded\]\}>/g,
  /<Screen\s+style=\{adminScreenStyles\.canvas\}\s*\/>/g,
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.tsx')) files.push(full);
  }
  return files;
}

function ensureAdminScreenLayoutImport(source) {
  if (source.includes('AdminScreenLayout')) return source;

  const adminImport = /import\s+\{([^}]+)\}\s+from\s+'@\/components\/admin';/;
  const match = source.match(adminImport);
  if (match) {
    const names = match[1];
    if (!names.includes('AdminScreenLayout')) {
      return source.replace(adminImport, `import { AdminScreenLayout,${names}} from '@/components/admin';`);
    }
    return source;
  }

  const screenImport = /import\s+\{([^}]*Screen[^}]*)\}\s+from\s+'@prime\/ui';/;
  const screenMatch = source.match(screenImport);
  if (screenMatch) {
    return source.replace(
      screenImport,
      `${screenMatch[0]}\nimport { AdminScreenLayout } from '@/components/admin';`,
    );
  }

  return `import { AdminScreenLayout } from '@/components/admin';\n${source}`;
}

function removeScreenImportIfUnused(source) {
  const usesScreen =
    /<Screen[\s>]/.test(source) ||
    source.includes('Screen ') ||
    source.includes('Screen,');
  if (usesScreen) return source;

  return source
    .replace(/import\s+\{([^}]*),\s*Screen\s*,([^}]*)\}\s+from\s+'@prime\/ui';/g, "import { $1,$2 } from '@prime/ui';")
    .replace(/import\s+\{\s*Screen\s*,([^}]*)\}\s+from\s+'@prime\/ui';/g, "import { $1 } from '@prime/ui';")
    .replace(/import\s+\{([^}]*),\s*Screen\s*\}\s+from\s+'@prime\/ui';/g, "import { $1 } from '@prime/ui';")
    .replace(/import\s+\{\s*Screen\s*\}\s+from\s+'@prime\/ui';\n?/g, '');
}

let changed = 0;

for (const file of walk(adminDir)) {
  let source = fs.readFileSync(file, 'utf8');
  if (!source.includes('adminScreenStyles.canvas')) continue;

  let updated = source;
  for (const pattern of OPEN_PATTERNS) {
    updated = updated.replace(pattern, '<AdminScreenLayout>');
  }
  updated = updated.replace(/<\/Screen>/g, (match, offset) => {
    const before = updated.slice(0, offset);
    const opens =
      (before.match(/<AdminScreenLayout>/g)?.length ?? 0) -
      (before.match(/<\/AdminScreenLayout>/g)?.length ?? 0);
    const screenOpens =
      (before.match(/<Screen[\s>]/g)?.length ?? 0) - (before.match(/<\/Screen>/g)?.length ?? 0);
    if (screenOpens <= 0 && opens > 0) return '</AdminScreenLayout>';
    return match;
  });

  if (updated === source) continue;

  updated = ensureAdminScreenLayoutImport(updated);
  updated = removeScreenImportIfUnused(updated);
  fs.writeFileSync(file, updated);
  changed += 1;
  console.log('updated', path.relative(root, file));
}

console.log(`Done. ${changed} files updated.`);
