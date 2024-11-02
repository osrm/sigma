# Overview

This project implements a mechanism to deposit USDC directly from chains like Ethereum to Windfall on Solana using the Wormhole TS SDK and Circle CCTP USDC Transfer.

Here's how to use it and the general flow of operations:

- End user connects an EVM-compatible wallet A (like Brave Wallet)
- System creates a Circle Programmable Wallet X on Solana linked to wallet A
- When user deposits:
  - Wallet A signs EVM-side USDC transfer transaction to initiate transfer
  - Wait for Circle Attestation
  - Programmable Wallet X signs Solana-side token receive transaction
  - Programmable Wallet X signs Solana-side Windfall deposit transaction
- When withdrawing:
  - End user connects an EVM-compatible wallet A
  - System looks up Circle Programmable Wallet X on Solana linked to wallet A
  - Programmable Wallet X signs Solana-side Windfall withdraw transaction
  - Programmable Wallet X signs Solana-side USDC transfer transaction
  - Wait for Circle Attestation
  - Wallet A signs EVM-side USDC receive transaction

# Installation

## Solana Program

```shell
anchor keys sync
```

## API Server

Create `api/.env.development.local`:

```shell
CIRCLE_API_KEY = <YOUR_CIRCLE_TESTNET_API_KEY>
CIRCLE_ENTITY_SECRET = <YOUR_CIRCLE_ENTITY_SECRET>
CIRCLE_WALLET_SET_ID = <YOUR_CIRCLE_WALLET_SET_ID>
```

Specify the port in `api/.env` or locally (defaults to 3000), blockchain (SOL or SOL-DEVNET), private key for the account that temporarily covers transaction fees, and RPC endpoint. These settings are for the HTTP API server and are not exposed externally.

```shell
PORT = 3010
BLOCKCHAIN = SOL-DEVNET
SOL_PAYER = [123,56,...,78,90]
RPC_ENDPOINT = <YOUR_RPC_ENDPOINT>
```

## Frontend

Create `frontend/.env` and specify settings like this:

```shell
NEXT_PUBLIC_ENABLE_TESTNETS = true
NEXT_PUBLIC_API_ENDPOINT = http://localhost:3010
```

`NEXT_PUBLIC_API_ENDPOINT` points to the HTTP API server described in the previous section above.
