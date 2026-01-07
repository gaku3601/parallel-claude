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
    <div className={styles.terminal}>
      <div ref={terminalRef} className={styles.terminalContainer} />
    </div>
  );
};

export default Terminal;
