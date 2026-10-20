import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const directory = process.argv[2] ?? 'release';
const files = (await readdir(directory))
  .filter((name) => /\.(exe|AppImage|deb)$/.test(name))
  .sort();
if (!files.length) throw new Error('Nenhum pacote encontrado.');
const lines = await Promise.all(
  files.map(
    async (name) =>
      `${createHash('sha256')
        .update(await readFile(join(directory, name)))
        .digest('hex')}  ${name}`,
  ),
);
await writeFile(join(directory, `SHA256SUMS-${process.platform}.txt`), lines.join('\n') + '\n');
console.log(lines.join('\n'));
