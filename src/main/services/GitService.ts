import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

interface Worktree {
  id: string;
  path: string;
  branch: string;
  name: string;
  projectId: string;
  createdAt: Date;
}

export class GitService {
  /**
   * プロジェクトがGitリポジトリか確認
   */
  async isGitRepository(projectPath: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: projectPath });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Worktree一覧を取得
   */
  async listWorktrees(projectPath: string): Promise<any[]> {
    try {
      const { stdout } = await execAsync('git worktree list --porcelain', {
        cwd: projectPath,
      });

      const worktrees: any[] = [];
      const lines = stdout.split('\n');
      let currentWorktree: any = {};

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          currentWorktree.path = line.replace('worktree ', '');
        } else if (line.startsWith('branch ')) {
          currentWorktree.branch = line
            .replace('branch ', '')
            .replace('refs/heads/', '');
        } else if (line === '') {
          if (currentWorktree.path) {
            worktrees.push({
              path: currentWorktree.path,
              branch: currentWorktree.branch || 'detached',
              name: path.basename(currentWorktree.path),
            });
          }
          currentWorktree = {};
        }
      }

      return worktrees;
    } catch (error: any) {
      console.error('Failed to list worktrees:', error);
      return [];
    }
  }

  /**
   * Worktreeを作成
   */
  async createWorktree(
    projectPath: string,
    branchName: string,
    worktreePath: string
  ): Promise<{ success: boolean; error?: string; worktree?: any }> {
    try {
      // Worktreeディレクトリの親を作成
      const parentDir = path.dirname(worktreePath);
      await fs.mkdir(parentDir, { recursive: true });

      // ブランチを作成してworktreeを追加
      await execAsync(
        `git worktree add -b "${branchName}" "${worktreePath}" HEAD`,
        { cwd: projectPath }
      );

      return {
        success: true,
        worktree: {
          path: worktreePath,
          branch: branchName,
          name: path.basename(worktreePath),
        },
      };
    } catch (error: any) {
      const stderr = error.stderr || error.message;

      if (stderr.includes('already exists')) {
        return {
          success: false,
          error: `ブランチ "${branchName}" は既に存在します。`,
        };
      } else if (stderr.includes('is already checked out')) {
        return {
          success: false,
          error: `このブランチは既に別のworktreeでチェックアウトされています。`,
        };
      } else {
        return {
          success: false,
          error: `Worktreeの作成に失敗しました: ${stderr}`,
        };
      }
    }
  }

  /**
   * Worktreeを削除
   */
  async removeWorktree(
    projectPath: string,
    worktreePath: string,
    deleteBranch: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Worktreeを削除
      await execAsync(`git worktree remove "${worktreePath}" --force`, {
        cwd: projectPath,
      });

      // ブランチも削除する場合
      if (deleteBranch) {
        const branchName = path.basename(worktreePath);
        try {
          await execAsync(`git branch -D "${branchName}"`, { cwd: projectPath });
        } catch (error) {
          console.warn('ブランチ削除に失敗:', error);
        }
      }

      return { success: true };
    } catch (error: any) {
      const stderr = error.stderr || error.message;
      return {
        success: false,
        error: `Worktreeの削除に失敗しました: ${stderr}`,
      };
    }
  }

  /**
   * ランダムな都市名を生成
   */
  generateWorktreeName(): string {
    const cities = [
      'tokyo',
      'paris',
      'london',
      'newyork',
      'berlin',
      'sydney',
      'toronto',
      'singapore',
      'seoul',
      'dubai',
      'mumbai',
      'stockholm',
      'amsterdam',
      'barcelona',
      'rome',
      'vienna',
      'prague',
      'oslo',
      'copenhagen',
      'helsinki',
    ];

    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .slice(0, 15);

    return `${randomCity}-${timestamp}`;
  }

  /**
   * プロジェクト名を取得
   */
  async getProjectName(projectPath: string): Promise<string> {
    return path.basename(projectPath);
  }
}
