// copied and modified based on @wormhole-sdk-ts/platforms/solana/src/signer.ts
import {
    ComputeBudgetProgram,
    Connection,
    Keypair,
    SendOptions,
    SendTransactionError,
    Transaction,
    TransactionExpiredBlockheightExceededError,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
    PublicKey,
    AddressLookupTableAccount,
    Commitment,
    RpcResponseAndContext,
    SignatureResult,
} from '@solana/web3.js';
import type {
    Network,
    SignAndSendSigner,
    SignOnlySigner,
    Signer,
    SignedTx,
    UnsignedTransaction,
} from '@wormhole-foundation/sdk-connect';
import { encoding, nativeChainIds, PlatformToChains } from '@wormhole-foundation/sdk-connect';
import { getApiUrl } from './utils';

const DEFAULT_PRIORITY_FEE_PERCENTILE = 0.5;
const DEFAULT_PERCENTILE_MULTIPLE = 1;
const DEFAULT_MIN_PRIORITY_FEE = 1;
const DEFAULT_MAX_PRIORITY_FEE = 1e9;

const DEFAULT_MAX_RESUBMITS = 5;
const DEFAULT_COMPUTE_BUDGET = 250_000;

const _platform: 'Solana' = 'Solana';
type SolanaPlatformType = typeof _platform;
type SolanaChains = PlatformToChains<SolanaPlatformType>;

async function latestBlock(
    rpc: Connection,
    commitment?: Commitment,
): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    return rpc.getLatestBlockhash(commitment ?? rpc.commitment);
}

type SolanaTransaction = {
    transaction: Transaction | VersionedTransaction;
    signers?: Keypair[];
};

class SolanaUnsignedTransaction<
    N extends Network,
    C extends SolanaChains = SolanaChains,
> implements UnsignedTransaction {
    constructor(
        readonly transaction: SolanaTransaction,
        readonly network: N,
        readonly chain: C,
        readonly description: string,
        readonly parallelizable: boolean = false,
    ) { }
}

function isVersionedTransaction(tx: any): tx is VersionedTransaction {
    return (
        (<VersionedTransaction>tx).signatures !== undefined &&
        (<VersionedTransaction>tx).message !== undefined
    );
}

async function sendTxWithRetry(
    rpc: Connection,
    tx: SignedTx,
    sendOpts: SendOptions = {},
    retryInterval = 5000,
): Promise<{
    signature: string;
    response: RpcResponseAndContext<SignatureResult>;
}> {
    const commitment = sendOpts.preflightCommitment ?? rpc.commitment;
    const signature = await rpc.sendRawTransaction(tx, {
        ...sendOpts,
        skipPreflight: false, // The first send should not skip preflight to catch any errors
        maxRetries: 0,
        preflightCommitment: commitment,
    });
    // TODO: Use the lastValidBlockHeight that corresponds to the blockhash used in the transaction.
    const { blockhash, lastValidBlockHeight } = await rpc.getLatestBlockhash();
    const confirmTransactionPromise = rpc.confirmTransaction(
        {
            signature,
            blockhash,
            lastValidBlockHeight,
        },
        commitment,
    );
    // This loop will break once the transaction has been confirmed or the block height is exceeded.
    // An exception will be thrown if the block height is exceeded by the confirmTransactionPromise.
    // The transaction will be resent if it hasn't been confirmed after the interval.
    let confirmedTx: RpcResponseAndContext<SignatureResult> | null = null;
    while (!confirmedTx) {
        confirmedTx = await Promise.race([
            confirmTransactionPromise,
            new Promise<null>((resolve) =>
                setTimeout(() => {
                    resolve(null);
                }, retryInterval),
            ),
        ]);
        if (confirmedTx) {
            break;
        }
        await rpc.sendRawTransaction(tx, {
            ...sendOpts,
            skipPreflight: true,
            maxRetries: 0,
            preflightCommitment: commitment,
        });
    }
    return { signature, response: confirmedTx };
}

/** Options for setting the priority fee for a transaction */
export type PriorityFeeOptions = {
    /** The percentile of recent fees to use as a base fee */
    percentile?: number;
    /** The multiple to apply to the percentile base fee  */
    percentileMultiple?: number;
    /** The minimum priority fee to use */
    min?: number;
    /** The maximum priority fee to use */
    max?: number;
};

