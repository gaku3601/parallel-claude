import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Project, TerminalTab, AppSettings } from '../types';

interface AppContextType {
  projects: Project[];
  openTabs: TerminalTab[];
  activeTabId: string | null;
  settings: AppSettings;

  // Project actions
  addProject: (project: Project) => void;
  removeProject: (projectId: string) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;

  // Worktree actions
  addWorktreeToProject: (projectId: string, worktree: any) => void;
  removeWorktreeFromProject: (projectId: string, worktreeId: string) => void;

  // Tab actions
  openTab: (tab: TerminalTab) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;

  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const defaultSettings: AppSettings = {
  windowSize: { width: 1200, height: 800 },
  windowPosition: { x: 100, y: 100 },
  sidePanelWidth: 250,
  theme: 'dark',
  terminal: {
    fontSize: 14,
    fontFamily: 'Consolas, monospace',
    cursorStyle: 'block',
  },
  git: {
    worktreeBasePath: '../.worktrees',
    deleteBranchOnWorktreeRemove: false,
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [openTabs, setOpenTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // Project actions
  const addProject = (project: Project) => {
    setProjects([...projects, project]);
  };

  const removeProject = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId));
  };

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    setProjects(projects.map(p =>
      p.id === projectId ? { ...p, ...updates } : p
    ));
  };

  // Worktree actions
  const addWorktreeToProject = (projectId: string, worktree: any) => {
    setProjects(projects.map(p =>
      p.id === projectId
        ? { ...p, worktrees: [...p.worktrees, worktree] }
        : p
    ));
  };

  const removeWorktreeFromProject = (projectId: string, worktreeId: string) => {
    setProjects(projects.map(p =>
      p.id === projectId
        ? { ...p, worktrees: p.worktrees.filter(w => w.id !== worktreeId) }
        : p
    ));
  };

  // Tab actions
  const openTab = (tab: TerminalTab) => {
    // Check if tab already exists
    const existingTab = openTabs.find(t => t.worktreeId === tab.worktreeId);
    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      setOpenTabs([...openTabs, tab]);
      setActiveTabId(tab.id);
    }
  };

  const closeTab = (tabId: string) => {
    const newTabs = openTabs.filter(t => t.id !== tabId);
    setOpenTabs(newTabs);

    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[0].id);
    } else if (newTabs.length === 0) {
      setActiveTabId(null);
    }
  };

  const setActiveTab = (tabId: string) => {
    setActiveTabId(tabId);
  };

  // Settings actions
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings({ ...settings, ...newSettings });
  };

  return (
    <AppContext.Provider
      value={{
        projects,
        openTabs,
        activeTabId,
        settings,
        addProject,
        removeProject,
        updateProject,
        addWorktreeToProject,
        removeWorktreeFromProject,
        openTab,
        closeTab,
        setActiveTab,
        updateSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
