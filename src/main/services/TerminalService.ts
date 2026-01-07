import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';
import os from 'os';

export class TerminalService {
  private terminals: Map<string, any> = new Map();
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * 新しいターミナルを作成
   */
  createTerminal(terminalId: string, worktreePath: string): void {
    // Windows用のシェル設定
    const shell = process.env.COMSPEC || 'powershell.exe';
    const isCmd = shell.toLowerCase().includes('cmd');

    console.log(`[Terminal] Creating terminal ${terminalId} at ${worktreePath}`);
    console.log(`[Terminal] Using shell: ${shell}`);

    try {
      // PTYプロセスを作成
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: worktreePath,
        env: process.env as any,
        useConpty: false, // Windows 10未満との互換性のためwinptyを使用
      });

      // 出力をレンダラープロセスに送信
      ptyProcess.onData((data) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('terminal:data', {
            terminalId,
            data,
          });
        }
      });

      // プロセス終了時の処理
      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(
          `[Terminal] Terminal ${terminalId} exited with code ${exitCode}, signal ${signal}`
        );
        this.terminals.delete(terminalId);

        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('terminal:exit', {
            terminalId,
            exitCode,
          });
        }
      });

      this.terminals.set(terminalId, ptyProcess);

      // claudeコマンドを自動実行（少し遅延させる）
      setTimeout(() => {
        if (this.terminals.has(terminalId)) {
          console.log(`[Terminal] Executing claude command in ${terminalId}`);
          if (isCmd) {
            ptyProcess.write('claude\r\n');
          } else {
            // PowerShell
            ptyProcess.write('claude\r\n');
          }
        }
      }, 500);
    } catch (error) {
      console.error(`[Terminal] Failed to create terminal:`, error);
      throw error;
    }
  }

  /**
   * ターミナルに書き込み
   */
  write(terminalId: string, data: string): void {
    const ptyProcess = this.terminals.get(terminalId);
    if (ptyProcess) {
      ptyProcess.write(data);
    } else {
      console.warn(`[Terminal] Terminal ${terminalId} not found`);
    }
  }

  /**
   * ターミナルをリサイズ
   */
  resize(terminalId: string, cols: number, rows: number): void {
    const ptyProcess = this.terminals.get(terminalId);
    if (ptyProcess) {
      ptyProcess.resize(cols, rows);
    }
  }

  /**
   * ターミナルを終了
   */
  kill(terminalId: string): void {
    const ptyProcess = this.terminals.get(terminalId);
    if (ptyProcess) {
      console.log(`[Terminal] Killing terminal ${terminalId}`);
      ptyProcess.kill();
      this.terminals.delete(terminalId);
    }
  }

  /**
   * すべてのターミナルを終了
   */
  killAll(): void {
    console.log(`[Terminal] Killing all terminals`);
    for (const [terminalId, ptyProcess] of this.terminals) {
      ptyProcess.kill();
    }
    this.terminals.clear();
  }
}
