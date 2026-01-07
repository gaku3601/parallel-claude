# Parallel Claude - 実装ノート

## 重要な実装課題と解決策

### 1. Claude Code CLIへのファイル送信

#### 課題
Claude Code CLIがターミナルセッション中にファイル（特に画像）をどのように受け付けるか、公式ドキュメントで明確でない可能性があります。

#### 調査が必要な項目
- [ ] `claude --help`で利用可能なオプションを確認
- [ ] インタラクティブセッション中のファイル添付方法を確認
- [ ] Claude Code CLIのGitHubリポジトリを確認

#### 想定される解決策

**方法1: ファイルパスを直接送信**
```bash
# ユーザーがCtrl+Vを押す
# → クリップボードから画像を取得
# → 一時ファイルに保存: C:\Temp\parallel-claude\image-123.png
# → ターミナルに送信:
/path/to/image.png
```

**方法2: 特殊なコマンド構文**
```bash
# もしClaude Codeが特別な構文をサポートしている場合
@file C:\Temp\parallel-claude\image-123.png
# または
<file>C:\Temp\parallel-claude\image-123.png</file>
```

**方法3: stdin経由でbase64エンコード**
```typescript
// 画像をbase64エンコードしてstdinに送信
const imageBuffer = await fs.readFile(imagePath);
const base64Image = imageBuffer.toString('base64');
terminalService.write(terminalId, `data:image/png;base64,${base64Image}\r`);
```

**方法4: 一時的にClaudeセッションを終了して--fileオプションで再開**
```bash
# 現在のセッションを終了（Ctrl+D）
# 新しいセッションを開始
claude --file C:\Temp\parallel-claude\image-123.png
```

#### 推奨アプローチ
1. まず方法1（ファイルパスを直接送信）を試す
2. 動作しない場合は、Claude Code CLIのソースコードまたはドキュメントを詳しく調査
3. 必要に応じてClaude Code CLIの開発チームに問い合わせ

---

### 2. Windows環境でのnode-pty

#### 課題
`node-pty`はネイティブモジュールであり、Electronで動作させるには適切にビルドする必要があります。

#### 解決策

**インストール時**
```bash
npm install node-pty

# Electron用にリビルド
npm install --save-dev electron-rebuild
npx electron-rebuild
```

**package.jsonに追加**
```json
{
  "scripts": {
    "postinstall": "electron-rebuild"
  }
}
```

#### トラブルシューティング
- **エラー**: `node-pty`のビルドに失敗する
  - **原因**: Windows Build Toolsがインストールされていない
  - **解決**: `npm install --global windows-build-tools`（管理者権限で実行）

- **エラー**: Electronで`node-pty`をrequireできない
  - **原因**: Electron用にリビルドされていない
  - **解決**: `electron-rebuild`を実行

---

### 3. Git Worktreeのパス管理

#### Windows特有の問題
- パス区切り文字が`\`（バックスラッシュ）
- スペースを含むパスの扱い
- 相対パスと絶対パスの違い

#### ベストプラクティス

```typescript
import path from 'path';

// ❌ 悪い例
const worktreePath = projectPath + '/../.worktrees/' + worktreeName;

// ✅ 良い例
const worktreePath = path.join(projectPath, '..', '.worktrees', worktreeName);

// ❌ 悪い例
await execAsync(`git worktree add ${worktreePath}`);

// ✅ 良い例（スペースを含むパスに対応）
await execAsync(`git worktree add "${worktreePath}"`);
```

#### Worktreeの配置場所

**オプション1: リポジトリの親ディレクトリに配置**
```
C:\Users\user\projects\
├── my-repo/          # メインリポジトリ
└── .worktrees/       # Worktree専用フォルダ
    ├── tokyo-123/
    ├── paris-456/
    └── london-789/
```

**オプション2: リポジトリ内の特定フォルダ**
```
C:\Users\user\projects\my-repo\
├── .git/
├── src/
└── .parallel-worktrees/  # Worktree専用フォルダ
    ├── tokyo-123/
    ├── paris-456/
    └── london-789/
