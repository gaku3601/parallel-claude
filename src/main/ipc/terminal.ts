import { ipcMain, dialog } from 'electron';
import { TerminalService } from '../services/TerminalService';
import { FileService } from '../services/FileService';

let terminalService: TerminalService | null = null;
let fileService: FileService | null = null;

export function setupTerminalIPC(
  service: TerminalService,
  fileSvc: FileService
) {
  terminalService = service;
  fileService = fileSvc;

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

  // ファイル操作: クリップボード画像を保存
  ipcMain.handle(
    'file:saveClipboardImage',
    async (event, imageData: Buffer, mimeType: string) => {
      try {
        const filePath = await fileService!.saveClipboardImage(imageData, mimeType);
        return { success: true, filePath };
      } catch (error: any) {
        console.error('Failed to save clipboard image:', error);
        return {
          success: false,
          error: error.message || 'クリップボード画像の保存に失敗しました',
        };
      }
    }
  );

  // ファイル操作: ファイル選択ダイアログを開く
  ipcMain.handle('file:selectFile', async (event) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false };
      }

      // 選択されたファイルをtmpフォルダにコピー
      const sourceFilePath = result.filePaths[0];
      const copiedFilePath = await fileService!.copyFileToTemp(sourceFilePath);

      return { success: true, filePath: copiedFilePath };
    } catch (error: any) {
      console.error('Failed to select file:', error);
      return {
        success: false,
        error: error.message || 'ファイル選択に失敗しました',
      };
    }
  });

  // ファイル操作: ファイルパスをターミナルに送信
  ipcMain.handle(
    'file:sendToTerminal',
    async (event, terminalId: string, filePath: string) => {
      try {
        terminalService!.write(terminalId, filePath + '\n');
        return { success: true };
      } catch (error: any) {
        console.error('Failed to send file to terminal:', error);
        return {
          success: false,
          error: error.message || 'ファイルパスの送信に失敗しました',
        };
      }
    }
  );
}
