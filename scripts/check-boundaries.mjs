import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';

let violations = 0;
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspect(file);
      continue;
    }
    if (!/\.tsx?$/.test(file)) continue;
    const layer = file.split(/[\\/]/)[1];
    for (const match of (await readFile(file, 'utf8')).matchAll(
      /(?:from\s+|import\s*)['"]([^'"]+)['"]/g,
    )) {
      const target = match[1];
      const resolved = target.startsWith('.') ? resolve(dirname(file), target) : target;
      const forbidden =
        layer === 'domain'
          ? !target.startsWith('.') || !resolved.startsWith(resolve('src/domain'))
          : layer === 'application'
            ? !target.startsWith('.') ||
              /[\\/](infrastructure|presentation|shared)[\\/]/.test(resolved)
            : layer === 'presentation'
              ? /[\\/]infrastructure[\\/]/.test(resolved)
              : false;
      if (forbidden) {
        console.error(`${file}: dependência proibida: ${target}`);
        violations++;
      }
    }
  }
}
await inspect('src');
if (violations) process.exitCode = 1;
else console.log('Limites entre domínio, aplicação e adaptadores: OK');
