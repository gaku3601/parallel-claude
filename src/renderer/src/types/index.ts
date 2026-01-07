export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  worktrees: Worktree[];
}

export interface Worktree {
  id: string;
  projectId: string;
  name: string;
  branch: string;
  path: string;
  createdAt: Date;
}

export interface TerminalTab {
  id: string;
  worktreeId: string;
  title: string;
  isActive: boolean;
}

export interface AppSettings {
  windowSize: { width: number; height: number };
  windowPosition: { x: number; y: number };
  sidePanelWidth: number;
  theme: 'dark' | 'light';
  terminal: {
    fontSize: number;
    fontFamily: string;
    cursorStyle: 'block' | 'underline' | 'bar';
  };
  git: {
    worktreeBasePath: string;
    deleteBranchOnWorktreeRemove: boolean;
  };
}

export interface AppState {
  projects: Project[];
  openTabs: TerminalTab[];
  activeTabId: string | null;
  settings: AppSettings;
}
