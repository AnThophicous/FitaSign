import type { DesignDocument } from '../domain/document';
import type { Command } from '../application/commands';
import type { ProjectState, ProjectSummary } from '../application/projects';

export interface ConnectionInfo {
  connected: boolean;
  command: string;
  args: string[];
  connectionFile: string;
  clients: number;
}
export interface DesktopBridge {
  listProjects(): Promise<ProjectSummary[]>;
  createProject(name: string, example?: boolean): Promise<ProjectState>;
  openProject(id: string): Promise<ProjectState>;
  changeProject(id: string, commands: Command[], expectedRevision: number): Promise<ProjectState>;
  undo(id: string): Promise<ProjectState>;
  redo(id: string): Promise<ProjectState>;
  deleteProject(id: string): Promise<void>;
  importProject(): Promise<ProjectState | null>;
  saveProjectCopy(id: string): Promise<string | null>;
  exportProject(id: string): Promise<string | null>;
  copyLuau(id: string): Promise<void>;
  connectionInfo(): Promise<ConnectionInfo>;
  copyConnectionConfig(): Promise<void>;
  onProjectChanged(callback: (state: ProjectState) => void): () => void;
  onProjectOpened(callback: (state: ProjectState) => void): () => void;
}
declare global {
  interface Window {
    fitasign: DesktopBridge;
  }
}
export type { DesignDocument, ProjectState, ProjectSummary, Command };
