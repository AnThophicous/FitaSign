import { expect, it } from 'vitest';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { FileProjectRepository } from '../src/infrastructure/storage/file-projects';
import { startLocalBridge } from '../src/infrastructure/mcp/local-server';
import { ProjectService } from '../src/application/projects';

it('negocia MCP por stdio, expõe schemas e devolve conflitos como erro de ferramenta', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fitasign-stdio-'));
  const entry = join(directory, 'stdio.cjs');
  const connectionFile = join(directory, 'connection.json');
  const projects = new ProjectService(
    new FileProjectRepository(join(directory, 'projects')),
    () => 'test',
  );
  const bridge = await startLocalBridge(projects, connectionFile, async () => 'iVBORw0KGgo=');
  const client = new Client({ name: 'fitasign-integration-test', version: '1.0.0' });
  try {
    await build({
      entryPoints: ['src/infrastructure/mcp/stdio.ts'],
      outfile: entry,
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node24',
    });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [entry],
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(
            (entry): entry is [string, string] => entry[1] !== undefined,
          ),
        ),
        FITASIGN_CONNECTION_FILE: connectionFile,
      },
    });
    await client.connect(transport);
    expect((await client.listTools()).tools.map((tool) => tool.name)).toContain('capture_canvas');
    expect((await client.readResource({ uri: 'fitasign://schema' })).contents[0]).toMatchObject({
      mimeType: 'text/plain',
    });
    const created = await client.callTool({
      name: 'create_project',
      arguments: { name: 'MCP real' },
    });
    expect(created.isError).not.toBe(true);
    const changed = await client.callTool({
      name: 'apply_commands',
      arguments: {
        projectId: 'test',
        expectedRevision: 0,
        commands: [
          {
            kind: 'add',
            id: 'text',
            parentId: 'screen',
            type: 'TextLabel',
            name: 'Título',
            properties: { text: 'Pelo protocolo' },
          },
        ],
      },
    });
    expect(changed.isError).not.toBe(true);
    const conflict = await client.callTool({
      name: 'apply_commands',
      arguments: {
        projectId: 'test',
        expectedRevision: 0,
        commands: [{ kind: 'rename', name: 'Antigo' }],
      },
    });
    expect(conflict.isError).toBe(true);
    const catalog = await client.callTool({
      name: 'search_catalog',
      arguments: { className: 'UIListLayout' },
    });
    expect(catalog.isError).not.toBe(true);
    expect(catalog.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: expect.stringContaining('FillDirection') }),
      ]),
    );
    const native = await client.callTool({
      name: 'apply_commands',
      arguments: {
        projectId: 'test',
        expectedRevision: 1,
        commands: [
          {
            kind: 'add',
            id: 'list',
            parentId: 'screen',
            type: 'UIListLayout',
            name: 'Lista',
            properties: { native: { FillDirection: 'Horizontal' } },
          },
        ],
      },
    });
    expect(native.isError).not.toBe(true);
    const exported = await client.callTool({
      name: 'export_luau',
      arguments: { projectId: 'test' },
    });
    expect(exported.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', text: expect.stringContaining('Pelo protocolo') }),
      ]),
    );
    const capture = await client.callTool({
      name: 'capture_canvas',
      arguments: { projectId: 'test' },
    });
    expect(capture.content).toEqual([
      { type: 'image', mimeType: 'image/png', data: 'iVBORw0KGgo=' },
    ]);
  } finally {
    await client.close();
    await bridge.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 20000);
