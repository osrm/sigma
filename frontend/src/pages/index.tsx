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
  // const attestIds = await xfer.fetchAttestation(300_000);
  const attestIds = await xfer.fetchAttestation(quote.eta ?? 1_000_000);
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

const Home: NextPage = () => {
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');

  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleOutput([`[${timestamp}] Console initialized`]);
  }, []); // Empty dependency array - only runs on initial render

  const addLine = (message: string) => {
    setConsoleOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const signer = useEthersSigner({ chainId: sepolia.id }); // 11155111

  const handleDeposit = async () => {
    const input = document.getElementById('depositAmount') as HTMLInputElement;
    const tokenAmount = input?.value || '0';
    addLine(`Deposit amount: ${tokenAmount} USDC`);

    // init Wormhole object, passing config for which network
    // to use (e.g. Mainnet/Testnet) and what Platforms to support
    const wh = await wormhole("Testnet", [evm, solana]);

    // Grab chain Contexts
    const sendChain = wh.getChain("Sepolia");
    const rcvChain = wh.getChain("Solana");

    // get Ethereum signer (for now, tested with Brave Wallet)
    const sourceSigner = await getEtherSigner(await sendChain.getRpc(), signer!);
    const source = { chain: sendChain, signer: sourceSigner, address: Wormhole.chainAddress(sendChain.chain, sourceSigner.address()) }

    // get Solana signer (using Circle Programmable Wallet internally)
    const destination = await getSolanaSigner(rcvChain, signer!.address);

    // 6 decimals for USDC (except for bsc, so check decimals before using this)
    const amt = amount.units(amount.parse(tokenAmount, 6));

    // Choose whether or not to have the attestation delivered for you
    const automatic = false;

    // If the transfer is requested to be automatic, you can also request that
    // during redemption, the receiver gets some amount of native gas transferred to them
    // so that they may pay for subsequent transactions
    // The amount specified here is denominated in the token being transferred (USDC here)
    const nativeGas = automatic ? amount.units(amount.parse("0.0", 6)) : 0n;

    await cctpTransfer(wh, source, destination, {
      amount: amt,
      automatic,
      nativeGas,
    });
  };

  const handleWithdraw = async () => {
    const input = document.getElementById('withdrawAmount') as HTMLInputElement;
    const tokenAmount = input?.value || '0';
    addLine(`Withdraw amount: ${tokenAmount} USDC`);

    const val = process.env.NEXT_PUBLIC_API_ENDPOINT;
    console.log(`API endpoint: ${val}`);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Windfall for EVM</title>
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
            <span>USDC</span>
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