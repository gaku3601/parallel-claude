# Parallel Claude - 技術仕様書

## アーキテクチャ概要

### システム構成図

```
┌─────────────────────────────────────────────────────────┐
│                    Electron App                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐      ┌──────────────────────┐    │
│  │  Main Process    │      │  Renderer Process    │    │
│  │  (Node.js)       │◄────►│  (React + Vite)      │    │
│  │                  │ IPC  │                      │    │
│  │  - Window管理    │      │  - UI Components     │    │
│  │  - Git操作       │      │  - State Management  │    │
│  │  - PTY管理       │      │  - Terminal UI       │    │
│  │  - File System   │      │  (xterm.js)          │    │
│  │  - Settings      │      │                      │    │
│  └──────────────────┘      └──────────────────────┘    │
│         │                            │                  │
│         ▼                            ▼                  │
│  ┌──────────────────┐      ┌──────────────────────┐    │
│  │  node-pty        │      │  React Components    │    │
│  │  (Terminal)      │      │  - SidePanel         │    │
│  │                  │      │  - MainPanel         │    │
│  │  PowerShell/cmd  │      │  - TerminalTab       │    │
│  │  ↓               │      │  - ProjectList       │    │
│  │  claude command  │      │  - WorktreeList      │    │
│  └──────────────────┘      └──────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
                    │                    │
                    ▼                    ▼
         ┌─────────────────┐   ┌─────────────────┐
         │  Git Worktree   │   │  Claude Code    │
         │  (.worktrees/)  │   │  CLI            │
         └─────────────────┘   └─────────────────┘
```

---

## 技術スタック詳細

### フロントエンド
- **Framework**: React 18+
- **Language**: TypeScript 5+
- **Build Tool**: Vite 5+
- **Terminal UI**: xterm.js 5+
  - `@xterm/addon-fit`: ターミナルリサイズ
  - `@xterm/addon-webgl`: パフォーマンス向上（オプション）

### バックエンド（Electronメインプロセス）
- **Runtime**: Node.js 20+
- **Framework**: Electron 28+
- **Terminal Emulation**: node-pty 1.0+
- **Process Management**: child_process (Node.js標準)

### 状態管理
- **Option 1**: React Context API（シンプルなMVPに適している）
- **Option 2**: Zustand（より複雑な状態管理が必要な場合）

### スタイリング
- **Option 1**: CSS Modules（推奨、スコープ分離）
- **Option 2**: Tailwind CSS（迅速な開発）
- **Option 3**: Styled Components

### ビルド・パッケージング
- **electron-builder**: Windows向け.exeインストーラー作成
- **Packaging Format**: NSIS installer (Windows標準)

---

## データモデル

### TypeScript型定義

```typescript
// src/types/index.ts

export interface Project {
  id: string;                 // UUID
  name: string;               // プロジェクト名
  path: string;               // リポジトリのパス
  createdAt: Date;
  worktrees: Worktree[];
}

export interface Worktree {
  id: string;                 // UUID
  projectId: string;          // 親プロジェクトのID
  name: string;               // worktree名（都市名など）
  branch: string;             // ブランチ名
  path: string;               // worktreeのフルパス
  createdAt: Date;
  isActive?: boolean;         // 現在開いているか
}

export interface TerminalTab {
  id: string;                 // UUID
  worktreeId: string;         // 紐づくworktree
  title: string;              // タブのタイトル
  ptyProcess?: any;           // node-ptyのプロセス
  isActive: boolean;
}

export interface AppSettings {
  windowSize: { width: number; height: number };
  windowPosition: { x: number; y: number };
  sidePanelWidth: number;
  theme: 'dark' | 'light';
  terminal: {
    fontSize: number;
    fontFamily: string;
    cursorStyle: 'block' | 'underline' | 'bar';
  };
  git: {
    worktreeBasePath: string; // worktreeを作成するベースパス
    deletebranchOnWorktreeRemove: boolean;
  };
}

export interface AppState {
  projects: Project[];
  openTabs: TerminalTab[];
  activeTabId: string | null;
  settings: AppSettings;
}
```

---

## フォルダ構成

