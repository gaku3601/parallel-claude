export interface IElectronAPI {
  // プロジェクト操作
  addProject: () => Promise<any>;
  removeProject: (projectId: string) => Promise<any>;

  // Worktree操作
  createWorktree: (projectId: string, projectPath: string) => Promise<any>;
  removeWorktree: (
    projectPath: string,
    worktreePath: string,
    deleteBranch: boolean
  ) => Promise<any>;
  listWorktrees: (projectPath: string) => Promise<any>;

  // ターミナル操作
  createTerminal: (terminalId: string, worktreePath: string) => Promise<any>;
  writeToTerminal: (terminalId: string, data: string) => Promise<any>;
  resizeTerminal: (terminalId: string, cols: number, rows: number) => Promise<any>;
  killTerminal: (terminalId: string) => Promise<any>;

  // ターミナルイベント
  onTerminalData: (callback: (data: { terminalId: string; data: string }) => void) => void;
  onTerminalExit: (callback: (data: { terminalId: string; exitCode: number }) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
