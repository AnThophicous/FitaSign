import { createServer } from 'node:http';
import type { IncomingMessage } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ProjectService } from '../../application/projects';
import type { Command } from '../../application/commands';
import { exportLuau } from '../../application/export-luau';

type Capture = (projectId: string, nodeId?: string) => Promise<string>;
async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2_000_000) throw new Error('Requisição excede 2 MB.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
    method: string;
    params: Record<string, unknown>;
  };
}

export async function startLocalBridge(
  projects: ProjectService,
  connectionFile: string,
  capture: Capture,
  present: (id: string) => Promise<unknown> = (id) => projects.open(id),
) {
  const token = randomBytes(32).toString('hex');
  const clients = new Map<string, number>();
  const server = createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    const presented = Buffer.from(request.headers.authorization?.replace(/^Bearer /, '') ?? '');
    const expected = Buffer.from(token);
    if (
      request.headers.origin ||
      presented.length !== expected.length ||
      !timingSafeEqual(presented, expected)
    ) {
      response.writeHead(403).end(JSON.stringify({ error: 'Acesso local não autorizado.' }));
      return;
    }
    if (
      request.method !== 'POST' ||
      request.url !== '/rpc' ||
      !/^127\.0\.0\.1:\d+$/.test(request.headers.host ?? '')
    ) {
      response.writeHead(404).end('{}');
      return;
    }
    const client = request.headers['x-fitasign-client'];
    if (typeof client === 'string') clients.set(client.slice(0, 100), Date.now());
    try {
      const { method, params = {} } = await readBody(request);
      const id = typeof params.projectId === 'string' ? params.projectId : '';
      let result: unknown;
      switch (method) {
        case 'projects.list':
          result = (await projects.list()).map(({ id, name, modifiedAt }) => ({
            id,
            name,
            modifiedAt,
          }));
          break;
        case 'projects.create':
          result = await projects.create(
            String(params.name ?? 'Sem título').slice(0, 120),
            params.example === true,
          );
          break;
        case 'document.read':
          result = await projects.open(id);
          break;
        case 'document.open':
          result = await present(id);
          break;
        case 'document.apply': {
          if (typeof params.expectedRevision !== 'number')
            throw new Error('Informe expectedRevision.');
          result = await projects.change(id, params.commands as Command[], params.expectedRevision);
          break;
        }
        case 'document.undo':
          result = await projects.undo(id);
          break;
        case 'document.redo':
          result = await projects.redo(id);
          break;
        case 'document.export':
          result = exportLuau((await projects.open(id)).document);
          break;
        case 'document.capture':
          result = await capture(id, typeof params.nodeId === 'string' ? params.nodeId : undefined);
          break;
        default:
          throw new Error('Método não encontrado.');
      }
      response.end(JSON.stringify({ result }));
    } catch (error) {
      response.writeHead(400).end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Falha na requisição.',
        }),
      );
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Porta local indisponível.');
  await mkdir(dirname(connectionFile), { recursive: true });
  await writeFile(
    connectionFile,
    JSON.stringify({ url: `http://127.0.0.1:${address.port}/rpc`, token, pid: process.pid }),
    { mode: 0o600 },
  );
  return {
    clientCount: () => [...clients.values()].filter((time) => Date.now() - time < 120000).length,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(connectionFile, { force: true });
    },
  };
}
