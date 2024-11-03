import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { Network, Signer, TransactionId, Wormhole } from "@wormhole-foundation/sdk";
import { CircleTransfer, TransferState, amount, wormhole } from "@wormhole-foundation/sdk";
import evm from "@wormhole-foundation/sdk/evm";
import solana from "@wormhole-foundation/sdk/solana";
import { useMemo } from 'react'
import type { SignerStuff } from "../helpers/index";
import { getSolanaSigner } from "../helpers/index";
import * as _evm from "@wormhole-foundation/sdk-evm";
import { BrowserProvider, JsonRpcSigner, Provider } from 'ethers'
import type { Account, Chain, Client, Transport } from 'viem'
import { type Config, useConnectorClient } from 'wagmi'
import { sepolia } from 'wagmi/chains';
import { getApiUrl } from '../helpers/utils';
import styles from '../styles/Home.module.css';

function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  const provider = new BrowserProvider(transport, network)
  const signer = new JsonRpcSigner(provider, account.address)
  return signer
}

/** Hook to convert a viem Wallet Client to an ethers.js Signer. */
function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useConnectorClient<Config>({ chainId })
  console.log(`client address: ${client?.account.address}, ${client?.transport.name}`);
  return useMemo(() => (client ? clientToSigner(client) : undefined), [client])
}

async function getEtherSigner(rpc: Provider, signer: JsonRpcSigner) {
  console.log(rpc);
  return await _evm.getEvmSigner(rpc, signer, {
    debug: true,
    maxGasLimit: amount.units(amount.parse("0.01", 18)),
  });
}

async function cctpTransfer<N extends Network>(
  wh: Wormhole<N>,
  src: SignerStuff<N, any>,
  dst: SignerStuff<N, any>,
  req: {
    amount: bigint;
    automatic: boolean;
    nativeGas?: bigint;
  },
) {
  // EXAMPLE_CCTP_TRANSFER
  const xfer = await wh.circleTransfer(
    // amount as bigint (base units)
    req.amount,
    // sender chain/address
    src.address,
    // receiver chain/address
    dst.address,
    // automatic delivery boolean
    req.automatic,
    // payload to be sent with the transfer
    undefined,
    // If automatic, native gas can be requested to be sent to the receiver
    req.nativeGas,
  );

  // Note, if the transfer is requested to be Automatic, a fee for performing the relay
  // will be present in the quote. The fee comes out of the amount requested to be sent.
  // If the user wants to receive 1.0 on the destination, the amount to send should be 1.0 + fee.
  // The same applies for native gas dropoff
  const quote = await CircleTransfer.quoteTransfer(src.chain, dst.chain, xfer.transfer);
  console.log("Quote", quote);

  console.log("Starting Transfer");
  const srcTxids = await xfer.initiateTransfer(src.signer);
  console.log(`Started Transfer: `, srcTxids);

  // Note: Depending on chain finality, this timeout may need to be increased.
  // See https://developers.circle.com/stablecoin/docs/cctp-technical-reference#mainnet for more
  console.log("Waiting for Attestation");
  const attestIds = await xfer.fetchAttestation(300_000);
  //const attestIds = await xfer.fetchAttestation(quote.eta ?? 1_000_000);
  console.log(`Got Attestation: `, attestIds);

  console.log("Completing Transfer");
  const dstTxids = await xfer.completeTransfer(dst.signer);
  console.log(`Completed Transfer: `, dstTxids);

  console.log("Tracking Transfer Progress");
  let receipt = CircleTransfer.getReceipt(xfer);

  for await (receipt of CircleTransfer.track(wh, receipt)) {
    console.log("Receipt State:", receipt.state);
    if (receipt.state === TransferState.DestinationFinalized) {
      console.log("Transfer Confirmed Complete");
      break;
    }
  }

  // EXAMPLE_CCTP_TRANSFER
}