/** Recommended priority fee options */
export const DefaultPriorityFeeOptions: PriorityFeeOptions = {
    percentile: DEFAULT_PRIORITY_FEE_PERCENTILE,
    percentileMultiple: DEFAULT_PERCENTILE_MULTIPLE,
    min: DEFAULT_MIN_PRIORITY_FEE,
    max: DEFAULT_MAX_PRIORITY_FEE,
};

function chainFromChainId(genesisHash: string): [Network, SolanaChains] {
    const netChain = nativeChainIds.platformNativeChainIdToNetworkChain(
        'Solana',
        genesisHash,
    );

    if (!netChain)
        throw new Error(
            `No matching genesis hash to determine network and chain: ${genesisHash}`,
        );

    const [network, chain] = netChain;
    return [network, chain];
}

async function chainFromRpc(rpc: Connection): Promise<[Network, SolanaChains]> {
    try {
        const gh = await rpc.getGenesisHash();
        return chainFromChainId(gh);
    } catch (e) {
        // Override for devnet which will often have a new Genesis hash
        if (
            rpc.rpcEndpoint.includes('http://127') ||
            rpc.rpcEndpoint.includes('http://localhost') ||
            rpc.rpcEndpoint === 'http://solana-devnet:8899'
        ) {
            return ['Devnet', 'Solana'];
        }
        throw e;
    }
}

/** Options for the SolanaSendSigner  */
export type SolanaSendSignerOptions = {
    /** log details of transaction attempts  */
    debug?: boolean;
    /** determine compute budget and priority fees to land a transaction */
    priorityFee?: PriorityFeeOptions;
    /** any send options from solana/web3.js */
    sendOpts?: SendOptions;
    /** how many times to attempt resubmitting the transaction to the network with a new blockhash */
    retries?: number;
};

// returns a SignOnlySigner for the Solana platform
export async function getSolanaSigner(
    rpc: Connection,
    privateKey: string,
): Promise<Signer> {
    const [_, chain] = await chainFromRpc(rpc);
    return new SolanaSigner(
        chain,
        Keypair.fromSecretKey(encoding.b58.decode(privateKey)),
        rpc,
    );
}

// returns a SignAndSendSigner for the Solana platform
export async function getSolanaSignAndSendSigner(
    rpc: Connection,
    //privateKey: string | Keypair,
    sourceAddress: string,
    walletId: string,
    address: string,
    opts?: SolanaSendSignerOptions,
): Promise<Signer> {
    const [_, chain] = await chainFromRpc(rpc);

    if (opts?.priorityFee) {
        if (opts.priorityFee.percentile && opts.priorityFee.percentile > 1.0)
            throw new Error('priorityFeePercentile must be a number between 0 and 1');
        // TODO: other validation
    }   

    return new SolanaSendSigner(
        rpc,
        chain,
        walletId,
        address,
        sourceAddress,
        opts?.debug ?? false,
        opts?.priorityFee ?? {},
        opts?.retries ?? DEFAULT_MAX_RESUBMITS,
        opts?.sendOpts,
    );
}

export class SolanaSendSigner<
    N extends Network,
    C extends SolanaChains = 'Solana',
