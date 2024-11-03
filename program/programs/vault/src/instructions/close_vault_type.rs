use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::states::*;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct CloseVaultType<'info> {
    #[account(
        mut,
        close = payer,
        has_one = owner,
        has_one = pool,
    )]
    pub vault_type: Account<'info, VaultType>,
    pub owner: Signer<'info>,
    #[account(
        associated_token::mint = vault_type.mint,
        associated_token::authority = vault_type,
    )]
    pub pool: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn close_vault_type(ctx: Context<CloseVaultType>) -> Result<()> {
    require!(ctx.accounts.vault_type.total_deposit == 0, ErrorCode::DepositRemaining);
    require!(ctx.accounts.pool.amount == 0, ErrorCode::PoolRemaining);

    Ok(())
}
