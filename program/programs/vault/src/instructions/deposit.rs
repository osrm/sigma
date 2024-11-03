use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::states::*;

#[derive(Accounts)]
pub struct Deposit<'info> {
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
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {

    // TODO: various checks (ex. the deposit limit)

    let cpi_accounts = Transfer {
        from: ctx.accounts.from.to_account_info(),
        to: ctx.accounts.pool.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    let v = &mut ctx.accounts.vault;
    v.amount = v.amount.checked_add(amount).unwrap();
    v.status = VaultStatus::Active;

    Ok(())
}
