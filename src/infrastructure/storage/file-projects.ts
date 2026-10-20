import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProjectRepository, ProjectSummary } from '../../application/projects';
import type { DesignDocument } from '../../domain/document';
import { validateDocument } from '../../domain/validation';

export class FileProjectRepository implements ProjectRepository {
  constructor(private readonly directory: string) {}
  private path(id: string) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error('ID de projeto inválido.');
    return join(this.directory, `${id}.fitasign`);
  }
  async list(): Promise<ProjectSummary[]> {
    await mkdir(this.directory, { recursive: true });
    const summaries: ProjectSummary[] = [];
    for (const entry of await readdir(this.directory)) {
      if (!entry.endsWith('.fitasign')) continue;
      const id = entry.slice(0, -9);
      const document = await this.read(id);
      const info = await stat(this.path(id));
      summaries.push({ id, name: document.name, document, modifiedAt: info.mtime.toISOString() });
    }
    return summaries.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  }
  async read(id: string): Promise<DesignDocument> {
    const file = this.path(id);
    if ((await stat(file)).size > 12_000_000) throw new Error('Projeto excede 12 MB.');
    const value: unknown = JSON.parse(await readFile(file, 'utf8'));
    validateDocument(value);
    return value;
  }
  async write(document: DesignDocument) {
    validateDocument(document);
    await mkdir(this.directory, { recursive: true });
    const file = this.path(document.id);
    const temporary = `${file}.tmp`;
    const serialized = JSON.stringify(document);
    if (Buffer.byteLength(serialized, 'utf8') > 12_000_000)
      throw new Error('Projeto excede 12 MB.');
    await writeFile(temporary, serialized, { encoding: 'utf8', mode: 0o600 });
    await rename(temporary, file);
  }
  async remove(id: string) {
    await rm(this.path(id));
  }
}