```

推奨: **オプション1**（リポジトリの外に配置）
- メインリポジトリのworking treeが汚れない
- gitignore不要

---

### 4. ターミナルのリサイズ処理

#### 課題
ウィンドウサイズ変更時にxtermとnode-ptyの両方をリサイズする必要があります。

#### 実装例

```typescript
// src/renderer/src/components/MainPanel/Terminal.tsx
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useEffect, useRef } from 'react';

export function TerminalComponent({ terminalId }: { terminalId: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // xtermインスタンスを作成
    const xterm = new Terminal({
      fontSize: 14,
      fontFamily: 'Consolas, monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // ユーザー入力をnode-ptyに送信
    xterm.onData((data) => {
      window.electronAPI.writeToTerminal(terminalId, data);
    });

    // node-ptyからの出力を受信
    window.electronAPI.onTerminalData(({ terminalId: id, data }) => {
      if (id === terminalId) {
        xterm.write(data);
      }
    });

    // リサイズイベント
    const handleResize = () => {
      fitAddon.fit();
      const { cols, rows } = xterm;
      window.electronAPI.resizeTerminal(terminalId, cols, rows);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
    };
  }, [terminalId]);

  return <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />;
}
```

---

### 5. クリップボード監視とCtrl+Vのハンドリング

#### 課題
通常のCtrl+V（テキストペースト）と画像ペーストを区別する必要があります。

#### 実装例

```typescript
// src/renderer/src/components/MainPanel/Terminal.tsx

useEffect(() => {
  const handleKeyDown = async (e: KeyboardEvent) => {
    // Ctrl+Vが押された
    if (e.ctrlKey && e.key === 'v') {
      // クリップボードに画像があるか確認
      const imagePath = await window.electronAPI.getClipboardImage();

      if (imagePath) {
        // 画像がある場合
        e.preventDefault(); // デフォルトのペーストを防ぐ

        // Claude Codeに画像を送信
        await window.electronAPI.sendFileToClaude(terminalId, imagePath);

        // ユーザーに通知
        console.log('画像を送信しました:', imagePath);
      }
      // 画像がない場合は、通常のテキストペーストが実行される
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [terminalId]);
```

---

### 6. エラーハンドリング

#### Git操作のエラー

```typescript
// src/main/services/GitService.ts

async createWorktree(
  projectPath: string,
  branchName: string,
  worktreePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync(
      `git worktree add -b ${branchName} "${worktreePath}" HEAD`,
      { cwd: projectPath }
    );
    return { success: true };
  } catch (error: any) {
    // エラーメッセージを解析
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
```

#### ユーザーへのフィードバック

```typescript
// src/renderer/src/components/SidePanel/WorktreeList.tsx

const handleCreateWorktree = async () => {
  setLoading(true);

  try {
    const result = await window.electronAPI.createWorktree(projectId);

    if (result.success) {
      // 成功時の通知
      showToast('Worktreeを作成しました', 'success');
    } else {
      // エラー時の通知
      showToast(result.error || 'Worktreeの作成に失敗しました', 'error');
    }
  } catch (error) {
    showToast('予期しないエラーが発生しました', 'error');
    console.error(error);
  } finally {
    setLoading(false);
  }
};
```

---

### 7. パフォーマンス最適化

#### ターミナル出力のバッファリング

```typescript
// src/main/services/TerminalService.ts

export class TerminalService {
  private outputBuffers: Map<string, string[]> = new Map();
  private flushTimers: Map<string, NodeJS.Timeout> = new Map();

  createTerminal(terminalId: string, worktreePath: string, mainWindow: BrowserWindow): void {
    const ptyProcess = pty.spawn(shell, [], { cwd: worktreePath, ... });

    this.outputBuffers.set(terminalId, []);

    ptyProcess.onData((data) => {
      // バッファに追加
      const buffer = this.outputBuffers.get(terminalId)!;
      buffer.push(data);

      // 既存のタイマーをクリア
      const existingTimer = this.flushTimers.get(terminalId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // 新しいタイマーを設定（16ms ≈ 60fps）
      const timer = setTimeout(() => {
        this.flushBuffer(terminalId, mainWindow);
      }, 16);

      this.flushTimers.set(terminalId, timer);
    });

    this.terminals.set(terminalId, ptyProcess);
  }

  private flushBuffer(terminalId: string, mainWindow: BrowserWindow): void {
    const buffer = this.outputBuffers.get(terminalId);
    if (!buffer || buffer.length === 0) return;

    // バッファの内容を結合して送信
    const data = buffer.join('');
    mainWindow.webContents.send('terminal:data', { terminalId, data });

    // バッファをクリア
    buffer.length = 0;
  }
}
```

---

### 8. セキュリティ

#### コマンドインジェクション対策

```typescript
// ❌ 危険: ユーザー入力をそのままコマンドに含める
await execAsync(`git branch -D ${userInput}`);

// ✅ 安全: 入力を検証してエスケープ
function sanitizeBranchName(name: string): string {
  // 許可された文字のみを許可
  return name.replace(/[^a-zA-Z0-9_-]/g, '');
}

const safeBranchName = sanitizeBranchName(userInput);
await execAsync(`git branch -D "${safeBranchName}"`);
```

#### パス検証

```typescript
function isValidProjectPath(projectPath: string): boolean {
  // パストラバーサル攻撃を防ぐ
  const resolved = path.resolve(projectPath);
  return resolved === projectPath && !projectPath.includes('..');
}
```

---

## 開発Tips

### デバッグ

**メインプロセスのログ**
```typescript
// src/main/index.ts
console.log('[Main]', 'アプリケーション起動');

// または
import log from 'electron-log';
log.info('アプリケーション起動');
```

**レンダラープロセスのDevTools**
```typescript
// src/main/window.ts
mainWindow.webContents.openDevTools();
```

**IPC通信のデバッグ**
```typescript
// メインプロセス
ipcMain.handle('worktree:create', async (event, projectId) => {
  console.log('[IPC] worktree:create called with:', projectId);
  const result = await gitService.createWorktree(projectId);
  console.log('[IPC] worktree:create result:', result);
  return result;
});
```

### ホットリロード

**Viteの設定**
```typescript
// vite.config.ts
export default {
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist/renderer',
  },
};
```

**Electronの開発モード**
```typescript
// src/main/index.ts
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  mainWindow.loadURL('http://localhost:5173');
} else {
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}
```

---

## よくある問題と解決方法

### 問題1: node-ptyが動作しない
- **症状**: `require('node-pty')`でエラー
- **解決**: `electron-rebuild`を実行

### 問題2: gitコマンドが見つからない
- **症状**: `git: command not found`
- **解決**: Gitのパスを環境変数`PATH`に追加

### 問題3: worktreeの作成に失敗する
- **症状**: `fatal: invalid reference: HEAD`
- **原因**: リポジトリに最初のコミットがない
- **解決**: 少なくとも1つのコミットがあることを確認

### 問題4: ターミナルが表示されない
- **症状**: タブは開くが真っ白
- **解決**: xterm.jsのCSSがロードされているか確認
  ```typescript
  import '@xterm/xterm/css/xterm.css';
  ```

### 問題5: Ctrl+Vで画像が送信されない
- **症状**: イベントが発火しない
- **解決**:
  1. Electronのclipboard APIが正しく使われているか確認
  2. preloadスクリプトでAPIが公開されているか確認
  3. レンダラープロセスでイベントリスナーが登録されているか確認

---

## 次のステップ

1. **フェーズ1: プロジェクトセットアップ**を開始
   - Electron + React + Viteのボイラープレート作成
   - 必要なパッケージのインストール

2. **最小限のUIを構築**
   - サイドパネルとメインパネルのレイアウト
   - モックデータで動作確認

3. **Git統合から始める**
   - GitServiceの実装
   - Worktree作成/削除機能

4. **ターミナル統合**
   - node-ptyとxterm.jsの統合
   - Claudeコマンドの自動実行

5. **ファイル添付は最後**
   - 基本機能が動作してから実装
   - Claude Code CLIの仕様を事前に調査

---

## 参考リンク

- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [xterm.js](https://xtermjs.org/)
- [node-pty](https://github.com/microsoft/node-pty)
- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [electron-builder](https://www.electron.build/)
