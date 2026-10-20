import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge, ProjectState } from '../../shared/bridge';

const bridge: DesktopBridge = {
  listProjects: () => ipcRenderer.invoke('projects:list'),
  createProject: (name, example) => ipcRenderer.invoke('projects:create', name, example),
  openProject: (id) => ipcRenderer.invoke('projects:open', id),
  changeProject: (id, commands, revision) =>
    ipcRenderer.invoke('projects:change', id, commands, revision),
  undo: (id) => ipcRenderer.invoke('projects:undo', id),
  redo: (id) => ipcRenderer.invoke('projects:redo', id),
  deleteProject: (id) => ipcRenderer.invoke('projects:delete', id),
  importProject: () => ipcRenderer.invoke('projects:import'),
  saveProjectCopy: (id) => ipcRenderer.invoke('projects:copy', id),
  exportProject: (id) => ipcRenderer.invoke('projects:export', id),
  copyLuau: (id) => ipcRenderer.invoke('projects:luau', id),
  connectionInfo: () => ipcRenderer.invoke('mcp:info'),
  copyConnectionConfig: () => ipcRenderer.invoke('mcp:copy-config'),
  onProjectChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, state: ProjectState) => callback(state);
    ipcRenderer.on('project:changed', listener);
    return () => ipcRenderer.removeListener('project:changed', listener);
  },
  onProjectOpened: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, state: ProjectState) => callback(state);
    ipcRenderer.on('project:opened', listener);
    return () => ipcRenderer.removeListener('project:opened', listener);
  },
};
contextBridge.exposeInMainWorld('fitasign', bridge);
