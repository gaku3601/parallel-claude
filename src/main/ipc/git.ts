import { ipcMain, dialog } from 'electron';
import { GitService } from '../services/GitService';
import path from 'path';
import { randomUUID } from 'crypto';

const gitService = new GitService();

export function setupGitIPC() {
  // プロジェクトを追加（フォルダ選択ダイアログ）
  ipcMain.handle('project:add', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'プロジェクトフォルダを選択',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'キャンセルされました' };
    }

    const projectPath = result.filePaths[0];

    // Gitリポジトリか確認
    const isGit = await gitService.isGitRepository(projectPath);
    if (!isGit) {
      return {
        success: false,
        error: '選択されたフォルダはGitリポジトリではありません',
      };
    }

    // プロジェクト情報を取得
    const projectName = await gitService.getProjectName(projectPath);
    const worktrees = await gitService.listWorktrees(projectPath);

    return {
      success: true,
      project: {
        id: randomUUID(),
        name: projectName,
        path: projectPath,
        createdAt: new Date().toISOString(),
        worktrees: worktrees.map((w: any) => ({
          id: randomUUID(),
          name: w.name,
          branch: w.branch,
          path: w.path,
          createdAt: new Date().toISOString(),
        })),
      },
    };
  });

  // プロジェクトを削除
  ipcMain.handle('project:remove', async (event, projectId: string) => {
    // 実際にはファイルシステムには何もしない、状態から削除するだけ
    return { success: true };
  });

  // Worktreeを作成
  ipcMain.handle(
    'worktree:create',
    async (event, projectId: string, projectPath: string) => {
      // ランダムな名前を生成
      const worktreeName = gitService.generateWorktreeName();
      const branchName = worktreeName;

      // Worktreeパスを決定
      const parentDir = path.dirname(projectPath);
      const worktreePath = path.join(parentDir, '.worktrees', worktreeName);

      // Worktreeを作成
      const result = await gitService.createWorktree(
        projectPath,
        branchName,
        worktreePath
      );

      if (result.success) {
        return {
          success: true,
          worktree: {
            id: randomUUID(),
            projectId,
            name: worktreeName,
            branch: branchName,
            path: worktreePath,
            createdAt: new Date().toISOString(),
          },
        };
      } else {
        return result;
      }
    }
  );

  // Worktreeを削除
  ipcMain.handle(
    'worktree:remove',
    async (
      event,
      projectPath: string,
      worktreePath: string,
      deleteBranch: boolean
    ) => {
      return await gitService.removeWorktree(
        projectPath,
        worktreePath,
        deleteBranch
      );
    }
  );

  // Worktree一覧を取得
  ipcMain.handle('worktree:list', async (event, projectPath: string) => {
    const worktrees = await gitService.listWorktrees(projectPath);
    return {
      success: true,
      worktrees: worktrees.map((w: any) => ({
        id: randomUUID(),
        name: w.name,
        branch: w.branch,
        path: w.path,
        createdAt: new Date().toISOString(),
      })),
    };
  });
}
