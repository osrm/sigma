use anchor_lang::prelude::*;

use crate::states::*;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account(
        mut,
        close = payer,
        has_one = owner,
        has_one = vault_type,
    )]
    pub vault: Account<'info, Vault>,
    pub vault_type: Account<'info, VaultType>,
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
    require!(ctx.accounts.vault.amount == 0, ErrorCode::DepositRemaining);

    Ok(())
}
