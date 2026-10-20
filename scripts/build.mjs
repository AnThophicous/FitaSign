import { build } from 'esbuild';
import { writeThirdPartyNotices } from './licenses.mjs';

await build({
  entryPoints: ['src/infrastructure/electron/main.ts'],
  outfile: 'dist/main/main.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  target: 'node24',
});
await build({
  entryPoints: ['src/infrastructure/electron/preload.ts'],
  outfile: 'dist/main/preload.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
  target: 'node24',
});
const mcp = await build({
  entryPoints: ['src/infrastructure/mcp/stdio.ts'],
  outfile: 'dist/mcp/stdio.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  metafile: true,
});
await writeThirdPartyNotices(Object.keys(mcp.metafile.inputs));