> implements SignAndSendSigner<N, C> {
    constructor(
        private _rpc: Connection,
        private _chain: C,
        private _walletId: string,
        private _address: string,
        private _sourceAddress: string,
        private _debug: boolean = false,
        private _priorityFee: PriorityFeeOptions,
        private _maxResubmits: number = DEFAULT_MAX_RESUBMITS,
        private _sendOpts?: SendOptions,
    ) {
        this._sendOpts = this._sendOpts ?? {
            preflightCommitment: this._rpc.commitment,
        };
        console.log(`_rpc: ${_rpc.rpcEndpoint}, _chain: ${_chain}, _walletId: ${_walletId}, _address: ${_address}, _sourceAddress: ${_sourceAddress}`);
    }

    chain(): C {
        return this._chain;
    }

    address(): string {
        return this._address;
    }

    // Handles retrying a Transaction if the error is deemed to be
    // recoverable. Currently handles:
    // - Transaction expired
    // - Blockhash not found
    // - Not enough bytes (storage account not seen yet)
    private retryable(e: any): boolean {
        // Tx expired, set a new block hash and retry
        if (e instanceof TransactionExpiredBlockheightExceededError) return true;

        // Besides tx expiry, only handle SendTransactionError
        if (!(e instanceof SendTransactionError)) return false;

        // Only handle simulation errors
        if (!e.message.includes('Transaction simulation failed')) return false;

        // Blockhash not found, similar to expired, resend with new blockhash
        if (e.message.includes('Blockhash not found')) return true;

        // Find the log message with the error details
        const loggedErr = e.logs?.find((log) =>
            log.startsWith('Program log: Error: '),
        );

        // who knows
        if (!loggedErr) return false;

        // Probably caused by storage account not seen yet
        if (loggedErr.includes('Not enough bytes')) return true;
        if (loggedErr.includes('Unexpected length of input')) return true;

        return false;
    }

    async signAndSend(tx: UnsignedTransaction[]): Promise<any[]> {
        let { blockhash, lastValidBlockHeight } = await latestBlock(
            this._rpc,
        );

        // fund the PW as a temporary workaround
        // this may better be moved outside to index.tsx,
        // but just wanted to fund right before executing an actual tx
        const fundUrl = `${getApiUrl()}/fund`;
        const fundResponse = await fetch(fundUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                walletId: this._walletId,
            })
        });
        if (!fundResponse.ok) {
            throw new Error(`Failed on fund transaction: ${fundResponse.statusText}`);
        }

        const txids: string[] = [];
        for (const txn of tx) {
            const {
                description,
                transaction: { transaction, signers: extraSigners },
            } = txn as SolanaUnsignedTransaction<N, C>;

            if (this._debug)
                console.log(`Signing: ${description} for ${this.address()}`);
            console.log("txn:", txn.transaction);

            let priorityFeeIx: TransactionInstruction[] | undefined;
            if (this._priorityFee?.percentile && this._priorityFee.percentile > 0)
                priorityFeeIx = await createPriorityFeeInstructions(
                    this._rpc,
                    transaction,
                    this._priorityFee.percentile,
                    this._priorityFee.percentileMultiple,
                    this._priorityFee.min,
                    this._priorityFee.max,
                );

            if (this._debug) logTxDetails(transaction);

            // Try to send the transaction up to 5 times
            for (let i = 0; i < this._maxResubmits; i++) {
                try {
                    if (isVersionedTransaction(transaction)) {
                        if (priorityFeeIx && i === 0) {
                            const msg = TransactionMessage.decompile(transaction.message);
                            msg.instructions.push(...priorityFeeIx);
                            transaction.message = msg.compileToV0Message();
                        }
                        transaction.message.recentBlockhash = blockhash;
                        if (extraSigners) {
                            transaction.sign([...extraSigners]);
                        }
                    } else {
                        if (priorityFeeIx && i === 0) transaction.add(...priorityFeeIx);
                        transaction.recentBlockhash = blockhash;
                        transaction.lastValidBlockHeight = lastValidBlockHeight;
                        if (extraSigners) {
                            transaction.partialSign(...extraSigners);
                        }
                    }

                    const rawTransaction = transaction.serialize({
                        requireAllSignatures: false,
                        verifySignatures: false,
                    });
                    const signUrl = `${getApiUrl()}/sign`;
                    const signResponse = await fetch(signUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            transactionBase64: rawTransaction.toString('base64'),
                            walletId: this._walletId,
                            description: `xfer from ${this._sourceAddress.substring(0, 10)}`
                        })
                    });
                    if (!signResponse.ok) {
                        throw new Error(`Failed to sign transaction: ${signResponse.statusText}`);
                    }
                    const signData = await signResponse.json();
                    console.log(signData);
                    const signedTransaction = signData.transaction;
                    if (!signedTransaction) {
                        throw new Error('Invalid signature response');
                    }
                    const rawTransactionBuf = Buffer.from(
                        signedTransaction,
                        "base64"
                    );
                    const newTransaction = Transaction.from(rawTransactionBuf);
                    logTxDetails(newTransaction);

                    if (this._debug) console.log('Submitting transactions ');
                    const { signature } = await sendTxWithRetry(
                        this._rpc,
                        rawTransactionBuf,
                        this._sendOpts,
                    );
                    txids.push(signature);
                    break;
                } catch (e) {
                    // No point checking if retryable if we're on the last retry
                    if (i === this._maxResubmits - 1 || !this.retryable(e)) throw e;

                    if (this._debug)
                        console.log(
                            `Failed to send transaction on attempt ${i}, retrying: `,
                            e,
                        );

                    // If it is retryable, we need to grab a new block hash
                    const {
                        blockhash: newBlockhash,
                        lastValidBlockHeight: newBlockHeight,
                    } = await latestBlock(this._rpc);

                    lastValidBlockHeight = newBlockHeight;
                    blockhash = newBlockhash;
                }
            }
        }

        if (this._debug) console.log('Waiting for confirmation for: ', txids);

        // Wait for finalization
        const results = await Promise.all(
            txids.map(async (signature) => {
                try {
                    return await this._rpc.confirmTransaction(
                        {
                            signature,
                            blockhash,
                            lastValidBlockHeight,
                        },
                        this._rpc.commitment,
                    );
                } catch (e) {
                    console.error('Failed to confirm transaction: ', e);
                    throw e;
                }
            }),
        );

        const erroredTxs = results
            .filter((result) => result.value.err)
            .map((result) => result.value.err);

        if (erroredTxs.length > 0)
            throw new Error(`Failed to confirm transaction: ${erroredTxs}`);

        return txids;
    }
}

