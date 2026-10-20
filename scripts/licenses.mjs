import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export async function writeThirdPartyNotices(inputs) {
  const roots = new Set(
    ['react', 'react-dom', 'scheduler', '@phosphor-icons/react'].map((name) =>
      resolve('node_modules', name),
    ),
  );
  for (const input of inputs) {
    const normalized = input.replaceAll('\\', '/');
    const start = normalized.lastIndexOf('node_modules/');
    if (start < 0) continue;
    const parts = normalized.slice(start + 13).split('/');
    const name = parts[0].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
    roots.add(resolve(normalized.slice(0, start + 13), name));
  }
  const sections = [];
  for (const root of [...roots].sort()) {
    const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    let license = '';
    for (const file of [
      'LICENSE',
      'LICENSE.md',
      'LICENSE.txt',
      'LICENSE-MIT',
      'license',
      'license.md',
      'license.txt',
    ]) {
      try {
        license = await readFile(join(root, file), 'utf8');
        break;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    if (!license) throw new Error(`Licença ausente em ${metadata.name}.`);
    sections.push(`${metadata.name} ${metadata.version}\n${'-'.repeat(60)}\n${license.trim()}`);
  }
  await writeFile('dist/THIRD_PARTY_NOTICES.txt', sections.join('\n\n') + '\n');
}
