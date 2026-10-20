import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDocument } from '../src/domain/document';
import { ProjectService } from '../src/application/projects';
import { FileProjectRepository } from '../src/infrastructure/storage/file-projects';
import { startLocalBridge } from '../src/infrastructure/mcp/local-server';

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});
async function setup() {
  const directory = await mkdtemp(join(tmpdir(), 'fitasign-mcp-'));
  cleanup.push(() => rm(directory, { force: true, recursive: true }));
  const repository = new FileProjectRepository(join(directory, 'projects'));
  await repository.write(createDocument('test', 'Original'));
  const service = new ProjectService(repository, () => 'new');
  const connectionFile = join(directory, 'connection.json');
  const bridge = await startLocalBridge(service, connectionFile, async () => 'png');
  cleanup.push(bridge.close);
  const connection = JSON.parse(await readFile(connectionFile, 'utf8')) as {
    url: string;
    token: string;
  };
  return { connection, connectionFile };
}
describe('ponte local', () => {
  it('bloqueia requisições sem token e Origin de navegador', async () => {
    const { connection } = await setup();
    expect((await fetch(connection.url, { method: 'POST', body: '{}' })).status).toBe(403);
    expect(
      (
        await fetch(connection.url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${connection.token}`, Origin: 'https://example.com' },
          body: '{}',
        })
      ).status,
    ).toBe(403);
  });
  it('edita, persiste e exporta usando a mesma revisão', async () => {
    const { connection } = await setup();
    async function rpc(method: string, params: unknown) {
      const response = await fetch(connection.url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${connection.token}` },
        body: JSON.stringify({ method, params }),
      });
      return { status: response.status, body: await response.json() };
    }
    const edit = await rpc('document.apply', {
      projectId: 'test',
      expectedRevision: 0,
      commands: [{ kind: 'rename', name: 'MCP editou' }],
    });
    expect(edit.body.result.document.name).toBe('MCP editou');
    const stale = await rpc('document.apply', {
      projectId: 'test',
      expectedRevision: 0,
      commands: [{ kind: 'rename', name: 'Perdido' }],
    });
    expect(stale.status).toBe(400);
    const read = await rpc('document.read', { projectId: 'test' });
    expect(read.body.result.document.revision).toBe(1);
    expect((await rpc('document.export', { projectId: 'test' })).body.result).toContain(
      'return function(parent: Instance): ScreenGui',
    );
    expect((await rpc('exec', { code: 'bad' })).status).toBe(400);
  });
});
