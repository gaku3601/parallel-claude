import { app, BrowserWindow } from 'electron';
import path from 'path';
import { setupGitIPC } from './ipc/git';
import { setupTerminalIPC } from './ipc/terminal';
import { TerminalService } from './services/TerminalService';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let terminalService: TerminalService | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
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

  // TerminalServiceを初期化
  terminalService = new TerminalService(mainWindow);

  mainWindow.on('closed', () => {
    // すべてのターミナルを終了
    if (terminalService) {
      terminalService.killAll();
      terminalService = null;
    }
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Setup IPC handlers
  setupGitIPC();
  if (terminalService) {
    setupTerminalIPC(terminalService);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
