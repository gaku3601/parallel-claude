import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import styles from './Terminal.module.css';

interface TerminalProps {
  terminalId: string;
  worktreePath: string;
}

const Terminal: React.FC<TerminalProps> = ({ terminalId, worktreePath }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // クリップボード画像の貼り付け処理
  const handleImagePaste = async (blob: Blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const result = await window.electronAPI.saveClipboardImage(arrayBuffer, blob.type);

      if (result.success && result.filePath) {
        await window.electronAPI.sendFileToTerminal(terminalId, result.filePath);
        if (xtermRef.current) {
          xtermRef.current.write(`\r\n[File attached: ${result.filePath}]\r\n`);
        }
      } else {
        throw new Error(result.error || 'ファイル保存に失敗しました');
      }
    } catch (err: any) {
      console.error('Image paste failed:', err);
      if (xtermRef.current) {
        xtermRef.current.write(`\r\n[Error] ${err.message}\r\n`);
      }
    }
  };

  // Ctrl+V 貼り付け処理
  const handlePaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();

      // 画像を優先的に処理
      for (const item of clipboardItems) {
        if (item.types.includes('image/png')) {
          const blob = await item.getType('image/png');
          await handleImagePaste(blob);
          return;
        }
      }

      // テキスト処理
      const text = await navigator.clipboard.readText();
      window.electronAPI.writeToTerminal(terminalId, text);
    } catch (err) {
      console.error('Clipboard read failed:', err);
      // エラーの場合は何もしない（デフォルトの貼り付け動作にフォールバック）
    }
  };

  // ファイル選択ボタンのハンドラ
  const handleFileSelect = async () => {
    const result = await window.electronAPI.selectFile();

    if (result.success && result.filePath) {
      await window.electronAPI.sendFileToTerminal(terminalId, result.filePath);
      if (xtermRef.current) {
        xtermRef.current.write(`\r\n[File attached: ${result.filePath}]\r\n`);
      }
    }
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    console.log(`[Terminal UI] Initializing terminal ${terminalId}`);

    // xtermインスタンスを作成
    const xterm = new XTerm({
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    xterm.open(terminalRef.current);

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // fitを少し遅延させてDOMが完全にレンダリングされるのを待つ
    setTimeout(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    }, 0);

    // Ctrl+V キーボードイベントハンドリング
    xterm.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'v' && event.type === 'keydown') {
        event.preventDefault();
        handlePaste();
        return false;
      }
      return true;
    });

    // ユーザー入力をnode-ptyに送信
    xterm.onData((data) => {
      window.electronAPI.writeToTerminal(terminalId, data);
    });

    // node-ptyからの出力を受信
    const handleTerminalData = ({ terminalId: id, data }: { terminalId: string; data: string }) => {
      if (id === terminalId && xtermRef.current) {
        xtermRef.current.write(data);
      }
    };

    const handleTerminalExit = ({ terminalId: id, exitCode }: { terminalId: string; exitCode: number }) => {
      if (id === terminalId && xtermRef.current) {
        xtermRef.current.write(`\r\n\r\n[Process exited with code ${exitCode}]\r\n`);
      }
    };

    window.electronAPI.onTerminalData(handleTerminalData);
    window.electronAPI.onTerminalExit(handleTerminalExit);

    // リサイズイベント
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = xtermRef.current;
        window.electronAPI.resizeTerminal(terminalId, cols, rows);
      }
    };

    window.addEventListener('resize', handleResize);

    // ターミナルを作成
    window.electronAPI
      .createTerminal(terminalId, worktreePath)
      .then((result) => {
        if (!result.success) {
          console.error('Failed to create terminal:', result.error);
          if (xtermRef.current) {
            xtermRef.current.write(
              `\r\n[Error] Failed to create terminal: ${result.error}\r\n`
            );
          }
        } else {
          console.log(`[Terminal UI] Terminal ${terminalId} created successfully`);
        }
      })
      .catch((error) => {
        console.error('Error creating terminal:', error);
      });

    // クリーンアップ
    return () => {
      console.log(`[Terminal UI] Cleaning up terminal ${terminalId}`);
      window.removeEventListener('resize', handleResize);
      window.electronAPI.killTerminal(terminalId);
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, [terminalId, worktreePath]);

  return (
    <div className={styles.terminalWrapper}>
      <div ref={terminalRef} className={styles.terminal} />
      <div className={styles.toolbar}>
        <button
          className={styles.fileButton}
          onClick={handleFileSelect}
          title="ファイルを選択して添付"
        >
          📎 ファイル添付
        </button>
      </div>
    </div>
  );
};

export default Terminal;