export function logTxDetails(transaction: Transaction | VersionedTransaction) {
    if (isVersionedTransaction(transaction)) {
        console.log(transaction.signatures);
        const msg = transaction.message;
        const keys = msg.getAccountKeys();
        msg.compiledInstructions.forEach((ix) => {
            console.log('Program', keys.get(ix.programIdIndex)!.toBase58());
            console.log('Data: ', encoding.hex.encode(ix.data));
            console.log(
                'Keys: ',
                ix.accountKeyIndexes.map((k) => [k, keys.get(k)!.toBase58()]),
            );
        });
    } else {
        console.log(transaction.signatures);
        console.log(transaction.feePayer);
        transaction.instructions.forEach((ix) => {
            console.log('Program', ix.programId.toBase58());
            console.log('Data: ', ix.data.toString('hex'));
            console.log(
                'Keys: ',
                ix.keys.map((k) => [k, k.pubkey.toBase58()]),
            );
        });
    }
}

/**
 *
 * @param connection a Solana/web3.js Connection to the network
 * @param transaction the transaction to determine the compute budget for
 * @param feePercentile the percentile of recent fees to use
 * @param multiple the multiple to apply to the percentile fee
 * @param minPriorityFee the minimum priority fee to use
 * @param maxPriorityFee the maximum priority fee to use
 * @returns an array of TransactionInstructions to set the compute budget and priority fee for the transaction
 */
export async function createPriorityFeeInstructions(
    connection: Connection,
    transaction: Transaction | VersionedTransaction,
    feePercentile: number = DEFAULT_PRIORITY_FEE_PERCENTILE,
    multiple: number = DEFAULT_PERCENTILE_MULTIPLE,
    minPriorityFee: number = DEFAULT_MIN_PRIORITY_FEE,
    maxPriorityFee: number = DEFAULT_MAX_PRIORITY_FEE,
): Promise<TransactionInstruction[]> {
    const [computeBudget, priorityFee] = await Promise.all([
        determineComputeBudget(connection, transaction),
        determinePriorityFee(
            connection,
            transaction,
            feePercentile,
            multiple,
            minPriorityFee,
            maxPriorityFee,
        ),
    ]);

    return [
        ComputeBudgetProgram.setComputeUnitLimit({
            units: computeBudget,
        }),
        ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee,
        }),
    ];
}

/**
 * A helper function to determine the compute budget to use for a transaction
 * @param connection Solana/web3.js Connection to the network
 * @param transaction The transaction to determine the compute budget for
 * @returns the compute budget to use for the transaction
 */
export async function determineComputeBudget(
    connection: Connection,
    transaction: Transaction | VersionedTransaction,
): Promise<number> {
    let computeBudget = DEFAULT_COMPUTE_BUDGET;
    try {
        const simulateResponse = await (isVersionedTransaction(transaction)
            ? connection.simulateTransaction(transaction)
            : connection.simulateTransaction(transaction));

        if (simulateResponse.value.err)
            console.error(
                `Error simulating Solana transaction: ${simulateResponse.value.err}`,
            );

        if (simulateResponse?.value?.unitsConsumed) {
            // Set compute budget to 120% of the units used in the simulated transaction
            computeBudget = Math.round(simulateResponse.value.unitsConsumed * 1.2);
        }
    } catch (e) {
        console.error(
            `Failed to calculate compute unit limit for Solana transaction: ${e}`,
        );
    }
    return computeBudget;
}

