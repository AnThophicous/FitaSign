import { _electron as electron } from '@playwright/test';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const directory = await mkdtemp(join(tmpdir(), 'fitasign-package-'));
const executablePath = resolve(
  process.platform === 'win32'
    ? 'release/win-unpacked/FitaSign.exe'
    : 'release/linux-unpacked/fitasign',
);
const env = { ...process.env, FITASIGN_DATA_DIR: directory };
delete env.ELECTRON_RUN_AS_NODE;
let desktop;
try {
  desktop = await electron.launch({
    executablePath,
    args: process.platform === 'linux' ? ['--no-sandbox'] : [],
    env,
    timeout: 60000,
  });
  const page = await desktop.firstWindow();
  await page.getByRole('heading', { name: 'Projetos', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Abrir exemplo Menu principal', exact: true }).click();
  await page.locator('[data-artboard]').waitFor();
  if (!(await page.locator('[data-artboard]').innerText()).includes('Clareira'))
    throw new Error('Preview não renderizado.');
  await page.screenshot({ path: `test-results/packaged-${process.platform}.png` });
  const info = await page.evaluate(() => window.fitasign.connectionInfo());
  if ((await stat(info.args[0])).size < 1000) throw new Error('Servidor MCP não foi distribuído.');
  console.log(`Pacote ${process.platform}: janela, projeto, preview e servidor MCP OK`);
} finally {
  await desktop?.close();
  await rm(directory, { force: true, recursive: true });
}
