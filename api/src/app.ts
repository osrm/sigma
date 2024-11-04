import express, { Request, Response } from 'express';
import { initiateDeveloperControlledWalletsClient, Blockchain } from '@circle-fin/developer-controlled-wallets'
import { Commitment, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import idl from "./vault.json";
import { Vault } from "./vault";
// Using `idl` directly causes type mismatch errors when creating Program object, but these can be safely ignored.
// Using `idl_object` avoids these type mismatch errors.
const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);

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

const SOL_PAYER = process.env.SOL_PAYER;
if (!SOL_PAYER) {
    throw new Error('SOL_PAYER is not defined in environment variables');
}

const payerKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(SOL_PAYER)));

const circleClient = initiateDeveloperControlledWalletsClient({
    apiKey: CIRCLE_API_KEY,
    entitySecret: CIRCLE_ENTITY_SECRET,
});

const cors = require('cors');

// TODO
// For scalability, EVM-to-Solana wallet associations should be managed by a backend KV store rather than Programmable Wallet's `refId` attribute.

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

function getConnection() {
    return new Connection(process.env.RPC_ENDPOINT || 'http://localhost:8899')
}

function getVaultType() {
    return new PublicKey(process.env.VAULT_TYPE!);
}

function getMint() {
    return new PublicKey(process.env.TOKEN_MINT!);
}

async function latestBlock(
    rpc: Connection,
    commitment?: Commitment,
): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    return rpc.getLatestBlockhash(commitment ?? rpc.commitment);
}

const app = express();
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'PUT', 'POST'],
    allowedHeaders: ['Content-Type', 'Accept']
}));

// Search for a wallet associated with the source address.
// If not found, associate the address with a new wallet, and return the wallet ID in either case.
app.get('/wallet/:address', async (req: Request, res: Response) => {
    try {
        const address = req.params.address;

        console.log(`GET /wallet/${address}`);

        const wallet = await findAssociatedWallet(address!.toString());
        if (wallet) {
            console.log("associated wallet found:", wallet.id);
            res.json({ walletId: wallet.id, address: wallet.address });
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

function setupProgram() {
    const connection = getConnection();
    const anchorWallet = new Wallet(payerKeypair);
    const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
    anchor.setProvider(provider);

    const program = new Program<Vault>(idl_object, provider);

    return { connection, anchorWallet, provider, program };
}

// Get user's deposit amount with Windfall by looking up source address
app.get('/balance/:address', async (req: Request, res: Response) => {
    try {
        const address = req.params.address;

        console.log(`GET /balance/${address}`);
        const wallet = await findAssociatedWallet(address!.toString());
        if (wallet) {
            const walletPubkey = new PublicKey(wallet.address);
            const vaultType = getVaultType();

            const { program } = setupProgram();

            const [vault, _] = PublicKey.findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode('vault'),
                    vaultType.toBuffer(),
                    walletPubkey.toBuffer(),
                ],
                program.programId
            );
            try {
                const vaultAccount = await program.account.vault.fetch(vault);
                res.json({ balance: vaultAccount.amount.toNumber() / 1_000_000.0 });
                return;
            } catch (error) {
            }
        }
        res.json({ balance: 0 });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'Failed to get deposit balance',
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
            res.json({ walletId: wallet.id, address: wallet.address });
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
        res.json({ walletId: wallet!.id, address: wallet!.address });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'Failed to associate to wallet',
        });
    }
});

// Fund a Programmable Wallet
app.post('/fund', async (req: Request, res: Response) => {
    try {
        const { walletId } = req.body;

        console.log(`POST /fund/${walletId}`);

        const walletResponse = await circleClient.getWallet({ id: walletId });

        const address = walletResponse.data?.wallet.address!;

        // had trouble with feePayer upon executing a tx with PW
        // workaround: xfer 0.1 SOL to fund this PW if it is unfunded
        const connection = getConnection();
        const balance = await connection.getBalance(new PublicKey(address));
        if (balance === 0) {
            console.log(`Funding ${address} with 0.1 SOL`);
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: payerKeypair.publicKey,
                    toPubkey: new PublicKey(address),
                    lamports: LAMPORTS_PER_SOL / 10, // 0.1 SOL
                })
            );
            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [payerKeypair]
            );
            console.log(`Funded PW with tx: ${signature}`);
        }
        res.status(200).json({});
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

        console.log(`POST /sign - walletId ${walletId}, tx ${transactionBase64.substring(0, 20)}...`);

        if (!transactionBase64 || !walletId) {
            res.status(400).json({
                error: 'Missing required parameters: transactionBase64 and walletId are required'
            });
            return;
        }

        const wallet = await circleClient.getWallet({ id: walletId });

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

async function executeTransaction(transaction: Transaction, walletId: string, description: string) {
    const connection = getConnection();

    let { blockhash, lastValidBlockHeight } = await latestBlock(connection);
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = payerKeypair.publicKey;

    transaction.partialSign(payerKeypair);

    const rawTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
    });

    const signResponse = await circleClient.signTransaction({
        walletId,
        rawTransaction: rawTransaction.toString('base64'),
        memo: description,
    });
    const rawTransactionBuf = Buffer.from(
        signResponse.data?.signedTransaction!,
        "base64"
    );
    return await connection.sendRawTransaction(rawTransactionBuf);
}