/**
 * A helper function to determine the priority fee to use for a transaction
 *
 * @param connection Solana/web3.js Connection to the network
 * @param transaction The transaction to determine the priority fee for
 * @param percentile The percentile of recent fees to use
 * @param multiple The multiple to apply to the percentile fee
 * @param minPriorityFee The minimum priority fee to use
 * @param maxPriorityFee The maximum priority fee to use
 * @returns the priority fee to use according to the recent transactions and the given parameters
 */
export async function determinePriorityFee(
    connection: Connection,
    transaction: Transaction | VersionedTransaction,
    percentile: number = DEFAULT_PRIORITY_FEE_PERCENTILE,
    multiple: number = DEFAULT_PERCENTILE_MULTIPLE,
    minPriorityFee: number = DEFAULT_MIN_PRIORITY_FEE,
    maxPriorityFee: number = DEFAULT_MAX_PRIORITY_FEE,
): Promise<number> {
    // https://twitter.com/0xMert_/status/1768669928825962706

    // Start with min fee
    let fee = minPriorityFee;

    // Figure out which accounts need write lock
    let lockedWritableAccounts = [];
    if (isVersionedTransaction(transaction)) {
        const luts = (
            await Promise.all(
                transaction.message.addressTableLookups.map((acc) =>
                    connection.getAddressLookupTable(acc.accountKey),
                ),
            )
        )
            .map((lut) => lut.value)
            .filter((val) => val !== null) as AddressLookupTableAccount[];
        const msg = transaction.message;
        const keys = msg.getAccountKeys({
            addressLookupTableAccounts: luts ?? undefined,
        });
        lockedWritableAccounts = msg.compiledInstructions
            .flatMap((ix) => ix.accountKeyIndexes)
            .map((k) => (msg.isAccountWritable(k) ? keys.get(k) : null))
            .filter((k) => k !== null) as PublicKey[];
    } else {
        lockedWritableAccounts = transaction.instructions
            .flatMap((ix) => ix.keys)
            .map((k) => (k.isWritable ? k.pubkey : null))
            .filter((k) => k !== null) as PublicKey[];
    }

    try {
        const recentFeesResponse = await connection.getRecentPrioritizationFees({
            lockedWritableAccounts,
        });

        if (recentFeesResponse) {
            // Sort fees to find the appropriate percentile
            const recentFees = recentFeesResponse
                .map((dp) => dp.prioritizationFee)
                .sort((a, b) => a - b);

            // Find the element in the distribution that matches the percentile requested
            const idx = Math.ceil(recentFees.length * percentile);
            if (recentFees.length > idx) {
                let percentileFee = recentFees[idx]!;

                // Apply multiple if provided
                if (multiple > 0) percentileFee *= multiple;

                fee = Math.max(fee, percentileFee);
            }
        }
    } catch (e) {
        console.error('Error fetching Solana recent fees', e);
    }

    // Bound the return value by the parameters pased
    return Math.min(Math.max(fee, minPriorityFee), maxPriorityFee);
}

export class SolanaSigner<N extends Network, C extends SolanaChains = 'Solana'>
    implements SignOnlySigner<N, C> {
    constructor(
        private _chain: C,
        private _keypair: Keypair,
        private _rpc: Connection,
        private _debug: boolean = false,
    ) { }

    chain(): C {
        return this._chain;
    }

    address(): string {
        return this._keypair.publicKey.toBase58();
    }

    async sign(tx: SolanaUnsignedTransaction<N>[]): Promise<Buffer[]> {
        const { blockhash } = await latestBlock(this._rpc);

        const signed = [];
        for (const txn of tx) {
            const {
                description,
                transaction: { transaction, signers: extraSigners },
            } = txn;

            if (this._debug)
                console.log(`Signing: ${description} for ${this.address()}`);

            if (this._debug) logTxDetails(transaction);

            if (isVersionedTransaction(transaction)) {
                transaction.message.recentBlockhash = blockhash;
                transaction.sign([this._keypair, ...(extraSigners ?? [])]);
                signed.push(Buffer.from(transaction.serialize()));
            } else {
                transaction.recentBlockhash = blockhash;
                transaction.partialSign(this._keypair, ...(extraSigners ?? []));
                signed.push(transaction.serialize());
            }
        }
        return signed;
    }
}
