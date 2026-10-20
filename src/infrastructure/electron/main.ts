import { app, BrowserWindow, clipboard, dialog, ipcMain, net, protocol, session } from 'electron';
import { randomUUID } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ProjectService } from '../../application/projects';
import { exportLuau } from '../../application/export-luau';
import { FileProjectRepository } from '../storage/file-projects';
import { startLocalBridge } from '../mcp/local-server';
import type { Command } from '../../application/commands';

app.setName('FitaSign');
if (process.env.FITASIGN_DATA_DIR) app.setPath('userData', resolve(process.env.FITASIGN_DATA_DIR));
else app.setPath('userData', join(app.getPath('appData'), 'FitaSign'));
protocol.registerSchemesAsPrivileged([
  { scheme: 'fitasign', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);
app.enableSandbox();
const directory = dirname(fileURLToPath(import.meta.url));
const developmentUrl = !app.isPackaged ? process.env.FITASIGN_DEV_URL : undefined;
let window: BrowserWindow | null = null;
let activeProject: string | null = null;
let localBridge: Awaited<ReturnType<typeof startLocalBridge>> | undefined;
const connectionFile = join(app.getPath('userData'), 'mcp-connection.json');
const projects = new ProjectService(
  new FileProjectRepository(join(app.getPath('userData'), 'projects')),
  randomUUID,
  (state) => window?.webContents.send('project:changed', state),
);

function requireWindow() {
  if (!window || window.isDestroyed()) throw new Error('Editor indisponível.');
  return window;
}
function projectId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value))
    throw new Error('ID de projeto inválido.');
  return value;
}
function filename(name: string) {
  return (
    name
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .trim()
      .slice(0, 80) || 'Projeto'
  );
}

