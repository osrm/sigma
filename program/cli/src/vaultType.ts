import { program, defaultConnection, defaultKeypairPath } from "./index";
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createAccount, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { getNow, loadKeypair, toUTCDayjs, truncateToHour } from "./utils";
import { Vault } from "../../target/types/vault";

// TODO: replace it with idl to allow program ID customization

export function defineCommands() {
    program
        .command('list-vault-types')
        .description('List all vault types')
        .option(
            '-c, --connection <connection>',
            'Connection URL of Solana RPC'
        )
        .option(
            '-k, --keypair-path <keypair-path>',
            'Path of the keypair to use (default: ~/.config/solana/id.json)'
        )
        .option(
            '-i, --program-id <program-id>',
            'The program ID'
        )
        .action(listVaultTypes);

    program
        .command('new-vault-type')
        .description('Create a new vault type')
        .option(
            '-o, --owner <keypair-path>',
            'The keypair path of the owner (default: payer keypair path)'
        )
        .requiredOption(
            '-m, --mint <pubkey>',
            'The public key of the pool token mint'
        )
        .option(
            '-s, --start <date-time-string>',
            'The start date and time of the season (default: now)'
        )
        .option(
            '-d, --duration <seconds>',
            'The time interval of the season in seconds (default: 1 day)'
        )
        .option(
            '-x, --instance-deactivation',
            'Allow users to deactivate their vaults instantly'
        )
        .option(
            '-c, --connection <connection>',
            'The connection URL of Solana RPC'
        )
        .option(
            '-k, --keypair-path <keypair-path>',
            'Path of the payer keypair to use (default: ~/.config/solana/id.json)'
        )
        .option(
            '-i, --program-id <program-id>',
            'The program ID'
        )
        .action(newVaultType);

        program
        .command('close-vault-type')
        .description('Close a vault type')
        .requiredOption(
            '-v, --vault-type <pubkey>',
            'The public key of the vault type account to close'
        )
        .option(
            '-o, --owner <keypair-path>',
            'The keypair path of the owner (default: payer keypair path)'
        )
        .option(
            '-c, --connection <connection>',
            'Connection URL of Solana RPC'
        )
        .option(
            '-k, --keypair-path <keypair-path>',
            'Path of the keypair to use (default: ~/.config/solana/id.json)'
        )
        .option(
            '-i, --program-id <program-id>',
            'The program ID'
        )
        .action(closeVaultType);
}

async function listVaultTypes({ connection, keypairPath, programId }: {
    connection: string
    keypairPath: string
    programId: string
}) {
    const conn = new Connection(connection ? connection : defaultConnection);
    const wallet = new Wallet(loadKeypair(keypairPath ? keypairPath : defaultKeypairPath));
    const provider = new AnchorProvider(conn, wallet, {});
    anchor.setProvider(provider);

    const program = anchor.workspace.Vault as Program<Vault>;

    const vaultTypes = await program.account.vaultType.all();
    vaultTypes.forEach((r, index) => {
        const vaultType = r.account;
        console.log(`VaultType [${index + 1}/${vaultTypes.length}]: Pubkey ${r.publicKey}`);
        console.log(`  Owner: ${vaultType.owner.toString()}`);
        console.log(`  Mint: ${vaultType.mint.toString()}`);
        console.log(`  Pool: ${vaultType.pool.toString()}`);
        console.log(`  Start Timestamp: ${new Date(vaultType.seasonStart.toNumber() * 1000).toUTCString()}`);
        console.log(`  Duration: ${vaultType.seasonDuration.toNumber()}`);
        console.log(`  Max Deposit Per User: ${vaultType.maxDepositPerUser.toNumber()}`);
        console.log(`  Total Deposit: ${vaultType.totalDeposit.toNumber()}`);
        console.log(`  Instant Deactivation: ${vaultType.instantDeactivation}`);
        console.log('');
    });
}

async function newVaultType({ owner, mint, start, duration, instanceDeactivation, connection, keypairPath, programId }: {
    owner: string
    mint: string
    start: string
    duration: string
    instanceDeactivation: boolean
    connection: string
    keypairPath: string
    programId: string
}) {
    const conn = new Connection(connection ? connection : defaultConnection);
    const payer = keypairPath ?? defaultKeypairPath;
    const wallet = new Wallet(loadKeypair(payer));
    const provider = new AnchorProvider(conn, wallet, {});
    anchor.setProvider(provider);

    const program = anchor.workspace.Vault as Program<Vault>;

    const ownerKp = loadKeypair(owner ?? payer);
    const mintPubkey = new PublicKey(mint);
    const startDayjs = start ? truncateToHour(toUTCDayjs(start)) : getNow();
    const startTime = new anchor.BN(startDayjs.valueOf() / 1000);
    const durationNum = new anchor.BN(duration ? duration : 60 * 60 * 24);

    const [vaultType, _] = PublicKey.findProgramAddressSync(
        [
            anchor.utils.bytes.utf8.encode('vault_type'),
            mintPubkey.toBuffer(),
            ownerKp.publicKey.toBuffer(),
        ],
        program.programId
    );

    const pool = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet.payer,
        mintPubkey,
        vaultType,
        true,
    );
    console.log(`Created ATA pool account: ${pool.address.toBase58()}`);

    // Create a new vault type
    try {
        const newVaultTypeTx = await program.methods.newVaultType(
            startTime,
            durationNum,
            new anchor.BN(0),
            instanceDeactivation,
        )
            .accounts({
                owner: ownerKp.publicKey,
                mint: mintPubkey,
                // @ts-ignore
                pool: pool.address,
                vaultType,
                payer: wallet.payer.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([wallet.payer, ownerKp])
            .rpc();
        console.log("Transaction signature:", newVaultTypeTx);

        console.log("Created vaultType:", vaultType.toString());
    } catch (error) {
        if (error instanceof anchor.web3.SendTransactionError) {
            console.error("SendTransactionError occurred:");
            console.error("Error message:", error.message);
            console.error("Error logs:", error.logs);
        } else {
            console.error("An unexpected error occurred:", error);
        }
    }
}

async function closeVaultType({ vaultType, owner, connection, keypairPath, programId }: {
    vaultType: string
    owner: string
    connection: string
    keypairPath: string
    programId: string
}) {
    const conn = new Connection(connection ? connection : defaultConnection);
    const payer = keypairPath ?? defaultKeypairPath;
    const wallet = new Wallet(loadKeypair(payer));
    const provider = new AnchorProvider(conn, wallet, {});
    anchor.setProvider(provider);

    const program = anchor.workspace.Vault as Program<Vault>;

    const vaultTypePubkey = new PublicKey(vaultType);
    const ownerKp = loadKeypair(owner ?? payer);
    
    const vaultTypeAccount = await program.account.vaultType.fetch(vaultTypePubkey);

    // Close a vault type
    try {
        const closeVaultTypeTx = await program.methods.closeVaultType(
        )
            .accounts({
                vaultType: vaultTypePubkey,                
                // @ts-ignore
                owner: ownerKp.publicKey,
                pool: vaultTypeAccount.pool,
                payer: wallet.payer.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([wallet.payer, ownerKp])
            .rpc();
        console.log("Transaction signature:", closeVaultTypeTx);
    } catch (error) {
        if (error instanceof anchor.web3.SendTransactionError) {
            console.error("SendTransactionError occurred:");
            console.error("Error message:", error.message);
            console.error("Error logs:", error.logs);
        } else {
            console.error("An unexpected error occurred:", error);
        }
    }
}
