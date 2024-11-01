import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

const Home: NextPage = () => {
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleOutput([`[${timestamp}] Console initialized`]);
  }, []); // 空の依存配列で初回レンダリング時のみ実行

  return (
    <div className={styles.container}>
      <Head>
        <title>USDC Bridge</title>
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <div className={styles.header}>
        <ConnectButton />
      </div>

      <main className={styles.main}>
        <div className={styles.bridgeCard}>
          <h2>Deposit (Ethereum→Solana)</h2>
          <p>Deposit your USDC to Windfall</p>
          <div className={styles.inputContainer}>
            <input type="number" placeholder="0.00" min="0" step="0.01" id="depositAmount" />
            <span>USDC</span>
          </div>
          <button 
            className={styles.bridgeButton}
            onClick={() => {
              const input = document.getElementById('depositAmount') as HTMLInputElement;
              const amount = input?.value || '0';
              setConsoleOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Deposit amount: ${amount} USDC`]);
            }}
          >
            Deposit USDC →
          </button>
        </div>

        <div className={styles.bridgeCard}>
          <h2>Withdraw (Solana→Ethereum)</h2>
          <p>Withdraw your USDC from Windfall</p>
          <div className={styles.inputContainer}>
            <input type="number" placeholder="0.00" min="0" step="0.01" id="withdrawAmount" />
            <span>USDC</span>
          </div>
          <button className={styles.bridgeButton}
          onClick={() => {
            const input = document.getElementById('withdrawAmount') as HTMLInputElement;
            const amount = input?.value || '0';
            setConsoleOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Withdraw amount: ${amount} USDC`]);
          }}>
            ← Withdraw USDC
          </button>
        </div>
      </main>

      <div className={styles.console}>
        <h3>Console Output</h3>
        <div className={styles.consoleContent}>
          {consoleOutput.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;