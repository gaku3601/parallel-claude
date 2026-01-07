# Parallel Claude - クイックスタートガイド

## 開発環境のセットアップ

### 前提条件

以下がインストールされていることを確認してください：

- **Node.js**: v20以上
- **npm**: v10以上
- **Git**: 最新版
- **Claude Code CLI**: インストール済みで`claude`コマンドが使える状態
- **Windows Build Tools**: `npm install --global windows-build-tools`（管理者権限）

### セットアップ手順

```bash
# 1. プロジェクトのディレクトリに移動
cd parallel-claude

# 2. 依存パッケージのインストール
npm install

# 3. Electron用にnode-ptyをリビルド
npx electron-rebuild

# 4. 開発サーバーの起動
npm run dev
```

---

## プロジェクト初期化（最初から作る場合）

### ステップ1: プロジェクトディレクトリの作成

```bash
mkdir parallel-claude
cd parallel-claude
npm init -y
```

### ステップ2: 必要なパッケージのインストール

```bash
# Electron関連
npm install electron electron-builder

# React関連
npm install react react-dom
npm install --save-dev @types/react @types/react-dom

# Vite関連
npm install --save-dev vite @vitejs/plugin-react

# ターミナル関連
npm install node-pty @xterm/xterm @xterm/addon-fit

# TypeScript関連
npm install --save-dev typescript

# ビルドツール
npm install --save-dev electron-rebuild
```

### ステップ3: package.jsonの設定

```json
{
  "name": "parallel-claude",
  "version": "0.1.0",
  "description": "Parallel Claude Code with Git Worktrees",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:vite\" \"npm run dev:electron\"",
    "dev:vite": "vite",
    "dev:electron": "wait-on http://localhost:5173 && electron .",
    "build": "npm run build:vite && npm run build:electron",
    "build:vite": "vite build",
    "build:electron": "tsc -p tsconfig.main.json",
    "package": "electron-builder",
    "postinstall": "electron-rebuild"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "wait-on": "^7.2.0"
  }
}
```

### ステップ4: TypeScript設定

**tsconfig.json** (レンダラープロセス用)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/renderer/**/*"],
  "exclude": ["node_modules"]
}
```

**tsconfig.main.json** (メインプロセス用)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist/main"
  },
  "include": ["src/main/**/*", "src/preload/**/*"],
  "exclude": ["node_modules"]
}
```

### ステップ5: Vite設定

**vite.config.ts**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
});
```

### ステップ6: Electronメインプロセスの基本セットアップ

**src/main/index.ts**
```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

**src/preload/index.ts**
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // ここにAPIを追加していく
  test: () => console.log('Electron API is working!'),
});
```

### ステップ7: Reactアプリの基本セットアップ

**src/renderer/index.html**
```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Parallel Claude</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**src/renderer/src/main.tsx**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**src/renderer/src/App.tsx**
```typescript
import React from 'react';

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Parallel Claude</h1>
      <p>Git Worktree管理ツール</p>
    </div>
  );
}

export default App;
```

**src/renderer/src/index.css**
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #1e1e1e;
  color: #d4d4d4;
}

#root {
  width: 100vw;
  height: 100vh;
}
```

### ステップ8: 動作確認

```bash
# 開発サーバーを起動
npm run dev
```

Electronウィンドウが開き、「Parallel Claude」と表示されれば成功です！

---

## ディレクトリ構成の作成

```bash
# Windows (PowerShell)
mkdir -p src/main/ipc, src/main/services, src/main/utils
mkdir -p src/renderer/src/components/Layout
mkdir -p src/renderer/src/components/SidePanel
mkdir -p src/renderer/src/components/MainPanel
mkdir -p src/renderer/src/components/common
mkdir -p src/renderer/src/hooks
mkdir -p src/renderer/src/context
mkdir -p src/renderer/src/services
mkdir -p src/renderer/src/types
mkdir -p src/preload
mkdir -p assets/icons
```

---

## 最初の機能実装: Git Worktree一覧表示

### 1. GitServiceの作成

**src/main/services/GitService.ts**
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitService {
  async isGitRepository(projectPath: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: projectPath });
      return true;
    } catch {
      return false;
    }
  }

  async listWorktrees(projectPath: string) {
    const { stdout } = await execAsync('git worktree list --porcelain', {
      cwd: projectPath,
    });
    console.log('Git worktrees:', stdout);
    return stdout;
  }
}
```

