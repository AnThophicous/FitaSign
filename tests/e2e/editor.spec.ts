import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { ProjectState } from '../../src/shared/bridge';

let desktop: ElectronApplication;
let page: Page;
let directory: string;
const errors: string[] = [];
test.beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'fitasign-e2e-'));
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
  delete env.ELECTRON_RUN_AS_NODE;
  env.FITASIGN_DATA_DIR = directory;
  desktop = await electron.launch({
    args: process.platform === 'linux' ? ['--no-sandbox', resolve('.')] : [resolve('.')],
    env,
  });
  page = await desktop.firstWindow();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.getByRole('heading', { name: 'Projetos', exact: true }).waitFor();
});
test.afterEach(async () => {
  await desktop?.close();
  await rm(directory, { recursive: true, force: true });
  expect(errors.splice(0)).toEqual([]);
});
test('cria, edita, desfaz, reabre, exporta e controla pelo MCP local', async () => {
  await page.getByRole('button', { name: 'Novo projeto', exact: true }).first().click();
  await page.getByRole('textbox', { name: 'Nome', exact: true }).fill('Inventário');
  await page.getByRole('button', { name: 'Criar projeto', exact: true }).click();
  await page.getByLabel('Frame (F)', { exact: true }).click();
  const x = page.getByLabel('X', { exact: true });
  await expect(x).toHaveValue('40');
  await x.fill('120');
  await x.press('Enter');
  await expect(x).toHaveValue('120');
  await page.getByLabel('Desfazer (Ctrl+Z)', { exact: true }).click();
  await expect(x).toHaveValue('40');
  await page.getByLabel('Refazer (Ctrl+Shift+Z)', { exact: true }).click();
  await expect(x).toHaveValue('120');
  await page.getByLabel('Texto (T)', { exact: true }).click();
  await page.getByLabel('Conteúdo', { exact: true }).fill('Minha mochila');
  await page.getByLabel('Conteúdo', { exact: true }).press('Tab');
  await expect(page.locator('[data-artboard]')).toContainText('Minha mochila');
  await page.getByLabel('Duplicar camada (Ctrl+D)', { exact: true }).click();
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Texto cópia');
  await page.getByLabel('Excluir camada (Delete)', { exact: true }).click();
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  await expect(page.getByLabel('Código Luau')).toContainText('Minha mochila');
  await page.getByRole('button', { name: 'Copiar Luau', exact: true }).click();
  const clipboard = await desktop.evaluate(({ clipboard }) => clipboard.readText());
  expect(clipboard).toContain('Instance.new("TextLabel")');
  expect(clipboard).toContain('Minha mochila');
  const savedFile = join(directory, 'inventory.luau');
  await desktop.evaluate(({ dialog }, target) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: target });
  }, savedFile);
  await page.getByRole('button', { name: 'Salvar .luau', exact: true }).click();
  await expect
    .poll(async () => readFile(savedFile, 'utf8').catch(() => ''))
    .toContain('Minha mochila');
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByLabel('Voltar aos projetos', { exact: true }).click();
  await page.getByRole('button', { name: 'Abrir Inventário', exact: true }).click();
  await expect(page.locator('[data-artboard]')).toContainText('Minha mochila');
  const connection = JSON.parse(await readFile(join(directory, 'mcp-connection.json'), 'utf8')) as {
    url: string;
    token: string;
  };
  async function rpc(method: string, params: unknown = {}) {
    const response = await fetch(connection.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${connection.token}` },
      body: JSON.stringify({ method, params }),
    });
    expect(response.ok).toBe(true);
    return (await response.json()).result;
  }
  const projects = (await rpc('projects.list')) as { id: string }[];
  const id = projects[0]!.id;
  const state = (await rpc('document.read', { projectId: id })) as ProjectState;
  await rpc('document.apply', {
    projectId: id,
    expectedRevision: state.document.revision,
    commands: [
      {
        kind: 'add',
        id: 'agent-text',
        parentId: 'screen',
        type: 'TextLabel',
        name: 'Agente',
        properties: { text: 'Criado via MCP' },
      },
    ],
  });
  await expect(page.locator('[data-artboard]')).toContainText('Criado via MCP');
  const screenshot = (await rpc('document.capture', { projectId: id })) as string;
  expect(Buffer.from(screenshot, 'base64').subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  await page.screenshot({ path: 'test-results/editor.png' });
});
test('exemplo monocromático, arraste e resize em uma ação de desfazer', async () => {
  await page.getByRole('button', { name: 'Abrir exemplo Menu principal', exact: true }).click();
  const play = page.locator('[data-node-id="play"]');
  await expect(play).toBeVisible();
  const box = (await play.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 15, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByLabel('X', { exact: true })).not.toHaveValue('84');
  await page.getByLabel('Desfazer (Ctrl+Z)', { exact: true }).click();
  await expect(page.getByLabel('X', { exact: true })).toHaveValue('84');
  const handle = play.locator('.resize-handle.se');
  const handleBox = (await handle.boundingBox())!;
  await page.mouse.move(handleBox.x + 4, handleBox.y + 4);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + 34, handleBox.y + 24, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByLabel('W', { exact: true })).not.toHaveValue('320');
  await page.getByLabel('Desfazer (Ctrl+Z)', { exact: true }).click();
  await expect(page.getByLabel('W', { exact: true })).toHaveValue('320');
  const chromeColors = await page
    .locator('.navigation, .editor-header, .layers, .inspector, .canvas')
    .evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).backgroundColor),
    );
  for (const color of chromeColors) {
    const channels = color.match(/\d+/g)!.map(Number);
    expect(channels[0]).toBe(channels[1]);
    expect(channels[1]).toBe(channels[2]);
    expect(channels[0]).toBeLessThan(45);
  }
  await page.screenshot({ path: 'test-results/example-editor.png' });
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.layers')).toHaveCount(0);
  await expect(page.locator('[data-artboard]')).toContainText('Clareira');
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Voltar aos projetos', { exact: true }).click();
  await page.screenshot({ path: 'test-results/projects.png' });
  await page.getByLabel('Conexões', { exact: true }).click();
  await page.getByRole('button', { name: 'Copiar configuração', exact: true }).click();
  const config = await desktop.evaluate(({ clipboard }) => clipboard.readText());
  expect(JSON.parse(config).mcpServers.fitasign.args[0]).toContain('stdio.cjs');
  await page.screenshot({ path: 'test-results/connections.png' });
});
test('importa um arquivo validado e preserva o original', async () => {
  const project = { formatVersion: 1, bad: true };
  const file = join(directory, 'invalid.fitasign');
  await writeFile(file, JSON.stringify(project));
  await desktop.evaluate(({ dialog }, target) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [target] });
  }, file);
  await page.getByRole('button', { name: 'Abrir arquivo', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Projetos', exact: true })).toBeVisible();
  expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(project);
});
test('insere layout pelo catálogo e exporta propriedades nativas', async () => {
  await page.getByRole('button', { name: 'Abrir exemplo Menu principal', exact: true }).click();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByLabel('Inserir elementos Roblox', { exact: true }).click();
  await page.getByLabel('Buscar elemento Roblox', { exact: true }).fill('UIListLayout');
  await page.getByRole('button', { name: /^UIListLayout/ }).click();
  await expect(page.getByLabel('FillDirection', { exact: true })).toHaveValue('Vertical');
  await page.getByLabel('offset', { exact: true }).fill('24');
  await page.getByLabel('offset', { exact: true }).press('Enter');
  await page.getByLabel('FillDirection', { exact: true }).selectOption('Horizontal');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  await expect(page.getByLabel('Código Luau')).toContainText('Enum.FillDirection.Horizontal');
  await expect(page.getByLabel('Código Luau')).toContainText('UDim.new(0, 24)');
});
