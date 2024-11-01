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

const BLOCKCHAIN = process.env.BLOCKCHAIN;
if (!BLOCKCHAIN) {
    throw new Error('BLOCKCHAIN is not defined in environment variables');
}

const circleClient = initiateDeveloperControlledWalletsClient({
    apiKey: CIRCLE_API_KEY,
    entitySecret: CIRCLE_ENTITY_SECRET,
});

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.get('/wallet', async (req: Request, res: Response) => {
    try {
        const { address } = req.query;

        const wallets = await circleClient.listWallets({ blockchain: BLOCKCHAIN as Blockchain });
        //console.log('wallets', wallets);
        // console.log('wallets', wallets.data?.wallets);

        for (const w of wallets.data?.wallets ?? []) {
            //console.log("wallet", w);
            if (!w.refId || w.refId === address) {
                console.log("wallet found", w);
                if (!w.refId) {
                    console.log(`associating ${address} with ${w.id}`);
                }
            }
        }

        // wallets.data?.wallets.forEach(wallet => {
        //     console.log('wallet:', wallet);
        // });

        // for (const w in wallets.data?.wallets) {
        //     console.log('wallet', w.id);
        // }

        // if (!transactionBase64 || !walletId) {
        //     return res.status(400).json({ 
        //         error: 'Missing required parameters: transactionBase64 and walletId are required' 
        //     });
        // }

        console.log(`endpoint /wallet: ${address}`, req.query);
        res.send('Thank you 2');

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
