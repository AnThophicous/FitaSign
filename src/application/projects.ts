import { createDocument } from '../domain/document';
import type { DesignDocument } from '../domain/document';
import { validateDocument } from '../domain/validation';
import type { Command } from './commands';
import { exampleDocument } from './examples';
import { DesignSession } from './session';

export interface ProjectSummary {
  id: string;
  name: string;
  modifiedAt: string;
  document: DesignDocument;
}
export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>;
  read(id: string): Promise<DesignDocument>;
  write(document: DesignDocument): Promise<void>;
  remove(id: string): Promise<void>;
}
export interface ProjectState {
  document: DesignDocument;
  canUndo: boolean;
  canRedo: boolean;
}

export class ProjectService {
  private sessions = new Map<string, DesignSession>();
  private pending: Promise<unknown> = Promise.resolve();
  constructor(
    private readonly repository: ProjectRepository,
    private readonly newId: () => string,
    private readonly changed: (state: ProjectState) => void = () => {},
  ) {}
  list() {
    return this.repository.list();
  }
  private async session(id: string) {
    let session = this.sessions.get(id);
    if (!session) {
      session = new DesignSession(await this.repository.read(id));
      this.sessions.set(id, session);
    }
    return session;
  }
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.pending.then(operation);
    this.pending = task.catch(() => {});
    return task;
  }
  open(id: string) {
    return this.serial(async () => {
      const session = await this.session(id);
      return { document: session.snapshot(), ...session.history() };
    });
  }
  create(name: string, example = false) {
    return this.serial(async () => {
      const document = example
        ? exampleDocument(this.newId())
        : createDocument(this.newId(), name.trim());
      validateDocument(document);
      await this.repository.write(document);
      this.sessions.set(document.id, new DesignSession(document));
      const state = { document, canUndo: false, canRedo: false };
      this.changed(state);
      return state;
    });
  }
  import(document: unknown) {
    return this.serial(async () => {
      validateDocument(document);
      const copy = { ...structuredClone(document), id: this.newId(), revision: 0 };
      await this.repository.write(copy);
      this.sessions.set(copy.id, new DesignSession(copy));
      const state = { document: copy, canUndo: false, canRedo: false };
      this.changed(state);
      return state;
    });
  }
  change(id: string, commands: Command[], expectedRevision?: number) {
    return this.mutate(id, (session) => session.commit(commands, expectedRevision));
  }
  undo(id: string) {
    return this.mutate(id, (session) => session.undo());
  }
  redo(id: string) {
    return this.mutate(id, (session) => session.redo());
  }
  private mutate(id: string, edit: (session: DesignSession) => DesignDocument) {
    return this.serial(async () => {
      const next = (await this.session(id)).fork();
      const document = edit(next);
      await this.repository.write(document);
      this.sessions.set(id, next);
      const state = { document, ...next.history() };
      this.changed(state);
      return state;
    });
  }
  remove(id: string) {
    return this.serial(async () => {
      await this.repository.remove(id);
      this.sessions.delete(id);
    });
  }
}