async function completeTransfer(
  wh: Wormhole<Network>,
  txid: TransactionId,
  signer: Signer,
): Promise<void> {
  // EXAMPLE_RECOVER_TRANSFER
  // Rebuild the transfer from the source txid
  const xfer = await CircleTransfer.from(wh, txid);

  const attestIds = await xfer.fetchAttestation(60 * 60 * 1000);
  console.log("Got attestation: ", attestIds);

  const dstTxIds = await xfer.completeTransfer(signer);
  console.log("Completed transfer: ", dstTxIds);
  // EXAMPLE_RECOVER_TRANSFER
}

async function getProgrammableWalletInfo(sourceAddress: string) {
  // get the associated Programmable Wallet on Solana (create one if needed)
  const getWalletUrl = `${getApiUrl()}/wallet/${sourceAddress}`;
  const response = await fetch(getWalletUrl, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to get associated wallet: ${response.statusText}`);
  }
  const walletData = await response.json();
  const { walletId, address } = walletData;
  if (!walletId || !address) {
    throw new Error('No associated wallet found');
  }
  return { walletId, address };
}

const Home: NextPage = () => {
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [depositBalance, setDepositBalance] = useState<string>('0.00');

  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleOutput([`[${timestamp}] Console initialized`]);
  }, []); // Empty dependency array - only runs on initial render

  const addLine = (message: string) => {
    setConsoleOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const signer = useEthersSigner({ chainId: sepolia.id }); // 11155111

  // Add function to fetch balance
  const fetchBalance = async () => {
    try {
      if (!signer?.address) {
        return;
      }
      const prevBalance = depositBalance;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/balance/${signer?.address}`);
      const data = await response.json();
      const newBalance = data.balance || '0.00';
      if (prevBalance !== newBalance) {
        setDepositBalance(newBalance);
        addLine(`Balance updated: ${newBalance} USDC`);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      addLine('Failed to fetch balance');
    }
  };

  // Add useEffect to fetch balance when signer changes
  useEffect(() => {
    if (signer?.address) {
      fetchBalance();
    } else {
      setDepositBalance('0');
    }
  }, [signer?.address]);

  const handleMaxClick = () => {
    setWithdrawAmount(depositBalance);
  };

  const handleDeposit = async () => {
    const input = document.getElementById('depositAmount') as HTMLInputElement;
    const tokenAmount = input?.value || '0';
    addLine(`Depositing ${tokenAmount} USDC...`);

    // init Wormhole object, passing config for which network
    // to use (e.g. Mainnet/Testnet) and what Platforms to support
    const wh = await wormhole("Testnet", [evm, solana]);

    // Grab chain Contexts
    const sendChain = wh.getChain("Sepolia");
    const rcvChain = wh.getChain("Solana");

    // get Ethereum signer (for now, tested with Brave Wallet)
    const sourceSigner = await getEtherSigner(await sendChain.getRpc(), signer!);
    const source = { chain: sendChain, signer: sourceSigner, address: Wormhole.chainAddress(sendChain.chain, sourceSigner.address()) }

    const {walletId, address} = await getProgrammableWalletInfo(signer!.address);

    // get Solana signer (using Circle Programmable Wallet internally)
    const destination = await getSolanaSigner(rcvChain, signer!.address, walletId, address);

    // 6 decimals for USDC (except for bsc, so check decimals before using this)
    const amt = amount.units(amount.parse(tokenAmount, 6));

    // Choose whether or not to have the attestation delivered for you
    const automatic = false;

    // If the transfer is requested to be automatic, you can also request that
    // during redemption, the receiver gets some amount of native gas transferred to them
    // so that they may pay for subsequent transactions
    // The amount specified here is denominated in the token being transferred (USDC here)
    const nativeGas = automatic ? amount.units(amount.parse("0.0", 6)) : 0n;

    addLine(`Initiated transfer to Solana`);
    await cctpTransfer(wh, source, destination, {
      amount: amt,
      automatic,
      nativeGas,
    });
    addLine(`Completed transfer to Solana`);

    const depositUrl = `${getApiUrl()}/deposit`;
    const depositResponse = await fetch(depositUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        walletId,
        amount: amt.toString(),
      })
    });
    if (!depositResponse.ok) {
      throw new Error(`Failed to execute deposit transaction: ${depositResponse.statusText}`);
    }
    addLine(`Completed deposit to Windfall`);

    const startTime = Date.now();
    const depositAmount = BigInt(amt.toString());
    while (Date.now() - startTime < 15000) { // 15 seconds timeout
      await fetchBalance();
      if (BigInt(depositBalance) >= depositAmount) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second interval
    }
  };

  const handleWithdraw = async () => {
    const input = document.getElementById('withdrawAmount') as HTMLInputElement;
    const tokenAmount = input?.value || '0';
    addLine(`Withdrawing ${tokenAmount} USDC...`);

    // 6 decimals for USDC (except for bsc, so check decimals before using this)
    const amt = amount.units(amount.parse(tokenAmount, 6));

    const {walletId, address} = await getProgrammableWalletInfo(signer!.address);

    const withdrawUrl = `${getApiUrl()}/withdraw`;
    const withdrawResponse = await fetch(withdrawUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        walletId,
        amount: amt.toString(),
      })
    });
    if (!withdrawResponse.ok) {
      throw new Error(`Failed to execute withdraw transaction: ${withdrawResponse.statusText}`);
    }
    addLine(`Completed withdraw from Windfall`);

    // init Wormhole object, passing config for which network
    // to use (e.g. Mainnet/Testnet) and what Platforms to support
    const wh = await wormhole("Testnet", [evm, solana]);

    // Grab chain Contexts
    const sendChain = wh.getChain("Solana");
    const rcvChain = wh.getChain("Sepolia");

    // get Solana signer (using Circle Programmable Wallet internally)
    const source = await getSolanaSigner(sendChain, signer!.address, walletId, address);

    // get Ethereum signer (for now, tested with Brave Wallet)
    const destSigner = await getEtherSigner(await rcvChain.getRpc(), signer!);
    const destination = { chain: rcvChain, signer: destSigner, address: Wormhole.chainAddress(rcvChain.chain, destSigner.address()) }

    // Choose whether or not to have the attestation delivered for you
    const automatic = false;

    // If the transfer is requested to be automatic, you can also request that
    // during redemption, the receiver gets some amount of native gas transferred to them
    // so that they may pay for subsequent transactions
    // The amount specified here is denominated in the token being transferred (USDC here)
    const nativeGas = automatic ? amount.units(amount.parse("0.0", 6)) : 0n;

    addLine(`Initiated transfer to Ethereum`);
    await cctpTransfer(wh, source, destination, {
      amount: amt,
      automatic,
      nativeGas,
    });
    addLine(`Completed transfer to Ethereum`);

    await fetchBalance();
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Windfall Powered by Wormhole</title>
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
            <input
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              id="depositAmount"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            <span>USDC</span>
          </div>
          <button
            className={styles.bridgeButton}
            onClick={handleDeposit}
            disabled={!depositAmount || parseFloat(depositAmount) <= 0}
          >
            Deposit USDC →
          </button>
        </div>

        <div className={styles.bridgeCard}>
          <h2>Withdraw (Solana→Ethereum)</h2>
          <p>Withdraw your USDC from Windfall</p>

          <div className={styles.inputContainer}>
            <input
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              id="withdrawAmount"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
            <div className={styles.balanceInfo}>
              <button
                className={styles.maxButton}
                onClick={handleMaxClick}
                disabled={!depositBalance || parseFloat(depositBalance) <= 0}
              >
                Max
              </button>
              <span>Balance: {depositBalance} USDC</span>
            </div>
          </div>
          <button className={styles.bridgeButton}
            onClick={handleWithdraw}
            disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
          >
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