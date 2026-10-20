import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FileProjectRepository } from '../src/infrastructure/storage/file-projects';
import { ProjectService } from '../src/application/projects';
import { createDocument } from '../src/domain/document';
import type { ProjectRepository } from '../src/application/projects';

const directories: string[] = [];
afterEach(async () => {
  for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true });
});
describe('armazenamento e coordenação', () => {
  it('reabre projetos salvos e lista pelo ID correto', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'fitasign-'));
    directories.push(directory);
    const repository = new FileProjectRepository(directory);
    const document = createDocument('example', 'Menu');
    await repository.write(document);
    expect(await repository.read('example')).toEqual(document);
    expect((await repository.list())[0]?.id).toBe('example');
    await expect(repository.read('../outside')).rejects.toThrow();
    await repository.remove('example');
    expect(await repository.list()).toEqual([]);
  });
  it('não publica uma alteração quando a gravação falha', async () => {
    let fail = false;
    let published = 0;
    const repository: ProjectRepository = {
      list: async () => [],
      read: async () => createDocument('test', 'Original'),
      write: async () => {
        if (fail) throw new Error('Disco cheio');
      },
      remove: async () => {},
    };
    const service = new ProjectService(
      repository,
      () => 'test',
      () => published++,
    );
    await service.open('test');
    fail = true;
    await expect(service.change('test', [{ kind: 'rename', name: 'Perdido' }], 0)).rejects.toThrow(
      'Disco cheio',
    );
    expect((await service.open('test')).document.name).toBe('Original');
    expect(published).toBe(0);
  });
  it('serializa agentes concorrentes e rejeita uma revisão antiga', async () => {
    const repository: ProjectRepository = {
      list: async () => [],
      read: async () => createDocument('test', 'Original'),
      write: async () => {},
      remove: async () => {},
    };
    const service = new ProjectService(repository, () => 'test');
    const results = await Promise.allSettled([
      service.change('test', [{ kind: 'rename', name: 'A' }], 0),
      service.change('test', [{ kind: 'rename', name: 'B' }], 0),
    ]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    expect((await service.open('test')).document.name).toBe('A');
  });
});
