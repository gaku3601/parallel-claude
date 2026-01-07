import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // プロジェクト操作
  addProject: () => ipcRenderer.invoke('project:add'),
  removeProject: (projectId: string) =>
    ipcRenderer.invoke('project:remove', projectId),

  // Worktree操作
  createWorktree: (projectId: string, projectPath: string) =>
    ipcRenderer.invoke('worktree:create', projectId, projectPath),
  removeWorktree: (
    projectPath: string,
    worktreePath: string,
    deleteBranch: boolean
  ) => ipcRenderer.invoke('worktree:remove', projectPath, worktreePath, deleteBranch),
  listWorktrees: (projectPath: string) =>
    ipcRenderer.invoke('worktree:list', projectPath),

  // ターミナル操作
  createTerminal: (terminalId: string, worktreePath: string) =>
    ipcRenderer.invoke('terminal:create', terminalId, worktreePath),
  writeToTerminal: (terminalId: string, data: string) =>
    ipcRenderer.invoke('terminal:write', terminalId, data),
  resizeTerminal: (terminalId: string, cols: number, rows: number) =>
    ipcRenderer.invoke('terminal:resize', terminalId, cols, rows),
  killTerminal: (terminalId: string) =>
    ipcRenderer.invoke('terminal:kill', terminalId),

  // ターミナルイベント
  onTerminalData: (callback: (data: { terminalId: string; data: string }) => void) => {
    ipcRenderer.on('terminal:data', (event, data) => callback(data));
  },
  onTerminalExit: (callback: (data: { terminalId: string; exitCode: number }) => void) => {
    ipcRenderer.on('terminal:exit', (event, data) => callback(data));
  },
});
