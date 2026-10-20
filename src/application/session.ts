import type { DesignDocument } from '../domain/document';
import { validateDocument } from '../domain/validation';
import { applyCommands } from './commands';
import type { Command } from './commands';

export class DesignSession {
  private document: DesignDocument;
  private past: DesignDocument[] = [];
  private future: DesignDocument[] = [];

  constructor(document: DesignDocument) {
    validateDocument(document);
    this.document = structuredClone(document);
  }
  snapshot() {
    return structuredClone(this.document);
  }
  fork() {
    const copy = new DesignSession(this.document);
    copy.past = [...this.past];
    copy.future = [...this.future];
    return copy;
  }
  history() {
    return { canUndo: this.past.length > 0, canRedo: this.future.length > 0 };
  }
  commit(commands: Command[], expectedRevision?: number) {
    if (expectedRevision !== undefined && this.document.revision !== expectedRevision)
      throw new Error('O projeto mudou. Leia a revisão atual e tente novamente.');
    const next = applyCommands(this.document, commands);
    this.past.push(this.document);
    while (
      this.past.length > 1 &&
      (this.past.length > 100 ||
        this.past.reduce((sum, state) => sum + Object.keys(state.nodes).length, 0) > 16000)
    )
      this.past.shift();
    this.future = [];
    this.document = next;
    return this.snapshot();
  }
  undo() {
    const previous = this.past.pop();
    if (!previous) return this.snapshot();
    this.future.push(this.document);
    this.document = { ...previous, revision: this.document.revision + 1 };
    return this.snapshot();
  }
  redo() {
    const next = this.future.pop();
    if (!next) return this.snapshot();
    this.past.push(this.document);
    this.document = { ...next, revision: this.document.revision + 1 };
    return this.snapshot();
  }
}
