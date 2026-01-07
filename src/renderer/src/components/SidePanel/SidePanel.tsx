import React, { useState } from 'react';
import styles from './SidePanel.module.css';
import { useApp } from '../../context/AppContext';

const SidePanel: React.FC = () => {
  const {
    projects,
    addProject,
    removeProject,
    addWorktreeToProject,
    removeWorktreeFromProject,
    openTab,
    activeTabId,
  } = useApp();

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(projects.map(p => p.id))
  );

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleAddProject = async () => {
    try {
      const result = await window.electronAPI.addProject();
      if (result.success) {
        addProject(result.project);
      } else {
        alert(result.error || 'プロジェクトの追加に失敗しました');
      }
    } catch (error) {
      console.error('Failed to add project:', error);
      alert('プロジェクトの追加中にエラーが発生しました');
    }
  };

  const handleAddWorktree = async (projectId: string, projectPath: string) => {
    try {
      const result = await window.electronAPI.createWorktree(
        projectId,
        projectPath
      );
      if (result.success) {
        addWorktreeToProject(projectId, result.worktree);
      } else {
        alert(result.error || 'Worktreeの作成に失敗しました');
      }
    } catch (error) {
      console.error('Failed to create worktree:', error);
      alert('Worktreeの作成中にエラーが発生しました');
    }
  };

  const handleDeleteWorktree = async (
    projectId: string,
    projectPath: string,
    worktreeId: string,
    worktreePath: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    const confirmDelete = confirm('このWorktreeを削除しますか？');
    if (!confirmDelete) return;

    try {
      const result = await window.electronAPI.removeWorktree(
        projectPath,
        worktreePath,
        false // ブランチは削除しない
      );
      if (result.success) {
        removeWorktreeFromProject(projectId, worktreeId);
      } else {
        alert(result.error || 'Worktreeの削除に失敗しました');
      }
    } catch (error) {
      console.error('Failed to remove worktree:', error);
      alert('Worktreeの削除中にエラーが発生しました');
    }
  };

  const handleSelectWorktree = (worktreeId: string, worktreeName: string) => {
    openTab({
      id: crypto.randomUUID(),
      worktreeId,
      title: worktreeName,
      isActive: true,
    });
  };

  return (
    <div className={styles.sidePanel}>
      <div className={styles.header}>
        <div className={styles.title}>Projects</div>
      </div>
      <div className={styles.content}>
        {projects.length === 0 ? (
          <div className={styles.emptyState}>
            <p>プロジェクトがありません</p>
            <button className={styles.addProjectButton} onClick={handleAddProject}>
              プロジェクトを追加
            </button>
          </div>
        ) : (
          <div className={styles.projectList}>
            {projects.map(project => (
              <div key={project.id} className={styles.project}>
                <div
                  className={styles.projectHeader}
                  onClick={() => toggleProject(project.id)}
                >
                  <div className={styles.projectName}>
                    <span className={styles.projectIcon}>
                      {expandedProjects.has(project.id) ? '▼' : '▶'}
                    </span>
                    <span>{project.name}</span>
                  </div>
                  <button
                    className={styles.addButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddWorktree(project.id, project.path);
                    }}
                    title="Add worktree"
                  >
                    +
                  </button>
                </div>
                {expandedProjects.has(project.id) && (
                  <div className={styles.worktreeList}>
                    {project.worktrees.map(worktree => (
                      <div
                        key={worktree.id}
                        className={`${styles.worktree} ${
                          activeTabId === worktree.id ? styles.active : ''
                        }`}
                        onClick={() => handleSelectWorktree(worktree.id, worktree.name)}
                      >
                        <span className={styles.worktreeName}>{worktree.name}</span>
                        <button
                          className={styles.deleteButton}
                          onClick={(e) =>
                            handleDeleteWorktree(
                              project.id,
                              project.path,
                              worktree.id,
                              worktree.path,
                              e
                            )
                          }
                          title="Delete worktree"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button className={styles.addProjectButton} onClick={handleAddProject}>
              + プロジェクトを追加
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidePanel;
