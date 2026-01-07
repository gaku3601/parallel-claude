import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class FileService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(app.getPath('temp'), 'parallel-claude-files');
    this.ensureTempDir();
    this.cleanupOldFiles();
  }

  /**
   * クリップボード画像をtmpフォルダに保存
   * @param imageData - 画像データのBuffer
   * @param mimeType - 画像のMIMEタイプ（例: 'image/png'）
   * @returns 保存されたファイルの絶対パス
   */
  async saveClipboardImage(imageData: Buffer, mimeType: string): Promise<string> {
    try {
      this.ensureTempDir();

      // MIMEタイプから拡張子を取得（例: 'image/png' → 'png'）
      const ext = mimeType.split('/')[1] || 'png';

      // タイムスタンプとUUIDでユニークなファイル名を生成
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
      const uuid = crypto.randomUUID().substring(0, 8);
      const filename = `clipboard-${timestamp}-${uuid}.${ext}`;
      const filePath = path.join(this.tempDir, filename);

      // ファイルに書き込み
      await fs.promises.writeFile(filePath, imageData);

      return filePath;
    } catch (err: any) {
      throw new Error(`ファイル保存エラー: ${err.message}`);
    }
  }

  /**
   * 選択されたファイルをtmpフォルダにコピー
   * @param sourceFilePath - コピー元のファイルパス
   * @returns tmpフォルダ内の新しいファイルパス
   */
  async copyFileToTemp(sourceFilePath: string): Promise<string> {
    try {
      this.ensureTempDir();

      // 元のファイル名と拡張子を取得
      const originalFileName = path.basename(sourceFilePath);
      const ext = path.extname(sourceFilePath);
      const baseName = path.basename(sourceFilePath, ext);

      // タイムスタンプとUUIDでユニークなファイル名を生成
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
      const uuid = crypto.randomUUID().substring(0, 8);
      const filename = `${baseName}-${timestamp}-${uuid}${ext}`;
      const destFilePath = path.join(this.tempDir, filename);

      // ファイルをコピー
      await fs.promises.copyFile(sourceFilePath, destFilePath);

      return destFilePath;
    } catch (err: any) {
      throw new Error(`ファイルコピーエラー: ${err.message}`);
    }
  }

  /**
   * tmpフォルダが存在することを確認し、なければ作成
   */
  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 古いファイルをクリーンアップ
   * @param maxAgeHours - 削除対象となるファイルの最大経過時間（時間単位、デフォルト: 24時間）
   */
  cleanupOldFiles(maxAgeHours: number = 24): void {
    try {
      if (!fs.existsSync(this.tempDir)) {
        return;
      }

      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

      const files = fs.readdirSync(this.tempDir);

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);

        // ファイルの経過時間をチェック
        if (now - stats.mtimeMs > maxAgeMs) {
          try {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up old file: ${filePath}`);
          } catch (err) {
            console.error(`Failed to delete ${filePath}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }

  /**
   * tmpフォルダのパスを取得
   * @returns tmpフォルダの絶対パス
   */
  getTempDir(): string {
    return this.tempDir;
  }
}
