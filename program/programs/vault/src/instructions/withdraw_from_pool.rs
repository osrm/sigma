use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::VAULT_TYPE_PREFIX;
use crate::states::*;
// use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct WithdrawFromPool<'info> {
    #[account(
        has_one = owner,
        has_one = pool,
    )]
    pub vault_type: Account<'info, VaultType>,
    pub owner: Signer<'info>,
    #[account(
        mut,
        associated_token::mint = vault_type.mint,
        associated_token::authority = vault_type,
    )]
    pub pool: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = vault_type.mint,
    )]
    pub destination: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn withdraw_from_pool(ctx: Context<WithdrawFromPool>, amount: u64) -> Result<()> {
    // TODO: various checks

    let vt = &ctx.accounts.vault_type;

    let seeds: &[&[&[u8]]] = &[&[
        VAULT_TYPE_PREFIX,
        &vt.mint.to_bytes(),
        &vt.owner.to_bytes(),
        &[vt.bump],
    ]];
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool.to_account_info(),
                to: ctx.accounts.destination.to_account_info(),
                authority: ctx.accounts.vault_type.to_account_info(),
            },
        )
        .with_signer(seeds),
        amount,
    )?;

    Ok(())
}
