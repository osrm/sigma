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

function trimName(name: string) {
    // wallet name must be shorter than 50 characters.
    return name.substring(0, 32) + "...";
}

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World');
});

// Search for a wallet associated with the address.
// If not found, associate the address with a new wallet, and return the wallet ID in either case.
app.get('/wallet/:address', async (req: Request, res: Response) => {
    try {
        const address = req.params.address;

        console.log(`GET /wallet/${address}`);

        const wallet = await findAssociatedWallet(address!.toString());
        if (wallet) {
            console.log("associated wallet found:", wallet.id);
            res.json({ walletId: wallet.id });
            return;
        }
        console.log(`associated wallet not found for ${address}`);
        res.json({});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'Failed to lookup wallet',
        });
    }
});

// Search for a wallet associated with the address.
// If not found:
// - find an unassociated wallet, or
// - create a new wallet.
// In either case, return the associated wallet ID.
app.put('/wallet/:address', async (req: Request, res: Response) => {
    try {
        const address = req.params.address;

        console.log(`PUT /wallet/${address}`);

        let wallet = await findAssociatedWallet(address.toString());
        if (wallet) {
            console.log("associated wallet found:", wallet.id);
            res.json({ walletId: wallet.id });
            return;
        } else {
            console.log(`associated wallet not found for ${address}`);
            wallet = await findUnassociatedWallet();
            if (wallet) {
                console.log("associating with unassociated wallet:", wallet.id);
                await circleClient.updateWallet({ id: wallet.id, name: trimName(`SOL wallet for ${address}`), refId: address });
            } else {
                console.log(`creating a new wallet for $${address}`);
                const newWallets = await circleClient.createWallets({
                    idempotencyKey: crypto.randomUUID(),
                    count: 1,
                    accountType: "EOA",
                    blockchains: [BLOCKCHAIN as Blockchain],
                    metadata: [{ name: trimName(`SOL wallet for ${address}`), refId: address }],
                    walletSetId: CIRCLE_WALLET_SET_ID,
                });
                wallet = newWallets.data?.wallets[0];
            }
        }

        console.log("associated wallet is now:", wallet!.id);
        res.json({ walletId: wallet!.id });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'Failed to associate to wallet',
        });
    }
});

app.post('/sign', async (req: Request, res: Response) => {
    try {
        const { transactionBase64, walletId, description } = req.body;

        console.log(`POST /sign`);

        if (!transactionBase64 || !walletId) {
            res.status(400).json({
                error: 'Missing required parameters: transactionBase64 and walletId are required'
            });
            return;
        }

        const wallet = await circleClient.getWallet({id: walletId});

        const result = await circleClient.signTransaction({
            walletId,
            rawTransaction: transactionBase64,
            memo: description,
        });

        res.json({
            pubkey: wallet.data?.wallet.address,
            signature: result.data?.signature,
            transaction: result.data?.signedTransaction,
        });
    } catch (error) {
        console.error('Error signing transaction:', error);
        res.status(500).json({
            error: 'Failed to sign transaction',
        });
    }
});

export default app;
