import type {
    Chain,
    ChainAddress,
    ChainContext,
    Network,
    Signer,
} from "@wormhole-foundation/sdk";
import {
    DEFAULT_TASK_TIMEOUT,
    TokenTransfer,
    TransferState,
    Wormhole,
} from "@wormhole-foundation/sdk";

import { getSolanaSignAndSendSigner }  from "./solana";

export interface SignerStuff<N extends Network, C extends Chain = Chain> {
    chain: ChainContext<N, C>;
    signer: Signer<N, C>;
    address: ChainAddress<C>;
}

export async function getSolanaSigner<N extends Network, C extends Chain>(
    chain: ChainContext<N, C>,
    sourceAddress: string,
): Promise<SignerStuff<N, C>> {
    const signer = await getSolanaSignAndSendSigner(await chain.getRpc(), sourceAddress, {
        debug: true,
        priorityFee: {
            // take the middle priority fee
            percentile: 0.5,
            // juice the base fee taken from priority fee percentile
            percentileMultiple: 2,
            // at least 1 lamport/compute unit
            min: 1,
            // at most 1000 lamport/compute unit
            max: 1000,
        },
    });
    return {
        chain,
        signer: signer as Signer<N, C>,
        address: Wormhole.chainAddress(chain.chain, signer.address()),
    };
}

export async function waitLog<N extends Network = Network>(
    wh: Wormhole<N>,
    xfer: TokenTransfer<N>,
    tag: string = "WaitLog",
    timeout: number = DEFAULT_TASK_TIMEOUT,
) {
    const tracker = TokenTransfer.track(wh, TokenTransfer.getReceipt(xfer), timeout);
    let receipt;
    for await (receipt of tracker) {
        console.log(`${tag}: Current trasfer state: `, TransferState[receipt.state]);
    }
    return receipt;
}