app.post('/deposit', async (req: Request, res: Response) => {
    try {
        const { walletId, amount } = req.body;

        console.log(`POST /deposit - walletId ${walletId}, amount ${amount}`);

        if (!walletId || !amount) {
            res.status(400).json({
                error: 'Missing required parameters: amount and walletId are required'
            });
            return;
        }

        const wallet = (await circleClient.getWallet({ id: walletId })).data?.wallet!
        const walletPubkey = new PublicKey(wallet.address);
        const vaultType = getVaultType();

        const { provider, program } = setupProgram();

        const [vault, _] = PublicKey.findProgramAddressSync(
            [
                anchor.utils.bytes.utf8.encode('vault'),
                vaultType.toBuffer(),
                walletPubkey.toBuffer(),
            ],
            program.programId
        );

        const vaultTypeAccount = await program.account.vaultType.fetch(vaultType);

        const transaction = new Transaction();
        try {
            await program.account.vault.fetch(vault);
        } catch (error) {
            // create vault if necessary
            const newVaultIx = await program.methods.newVault(
            )
                .accounts({
                    // @ts-ignore
                    vault,
                    vaultType,
                    owner: walletPubkey,
                    payer: payerKeypair.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .instruction();

            transaction.add(newVaultIx);
        }

        const userTokenAccount = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            payerKeypair,
            getMint(),
            walletPubkey,
        );

        // deposit to vault
        const depositIx = await program.methods.deposit(
            new anchor.BN(amount),
        )
            .accounts({
                vault,
                // @ts-ignore
                vaultType,
                owner: walletPubkey,
                payer: payerKeypair.publicKey,
                pool: vaultTypeAccount.pool,
                from: userTokenAccount.address,
                systemProgram: anchor.web3.SystemProgram.programId,
                tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            })
            .instruction();

        transaction.add(depositIx);

        const depositTxSig = await executeTransaction(transaction, walletId, `Deposit by ${wallet.refId?.substring(0, 10)}`);

        res.json({
            signature: depositTxSig,
        });
    } catch (error) {
        console.error('Error deposit transaction:', error);
        res.status(500).json({
            error: 'Failed to sign transaction',
        });
    }
});

app.post('/withdraw', async (req: Request, res: Response) => {
    try {
        const { walletId, amount } = req.body;

        console.log(`POST /withdraw - walletId ${walletId}, amount ${amount}`);

        if (!walletId || !amount) {
            res.status(400).json({
                error: 'Missing required parameters: amount and walletId are required'
            });
            return;
        }

        const wallet = (await circleClient.getWallet({ id: walletId })).data?.wallet!
        const walletPubkey = new PublicKey(wallet.address);
        const vaultType = getVaultType();

        const { provider, program } = setupProgram();

        const [vault, _] = PublicKey.findProgramAddressSync(
            [
                anchor.utils.bytes.utf8.encode('vault'),
                vaultType.toBuffer(),
                walletPubkey.toBuffer(),
            ],
            program.programId
        );

        const vaultTypeAccount = await program.account.vaultType.fetch(vaultType);

        const transaction = new Transaction();
        const vaultAccount = await program.account.vault.fetch(vault);

        const userTokenAccount = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            payerKeypair,
            getMint(),
            walletPubkey,
        );

        if (vaultAccount.status.active) {
            // deactivate the vault
            const deactivateIx = await program.methods.deactivate(
            )
                .accounts({
                    vault,
                    // @ts-ignore
                    vaultType,
                    owner: walletPubkey,
                    payer: payerKeypair.publicKey,
                })
                .instruction();

            transaction.add(deactivateIx);
        }

        const amountBn = new anchor.BN(amount);

        // withdraw from vault
        const withdrawIx = await program.methods.withdraw(
            amountBn,
        )
            .accounts({
                vault,
                // @ts-ignore
                vaultType,
                owner: walletPubkey,
                payer: payerKeypair.publicKey,
                pool: vaultTypeAccount.pool,
                to: userTokenAccount.address,
                systemProgram: anchor.web3.SystemProgram.programId,
                tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            })
            .instruction();

        transaction.add(withdrawIx);
        
        if (amountBn.eq(vaultAccount.amount)) {
            // close the vault if it will be empty
            const closeVaultIx = await program.methods.closeVault(
            )
                .accounts({
                    vault,
                    // @ts-ignore Object literal may only specify known properties, ...
                    vaultType,
                    owner: walletPubkey,
                    payer: payerKeypair.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .instruction();

            transaction.add(closeVaultIx);
        }

        const withdrawTxSig = await executeTransaction(transaction, walletId, `Withdraw by ${wallet.refId?.substring(0, 10)}`);

        res.json({
            signature: withdrawTxSig,
        });
    } catch (error) {
        console.error('Error withdraw transaction:', error);
        res.status(500).json({
            error: 'Failed to sign transaction',
        });
    }
});

export default app;