```
parallel-claude/
├── docs/                          # ドキュメント
│   ├── requirements.md
│   ├── tasks.md
│   └── technical-spec.md
├── src/
│   ├── main/                      # Electronメインプロセス
│   │   ├── index.ts               # エントリーポイント
│   │   ├── window.ts              # ウィンドウ管理
│   │   ├── ipc/                   # IPC通信ハンドラー
│   │   │   ├── git.ts             # Git操作
│   │   │   ├── terminal.ts        # PTY管理
│   │   │   └── settings.ts        # 設定管理
│   │   ├── services/
│   │   │   ├── GitService.ts      # Git操作サービス
│   │   │   ├── TerminalService.ts # ターミナルサービス
│   │   │   └── SettingsService.ts # 設定サービス
│   │   └── utils/
│   │       ├── cityNames.ts       # ランダム都市名生成
│   │       └── logger.ts          # ロギング
│   ├── renderer/                  # Reactアプリ
│   │   ├── src/
│   │   │   ├── App.tsx            # ルートコンポーネント
│   │   │   ├── main.tsx           # エントリーポイント
│   │   │   ├── components/
│   │   │   │   ├── Layout/
│   │   │   │   │   ├── Layout.tsx
│   │   │   │   │   └── Layout.module.css
│   │   │   │   ├── SidePanel/
│   │   │   │   │   ├── SidePanel.tsx
│   │   │   │   │   ├── ProjectList.tsx
│   │   │   │   │   ├── WorktreeList.tsx
│   │   │   │   │   └── SidePanel.module.css
│   │   │   │   ├── MainPanel/
│   │   │   │   │   ├── MainPanel.tsx
│   │   │   │   │   ├── TabBar.tsx
│   │   │   │   │   ├── Terminal.tsx
│   │   │   │   │   └── MainPanel.module.css
│   │   │   │   └── common/
│   │   │   │       ├── Button.tsx
│   │   │   │       └── Icon.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useProjects.ts
│   │   │   │   ├── useTerminal.ts
│   │   │   │   └── useClipboard.ts
│   │   │   ├── context/
│   │   │   │   └── AppContext.tsx
│   │   │   ├── services/
│   │   │   │   └── ipc.ts         # IPCクライアント
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   └── utils/
│   │   │       └── helpers.ts
│   │   ├── index.html
│   │   └── vite.config.ts
│   ├── preload/                   # Preloadスクリプト
│   │   └── index.ts               # IPC APIの公開
│   └── types/                     # 共通型定義
│       └── index.ts
├── assets/                        # アセット
│   ├── icons/
│   │   └── app-icon.png
│   └── styles/
│       └── global.css
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.json          # ビルド設定
└── README.md
```

---

## IPC通信設計

### メインプロセス → レンダラープロセス

```typescript
// プロジェクト操作
ipcMain.handle('project:add', async (event, path: string) => { ... })
ipcMain.handle('project:remove', async (event, projectId: string) => { ... })
ipcMain.handle('project:list', async () => { ... })

// Worktree操作
ipcMain.handle('worktree:create', async (event, projectId: string) => { ... })
ipcMain.handle('worktree:remove', async (event, worktreeId: string) => { ... })
ipcMain.handle('worktree:list', async (event, projectId: string) => { ... })

// ターミナル操作
ipcMain.handle('terminal:create', async (event, worktreeId: string) => { ... })
ipcMain.handle('terminal:write', async (event, terminalId: string, data: string) => { ... })
ipcMain.handle('terminal:resize', async (event, terminalId: string, cols: number, rows: number) => { ... })
ipcMain.handle('terminal:kill', async (event, terminalId: string) => { ... })

// ターミナル出力の送信（メイン → レンダラー）
mainWindow.webContents.send('terminal:data', { terminalId, data })

// ファイル添付
ipcMain.handle('clipboard:getImage', async () => { ... })
ipcMain.handle('file:sendToClaude', async (event, terminalId: string, filePath: string) => { ... })

// 設定
ipcMain.handle('settings:get', async () => { ... })
ipcMain.handle('settings:set', async (event, settings: Partial<AppSettings>) => { ... })
```

