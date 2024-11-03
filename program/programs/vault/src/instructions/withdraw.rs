use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::errors::ErrorCode;
use crate::constants::VAULT_TYPE_PREFIX;
use crate::states::*;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        has_one = owner,
        has_one = vault_type,
    )]
    pub vault: Account<'info, Vault>,
    #[account(has_one = pool)]
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
        token::authority = owner,
    )]
    pub to: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let v = &mut ctx.accounts.vault;
    let vt = &ctx.accounts.vault_type;

    if v.status == VaultStatus::Deactivating {
        let now = Clock::get()?.unix_timestamp;
        if v.inactive_at >= now {
            v.status = VaultStatus::Inactive;
        }
    }

    require!(v.amount >= amount, ErrorCode::InsufficientDeposit);
    require!(v.status == VaultStatus::Inactive, ErrorCode::InvalidStatus);

    v.amount = v.amount.checked_sub(amount).ok_or(ErrorCode::ArithmeticError)?;

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
                to: ctx.accounts.to.to_account_info(),
                authority: ctx.accounts.vault_type.to_account_info(),
            },
        )
        .with_signer(seeds),
        amount,
    )?;

    Ok(())
}
