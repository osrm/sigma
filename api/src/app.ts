import express, { Request, Response } from 'express';
import {
    initiateDeveloperControlledWalletsClient,
    Blockchain
} from '@circle-fin/developer-controlled-wallets'
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.development.local', '.env'] });

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
if (!CIRCLE_API_KEY) {
    throw new Error('CIRCLE_API_KEY is not defined in environment variables');
}

const CIRCLE_ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET;
if (!CIRCLE_ENTITY_SECRET) {
    throw new Error('CIRCLE_ENTITY_SECRET is not defined in environment variables');
}

const CIRCLE_WALLET_SET_ID = process.env.CIRCLE_WALLET_SET_ID;
if (!CIRCLE_WALLET_SET_ID) {
    throw new Error('CIRCLE_WALLET_SET_ID is not defined in environment variables');
}

const BLOCKCHAIN = process.env.BLOCKCHAIN;
if (!BLOCKCHAIN) {
    throw new Error('BLOCKCHAIN is not defined in environment variables');
}

const circleClient = initiateDeveloperControlledWalletsClient({
    apiKey: CIRCLE_API_KEY,
    entitySecret: CIRCLE_ENTITY_SECRET,
});

async function findAssociatedWallet(address: string) {
    const wallets = await circleClient.listWallets({ blockchain: BLOCKCHAIN as Blockchain });
    for (const w of wallets.data?.wallets ?? []) {
        if (w.refId === address) {
            return w;
        }
    }
    return undefined;
}

async function findUnassociatedWallet() {
    const wallets = await circleClient.listWallets({ blockchain: BLOCKCHAIN as Blockchain });
    for (const w of wallets.data?.wallets ?? []) {
        if (!w.refId) {
            return w;
        }
    }
    return undefined;
}

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World');
});

// Search for a wallet associated with the address.
// If not found, associate the address with a new wallet, and return the wallet ID in either case.
app.get('/wallet', async (req: Request, res: Response) => {
    try {
        const { address } = req.query;

        console.log(`GET endpoint /wallet: ${address}`, req.query);
        const wallet = await findAssociatedWallet(address!.toString());
        if (wallet) {
            console.log("wallet found", wallet.id);
            res.json({ "walletId": wallet.id });
        }
        console.log("wallet not found");
        res.json({});

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'Failed to lookup wallet',
            // details: error.message 
        });
    }
});

// Search for a wallet associated with the address.
// If not found, associate the address with a new wallet, and return the wallet ID in either case.
app.post('/wallet', async (req: Request, res: Response) => {
    try {
        const { address } = req.body;

        console.log(`POST endpoint /wallet: ${address}`);
        let wallet = await findAssociatedWallet(address.toString());
        if (wallet) {
            console.log("wallet found", wallet.id);
            res.json({ "walletId": wallet.id });
        } else {
            console.log("wallet not found");
            wallet = await findUnassociatedWallet();
            if (wallet) {
                console.log("gonna associate to wallet", wallet.id);
                await circleClient.updateWallet({ id: wallet.id, name: `SOL wallet for ${address}`, refId: address });
            } else {
                console.log("gonna create a wallet");
                const newWallets = await circleClient.createWallets({
                    idempotencyKey: "",
                    count: 1,
                    accountType: "EOA",
                    blockchains: [BLOCKCHAIN as Blockchain],
                    metadata: [{ "name": `SOL wallet for ${address}`, "refId": address }],
                    walletSetId: CIRCLE_WALLET_SET_ID,
                });
                wallet = newWallets.data?.wallets[0];
            }
        }

        console.log("associated wallet is now", wallet!.id);
        res.json({ "walletId": wallet!.id });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'Failed to associate to wallet',
            // details: error.message 
        });
    }
});


app.post('/sign', async (req: Request, res: Response) => {
    try {
        const { transactionBase64, walletId } = req.body;

        if (!transactionBase64 || !walletId) {
            res.status(400).json({
                error: 'Missing required parameters: transactionBase64 and walletId are required'
            });
            return;
        }

        console.log(`endpoint /sign: ${walletId}, ${transactionBase64}`, req.body);
        res.send('Thank you');

        // const { DeveloperControlledWallets } = require('@circle-fin/developer-controlled-wallets');
        // const { Transaction } = require('@solana/web3.js');

        // // Initialize Circle's Developer Controlled Wallets
        // const dcw = new DeveloperControlledWallets();

        // // Decode base64 transaction
        // const transactionBuffer = Buffer.from(transactionBase64, 'base64');
        // const transaction = Transaction.from(transactionBuffer);

        // // Sign the transaction
        // const signResponse = await dcw.signTransaction({
        //     walletId: walletId,
        //     transaction: transaction
        // });

        // // Return the wallet pubkey and signature
        // res.json({
        //     publicKey: signResponse.publicKey.toString(),
        //     signature: signResponse.signature
        // });

    } catch (error) {
        console.error('Error signing transaction:', error);
        res.status(500).json({
            error: 'Failed to sign transaction',
            // details: error.message 
        });
    }
});


export default app;