### Preloadスクリプト

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // プロジェクト
  addProject: (path: string) => ipcRenderer.invoke('project:add', path),
  removeProject: (projectId: string) => ipcRenderer.invoke('project:remove', projectId),
  listProjects: () => ipcRenderer.invoke('project:list'),

  // Worktree
  createWorktree: (projectId: string) => ipcRenderer.invoke('worktree:create', projectId),
  removeWorktree: (worktreeId: string) => ipcRenderer.invoke('worktree:remove', worktreeId),
  listWorktrees: (projectId: string) => ipcRenderer.invoke('worktree:list', projectId),

  // ターミナル
  createTerminal: (worktreeId: string) => ipcRenderer.invoke('terminal:create', worktreeId),
  writeToTerminal: (terminalId: string, data: string) => ipcRenderer.invoke('terminal:write', terminalId, data),
  resizeTerminal: (terminalId: string, cols: number, rows: number) =>
    ipcRenderer.invoke('terminal:resize', terminalId, cols, rows),
  killTerminal: (terminalId: string) => ipcRenderer.invoke('terminal:kill', terminalId),

  // ターミナルデータ受信
  onTerminalData: (callback: (data: { terminalId: string; data: string }) => void) => {
    ipcRenderer.on('terminal:data', (event, data) => callback(data));
  },

  // ファイル
  getClipboardImage: () => ipcRenderer.invoke('clipboard:getImage'),
  sendFileToClaude: (terminalId: string, filePath: string) =>
    ipcRenderer.invoke('file:sendToClaude', terminalId, filePath),

  // 設定
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: any) => ipcRenderer.invoke('settings:set', settings),
});
```

---

## Git操作実装

### GitService.ts

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

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
  async listWorktrees(projectPath: string): Promise<Worktree[]> {
    const { stdout } = await execAsync('git worktree list --porcelain', {
      cwd: projectPath,
    });

    // パース処理
    const worktrees: Worktree[] = [];
    const lines = stdout.split('\n');
    let currentWorktree: any = {};

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        currentWorktree.path = line.replace('worktree ', '');
      } else if (line.startsWith('branch ')) {
        currentWorktree.branch = line.replace('branch ', '').replace('refs/heads/', '');
      } else if (line === '') {
        if (currentWorktree.path) {
          worktrees.push({
            id: generateId(),
            path: currentWorktree.path,
            branch: currentWorktree.branch || 'detached',
            name: path.basename(currentWorktree.path),
            projectId: '', // 後で設定
            createdAt: new Date(),
          });
        }
        currentWorktree = {};
      }
    }

    return worktrees;
  }

  /**
   * Worktreeを作成
   */
  async createWorktree(
    projectPath: string,
    branchName: string,
    worktreePath: string
  ): Promise<void> {
    // ブランチを作成してworktreeを追加
    await execAsync(
      `git worktree add -b ${branchName} "${worktreePath}" HEAD`,
      { cwd: projectPath }
    );
  }

  /**
   * Worktreeを削除
   */
  async removeWorktree(
    projectPath: string,
    worktreePath: string,
    deleteBranch: boolean = false
  ): Promise<void> {
    // Worktreeを削除
    await execAsync(`git worktree remove "${worktreePath}" --force`, {
      cwd: projectPath,
    });

    // ブランチも削除する場合
    if (deleteBranch) {
      const branchName = path.basename(worktreePath);
      try {
        await execAsync(`git branch -D ${branchName}`, { cwd: projectPath });
      } catch (error) {
        console.warn('ブランチ削除に失敗:', error);
      }
    }
  }

  /**
   * ランダムな都市名を生成
   */
  generateWorktreeName(): string {
    const cities = [
      'tokyo', 'paris', 'london', 'newyork', 'berlin',
      'sydney', 'toronto', 'singapore', 'seoul', 'dubai',
      'mumbai', 'stockholm', 'amsterdam', 'barcelona', 'rome',
      'vienna', 'prague', 'oslo', 'copenhagen', 'helsinki'
    ];

    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);

    return `${randomCity}-${timestamp}`;
  }
}
```

---

## ターミナル統合実装

### TerminalService.ts

```typescript
import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';

export class TerminalService {
  private terminals: Map<string, any> = new Map();

  /**
   * 新しいターミナルを作成
   */
  createTerminal(
    terminalId: string,
    worktreePath: string,
    mainWindow: BrowserWindow
  ): void {
    // Windows用のシェル設定
    const shell = process.env.SHELL || 'powershell.exe';

    // PTYプロセスを作成
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: worktreePath,
      env: process.env as any,
    });

    // 出力をレンダラープロセスに送信
    ptyProcess.onData((data) => {
      mainWindow.webContents.send('terminal:data', {
        terminalId,
        data,
      });
    });

    this.terminals.set(terminalId, ptyProcess);

    // claudeコマンドを自動実行
    setTimeout(() => {
      ptyProcess.write('claude\r');
    }, 500);
  }

  /**
   * ターミナルに書き込み
   */
  write(terminalId: string, data: string): void {
    const ptyProcess = this.terminals.get(terminalId);
    if (ptyProcess) {
      ptyProcess.write(data);
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
      ptyProcess.kill();
      this.terminals.delete(terminalId);
    }
  }
}
```

---

## ファイル添付実装

### クリップボード画像処理

