# Overview

This project implements a mechanism to deposit USDC directly from chains like Ethereum to Windfall on Solana using the Wormhole TS SDK and Circle CCTP USDC Transfer.

Please note that if bridging to Solana is available, tokens other than USDC can be supported, and thanks to Wormhole, a variety of source chains can also be supported for bridging, not limited to EVMs.

Here's how to use the frontend and understand the general flow of operations and inner workings:

- The end user connects to an EVM-compatible wallet *A* (we used Brave Wallet for testing)
- The backend creates a Circle Programmable Wallet *X* on Solana that is linked to wallet *A*
- When a user initiates a deposit operation:
  - Wallet *A* signs an EVM-side USDC transfer transaction to initiate a transfer
  - The system waits for Circle Attestation
  - Programmable Wallet *X* signs a Solana-side token receive transaction
  - Programmable Wallet *X* signs a Solana-side Windfall deposit transaction
- When a user initiates a withdrawal operation:
  - The end user connects their EVM-compatible wallet *A*
  - The backend looks up the Circle Programmable Wallet *X* on Solana that is linked to wallet *A*
  - Programmable Wallet *X* signs a Solana-side Windfall withdraw transaction
  - Programmable Wallet *X* signs a Solana-side USDC transfer transaction
  - The system waits for Circle Attestation
  - Wallet *A* signs an EVM-side USDC receive transaction

# Installation

## Solana Program

```shell
anchor keys sync
anchor build
anchor test
```

As of this writing, the `vault` program is deployed on devnet at `DcnDr4dPpXWHkmS8TSXG3bL9dnshCVRRzQi4gTndtUsG`.

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
TOKEN_MINT = <DEPOSIT_TOKEN_MINT_PUBKEY>
VAULT_TYPE = <VAULT_TYPE_PUBKEY>
```

For devnet, you can use the following settings in `.env` and use the existing vault type which works with devnet USDC:

```shell
TOKEN_MINT = 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
VAULT_TYPE = 2zHQowNu91LJrfaWfpNDMxFXr6DxNYXksYV24UbhBwRX
```

## Frontend

Create `frontend/.env` and specify settings like this:

```shell
NEXT_PUBLIC_ENABLE_TESTNETS = true
NEXT_PUBLIC_API_ENDPOINT = http://localhost:3010
```

`NEXT_PUBLIC_API_ENDPOINT` points to the HTTP API server described in the previous section above.


To start the frontend, first navigate to the `frontend` directory and install the required packages:

```shell
npm install
```
Then run the local HTTP server with the following command:

```shell
npm run dev
```

After that, you can open `http://localhost:3000` in your browser to view the application.

To use the application, you will need ETH and USDC on the Ethereum Sepolia testnet.

To obtain testnet ETH and USDC, you can use the following faucet services (but not limited to them):

- [Alchemy Faucet](https://www.alchemy.com/faucets/ethereum-sepolia)
- [Google Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
- [Circle Faucet](https://faucet.circle.com/)

Additionally, a compatible wallet must be installed in your browser.

This application requires a wallet that can sign transactions without broadcasting them to the network.

During development, we used the Brave Wallet.

We have not verified functionality with other wallets, and MetaMask is *not* supported due to transaction signing failure.