### 2. IPCハンドラーの追加

**src/main/ipc/git.ts**
```typescript
import { ipcMain } from 'electron';
import { GitService } from '../services/GitService';

const gitService = new GitService();

export function setupGitIPC() {
  ipcMain.handle('git:listWorktrees', async (event, projectPath: string) => {
    return await gitService.listWorktrees(projectPath);
  });
}
```

**src/main/index.ts** (更新)
```typescript
import { setupGitIPC } from './ipc/git';

app.whenReady().then(() => {
  setupGitIPC();
  createWindow();
});
```

### 3. Preloadスクリプトの更新

**src/preload/index.ts**
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  listWorktrees: (projectPath: string) =>
    ipcRenderer.invoke('git:listWorktrees', projectPath),
});
```

### 4. TypeScript型定義

**src/renderer/src/types/electron.d.ts**
```typescript
export interface IElectronAPI {
  listWorktrees: (projectPath: string) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
```

### 5. Reactコンポーネントで使用

**src/renderer/src/App.tsx**
```typescript
import React, { useState } from 'react';

function App() {
  const [worktrees, setWorktrees] = useState<string>('');

  const handleLoadWorktrees = async () => {
    const projectPath = 'C:\\Users\\user\\projects\\my-repo';
    const result = await window.electronAPI.listWorktrees(projectPath);
    setWorktrees(result);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Parallel Claude</h1>
      <button onClick={handleLoadWorktrees}>Worktree一覧を取得</button>
      <pre>{worktrees}</pre>
    </div>
  );
}

export default App;
```

---

## デバッグ方法

### メインプロセスのデバッグ

**VS Code launch.json**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Electron: Main",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "runtimeArgs": [".", "--remote-debugging-port=9223"],
      "outputCapture": "std"
    }
  ]
}
```

### レンダラープロセスのデバッグ

```typescript
// src/main/index.ts
mainWindow.webContents.openDevTools();
```

ブラウザのDevToolsが開き、通常のReactアプリと同様にデバッグできます。

---

## ビルド方法

### 開発ビルド

```bash
npm run build
```

### 本番ビルド（インストーラー作成）

**electron-builder.json**
```json
{
  "appId": "com.yourcompany.parallel-claude",
  "productName": "Parallel Claude",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "package.json"
  ],
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

```bash
npm run package
```

`release`フォルダに`.exe`インストーラーが作成されます。

---

## トラブルシューティング

### Q: `electron-rebuild`でエラーが出る
**A**: Windows Build Toolsをインストールしてください
```bash
npm install --global windows-build-tools
```

### Q: Viteの開発サーバーに接続できない
**A**: ポート5173が使用されているか確認
```bash
netstat -ano | findstr :5173
```

### Q: `node-pty`がrequireできない
**A**: Electronのバージョンとnode-ptyのビルドが一致しているか確認
```bash
npx electron-rebuild -f -w node-pty
```

### Q: Gitコマンドが見つからない
**A**: Gitのパスが環境変数に含まれているか確認
```powershell
$env:PATH
```

---

## 次のステップ

1. **UIレイアウトの構築**
   - サイドパネルとメインパネルの実装
   - CSS Modulesでスタイリング

2. **Git Worktree機能の実装**
   - Worktree作成/削除機能
   - ランダムな都市名生成

3. **ターミナル統合**
   - xterm.jsの統合
   - node-ptyでClaudeコマンド実行

4. **データ永続化**
   - プロジェクト設定の保存/読み込み

詳細は`docs/tasks.md`を参照してください！
