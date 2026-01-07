import React from 'react';
import styles from './MainPanel.module.css';
import { useApp } from '../../context/AppContext';
import Terminal from './Terminal';

const MainPanel: React.FC = () => {
  const { openTabs, activeTabId, closeTab, setActiveTab, projects } = useApp();

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  // アクティブなタブのworktreeパスを取得
  const getWorktreePath = (tabId: string): string | null => {
    const tab = openTabs.find(t => t.id === tabId);
    if (!tab) return null;

    // worktreeIdからworktreeパスを取得
    for (const project of projects) {
      const worktree = project.worktrees.find(w => w.id === tab.worktreeId);
      if (worktree) {
        return worktree.path;
      }
    }
    return null;
  };

  return (
    <div className={styles.mainPanel}>
      {openTabs.length > 0 && (
        <div className={styles.tabBar}>
          {openTabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTabId === tab.id ? styles.active : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={styles.tabName}>{tab.title}</span>
              <span
                className={styles.closeButton}
                onClick={(e) => handleCloseTab(tab.id, e)}
              >
                ×
              </span>
            </button>
          ))}
        </div>
      )}
      <div className={styles.content}>
        {openTabs.length === 0 ? (
          <div className={styles.emptyState}>
            <p>worktreeを選択してください</p>
            <p style={{ fontSize: '12px', color: '#555' }}>
              左のサイドバーからworktreeをクリックするとターミナルが開きます
            </p>
          </div>
        ) : (
          openTabs.map(tab => {
            const worktreePath = getWorktreePath(tab.id);
            return (
              <div
                key={tab.id}
                className={styles.terminalContainer}
                style={{ display: activeTabId === tab.id ? 'block' : 'none' }}
              >
                {worktreePath ? (
                  <Terminal terminalId={tab.id} worktreePath={worktreePath} />
                ) : (
                  <div style={{ padding: '20px', color: '#f48771' }}>
                    Error: Worktree path not found
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MainPanel;