async function capture(id: string, nodeId?: string) {
  const editor = requireWindow();
  if (id !== activeProject) throw new Error('Abra este projeto no editor antes de capturar.');
  const selector = nodeId
    ? `[data-artboard][data-project-id="${projectId(id)}"] [data-node-id="${projectId(nodeId)}"]`
    : `[data-artboard][data-project-id="${projectId(id)}"]`;
  const bounds = (await editor.webContents.executeJavaScript(
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; })()`,
  )) as { x: number; y: number; width: number; height: number } | null;
  if (!bounds || bounds.width <= 0 || bounds.height <= 0)
    throw new Error('Camada fora da área visível.');
  const [width = 0, height = 0] = editor.getContentSize();
  const left = Math.max(0, Math.floor(bounds.x));
  const top = Math.max(0, Math.floor(bounds.y));
  const right = Math.min(width, Math.ceil(bounds.x + bounds.width));
  const bottom = Math.min(height, Math.ceil(bounds.y + bounds.height));
  if (right <= left || bottom <= top) throw new Error('Camada fora da área visível.');
  const image = await editor.webContents.capturePage({
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  });
  return image.toPNG().toString('base64');
}

function registerIpc() {
  function handle(channel: string, operation: (...args: unknown[]) => unknown) {
    ipcMain.handle(channel, (event, ...args: unknown[]) => {
      const expectedUrl = developmentUrl ?? 'fitasign://app';
      if (
        event.sender !== requireWindow().webContents ||
        !event.senderFrame ||
        new URL(event.senderFrame.url).origin !== new URL(expectedUrl).origin ||
        event.senderFrame !== event.sender.mainFrame
      )
        throw new Error('Origem de IPC inválida.');
      return operation(...args);
    });
  }
  handle('projects:list', () => projects.list());
  handle('projects:create', async (name, example) => {
    if (typeof name !== 'string') throw new Error('Nome inválido.');
    const state = await projects.create(name, example === true);
    activeProject = state.document.id;
    return state;
  });
  handle('projects:open', async (id) => {
    const state = await projects.open(projectId(id));
    activeProject = state.document.id;
    return state;
  });
  handle('projects:change', (id, commands, revision) => {
    if (typeof revision !== 'number') throw new Error('Revisão inválida.');
    return projects.change(projectId(id), commands as Command[], revision);
  });
  handle('projects:undo', (id) => projects.undo(projectId(id)));
  handle('projects:redo', (id) => projects.redo(projectId(id)));
  handle('projects:delete', (id) => projects.remove(projectId(id)));
  handle('projects:import', async () => {
    const result = await dialog.showOpenDialog(requireWindow(), {
      filters: [{ name: 'FitaSign', extensions: ['fitasign'] }],
      properties: ['openFile'],
    });
    const file = result.filePaths[0];
    if (result.canceled || !file) return null;
    if ((await stat(file)).size > 12_000_000) throw new Error('Projeto excede 12 MB.');
    const state = await projects.import(JSON.parse(await readFile(file, 'utf8')));
    activeProject = state.document.id;
    return state;
  });
  for (const [channel, extension] of [
    ['projects:copy', 'fitasign'],
    ['projects:export', 'luau'],
  ] as const)
    handle(channel, async (id) => {
      const { document } = await projects.open(projectId(id));
      const result = await dialog.showSaveDialog(requireWindow(), {
        defaultPath: `${filename(document.name)}.${extension}`,
        filters: [
          {
            name: extension === 'luau' ? 'Luau ModuleScript' : 'FitaSign',
            extensions: [extension],
          },
        ],
      });
      if (result.canceled || !result.filePath) return null;
      await writeFile(
        result.filePath,
        extension === 'luau' ? exportLuau(document) : JSON.stringify(document, null, 2),
        'utf8',
      );
      return result.filePath;
    });
  handle('projects:luau', async (id) => {
    clipboard.writeText(exportLuau((await projects.open(projectId(id))).document));
  });
  handle('mcp:info', () => ({
    connected: Boolean(localBridge),
    command: 'node',
    args: [
      app.isPackaged
        ? join(process.resourcesPath, 'mcp', 'stdio.cjs')
        : join(directory, '..', 'mcp', 'stdio.cjs'),
    ],
    connectionFile,
    clients: localBridge?.clientCount() ?? 0,
  }));
  handle('mcp:copy-config', () => {
    const entry = app.isPackaged
      ? join(process.resourcesPath, 'mcp', 'stdio.cjs')
      : join(directory, '..', 'mcp', 'stdio.cjs');
    clipboard.writeText(
      JSON.stringify(
        {
          mcpServers: {
            fitasign: {
              command: 'node',
              args: [entry],
              env: { FITASIGN_CONNECTION_FILE: connectionFile },
            },
          },
        },
        null,
        2,
      ),
    );
  });
}

async function createWindow() {
  window = new BrowserWindow({
    title: 'FitaSign',
    width: 1500,
    height: 960,
    minWidth: 1000,
    minHeight: 680,
    show: false,
    backgroundColor: '#191919',
    autoHideMenuBar: true,
    icon: join(app.getAppPath(), 'build', 'icon.png'),
    webPreferences: {
      preload: join(directory, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== (developmentUrl ?? 'fitasign://app/index.html')) event.preventDefault();
  });
  window.once('ready-to-show', () => window?.show());
  window.on('closed', () => {
    window = null;
  });
  await window.loadURL(developmentUrl ?? 'fitasign://app/index.html');
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (window?.isMinimized()) window.restore();
    window?.focus();
  });
  app
    .whenReady()
    .then(async () => {
      session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
        callback(false),
      );
      session.defaultSession.setPermissionCheckHandler(() => false);
      const rendererDirectory = resolve(directory, '..', 'renderer');
      protocol.handle('fitasign', (request) => {
        const url = new URL(request.url);
        const file = resolve(rendererDirectory, '.' + decodeURIComponent(url.pathname));
        if (url.host !== 'app' || !file.startsWith(rendererDirectory + sep))
          return new Response('Not found', { status: 404 });
        return net.fetch(pathToFileURL(file).toString());
      });
      registerIpc();
      localBridge = await startLocalBridge(projects, connectionFile, capture, async (id) => {
        const state = await projects.open(id);
        activeProject = id;
        requireWindow().webContents.send('project:opened', state);
        return state;
      });
      await createWindow();
    })
    .catch((error: unknown) => {
      dialog.showErrorBox('FitaSign', String(error));
      app.quit();
    });
  app.on('window-all-closed', () => app.quit());
  let closing = false;
  app.on('before-quit', (event) => {
    if (!localBridge || closing) return;
    event.preventDefault();
    closing = true;
    void localBridge.close().finally(() => app.quit());
  });
}
