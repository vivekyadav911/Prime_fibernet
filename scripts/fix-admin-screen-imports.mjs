import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const adminDir = path.join(root, 'apps/unified-app/src/screens/admin');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.tsx')) files.push(full);
  }
  return files;
}

let fixed = 0;

for (const file of walk(adminDir)) {
  let source = fs.readFileSync(file, 'utf8');
  if (!source.includes('<AdminScreenLayout')) continue;
  if (/AdminScreenLayout/.test(source.split('export ')[0] ?? source.slice(0, 3000))) continue;

  const adminImport = /import \{([^}]+)\} from '@\/components\/admin';/;
  if (adminImport.test(source)) {
    source = source.replace(adminImport, (_m, names) => {
      if (names.includes('AdminScreenLayout')) return _m;
      return `import { AdminScreenLayout, ${names.trim()} } from '@/components/admin';`;
    });
  } else {
    source = `import { AdminScreenLayout } from '@/components/admin';\n${source}`;
  }

  if (!/<Screen[\s>]/.test(source)) {
    source = source
      .replace(/import \{ Screen \} from '@prime\/ui';\n?/g, '')
      .replace(/import \{([^,}]+), Screen \} from '@prime\/ui';/g, "import { $1 } from '@prime/ui';")
      .replace(/import \{ Screen, ([^}]+) \} from '@prime\/ui';/g, "import { $1 } from '@prime/ui';");
  }

  fs.writeFileSync(file, source);
  fixed += 1;
  console.log('fixed', path.relative(root, file));
}

console.log(`Done. ${fixed} imports fixed.`);
