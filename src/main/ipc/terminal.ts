import { ipcMain } from 'electron';
import { TerminalService } from '../services/TerminalService';

let terminalService: TerminalService | null = null;

export function setupTerminalIPC(service: TerminalService) {
  terminalService = service;

  // ターミナルを作成
  ipcMain.handle(
    'terminal:create',
    async (event, terminalId: string, worktreePath: string) => {
      try {
        terminalService!.createTerminal(terminalId, worktreePath);
        return { success: true };
      } catch (error: any) {
        console.error('Failed to create terminal:', error);
        return {
          success: false,
          error: error.message || 'ターミナルの作成に失敗しました',
        };
      }
    }
  );

  // ターミナルに書き込み
  ipcMain.handle(
    'terminal:write',
    async (event, terminalId: string, data: string) => {
      terminalService!.write(terminalId, data);
      return { success: true };
    }
  );

  // ターミナルをリサイズ
  ipcMain.handle(
    'terminal:resize',
    async (event, terminalId: string, cols: number, rows: number) => {
      terminalService!.resize(terminalId, cols, rows);
      return { success: true };
    }
  );

  // ターミナルを終了
  ipcMain.handle('terminal:kill', async (event, terminalId: string) => {
    terminalService!.kill(terminalId);
    return { success: true };
  });
}