```typescript
// src/main/services/ClipboardService.ts
import { clipboard, nativeImage } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export class ClipboardService {
  /**
   * クリップボードから画像を取得して一時ファイルに保存
   */
  async getImageFromClipboard(): Promise<string | null> {
    const image = clipboard.readImage();

    if (image.isEmpty()) {
      return null;
    }

    // 一時ディレクトリに保存
    const tempDir = path.join(os.tmpdir(), 'parallel-claude');
    await fs.mkdir(tempDir, { recursive: true });

    const fileName = `clipboard-${Date.now()}.png`;
    const filePath = path.join(tempDir, fileName);

    // PNG形式で保存
    await fs.writeFile(filePath, image.toPNG());

    return filePath;
  }

  /**
   * Claude CodeにファイルをCtrl+Vで送信
   *
   * 注意: この実装はClaude Code CLIの仕様次第で変更が必要
   */
  async sendFileToClaude(
    terminalService: TerminalService,
    terminalId: string,
    filePath: string
  ): Promise<void> {
    // 方法1: ファイルパスをコピーして通常のCtrl+Vでペースト
    // （Claude Codeがファイルパスを認識する場合）
    terminalService.write(terminalId, filePath + '\r');

    // 方法2: --fileオプションを使う（もしあれば）
    // terminalService.write(terminalId, `--file "${filePath}"\r`);

    // 方法3: 特殊なコマンドシーケンスを送る
    // （要Claude Code CLI調査）
  }
}
```

---

## データ永続化

### SettingsService.ts

```typescript
import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';

export class SettingsService {
  private configPath: string;

  constructor() {
    // Windows: C:\Users\<user>\AppData\Roaming\parallel-claude
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'config.json');
  }

  /**
   * 設定を読み込み
   */
  async load(): Promise<AppState> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      // ファイルが存在しない場合はデフォルト値を返す
      return this.getDefaultState();
    }
  }

  /**
   * 設定を保存
   */
  async save(state: AppState): Promise<void> {
    await fs.writeFile(
      this.configPath,
      JSON.stringify(state, null, 2),
      'utf-8'
    );
  }

  /**
   * デフォルト状態
   */
  private getDefaultState(): AppState {
    return {
      projects: [],
      openTabs: [],
      activeTabId: null,
      settings: {
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
      },
    };
  }
}
```

---

## パフォーマンス最適化

### 1. ターミナル出力のバッファリング
- xterm.jsの`write`メソッドは頻繁に呼ぶとパフォーマンスが低下
- 出力をバッファリングして、一定間隔でまとめて書き込む

### 2. 仮想スクロール
- プロジェクト/Worktree一覧が多い場合は`react-window`などで仮想スクロール

### 3. メモ化
- React.memo、useMemoを適切に使用してre-renderを最小化

---

## セキュリティ考慮事項

### 1. Context Isolation
- Electronの`contextIsolation: true`を有効にする
- preloadスクリプトで安全にAPIを公開

### 2. Node Integration
- レンダラープロセスで`nodeIntegration: false`

### 3. コマンドインジェクション対策
- Git操作時、ユーザー入力を適切にエスケープ
- `child_process.exec`ではなく`spawn`を使うことも検討

---

## 既知の課題と対応策

### 1. Claude Code CLIのファイル送信方法
- **課題**: Claude Code CLIがターミナルセッション中にどのようにファイルを受け付けるか不明
- **対応**:
  - Claude Code CLIのドキュメント/ソースコードを調査
  - `--file`オプションの有無を確認
  - 最悪の場合、ファイルパスをテキストとして送信

### 2. Windows環境でのnode-pty
- **課題**: node-ptyはネイティブモジュールでビルドが必要
- **対応**:
  - `electron-rebuild`を使ってElectron用にリビルド
  - または`prebuildify`でプリビルド版を使用

### 3. Git Worktreeのパス管理
- **課題**: Windowsのパス区切り文字（`\`）とGitの互換性
- **対応**:
  - パスは常に`path.join()`を使用
  - Gitコマンドには`"`で囲んで渡す

---

## テスト戦略

### 単体テスト
- GitService, TerminalService等のロジックをテスト
- Jest使用

### E2Eテスト
- Spectron（非推奨）の代わりにPlaywright for Electronを検討
- 主要なユーザーフローをテスト

### 手動テスト
- 各機能の動作確認チェックリストを作成

---

## デプロイ・配布

### electron-builder設定

```json
{
  "appId": "com.yourcompany.parallel-claude",
  "productName": "Parallel Claude",
  "directories": {
    "output": "dist"
  },
  "win": {
    "target": ["nsis"],
    "icon": "assets/icons/app-icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

### リリースプロセス
1. バージョン番号を更新
2. `npm run build`でビルド
3. `electron-builder`でパッケージング
4. GitHub Releasesで配布
