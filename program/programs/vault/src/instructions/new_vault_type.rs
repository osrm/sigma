use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

use crate::constants::VAULT_TYPE_PREFIX;
use crate::states::*;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct NewVaultType<'info> {
    #[account(
        init,
        seeds = [VAULT_TYPE_PREFIX, mint.key().as_ref(), owner.key().as_ref()],
        bump,
        payer = payer,
        space = 8 + VaultType::SIZE,
    )]
    pub vault_type: Account<'info, VaultType>,
    pub mint: Account<'info, Mint>,
    pub owner: Signer<'info>,
    #[account(
        associated_token::mint = mint,
        associated_token::authority = vault_type,
    )]
    pub pool: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn new_vault_type(
    ctx: Context<NewVaultType>,
    season_start: i64,
    season_duration: i64,
    max_deposit_per_user: u64,
    instant_deactivation: bool,
) -> Result<()> {
    require!(season_start > 0 && season_duration > 0, ErrorCode::InvalidParameter);

    let vt = &mut ctx.accounts.vault_type;

    vt.owner = ctx.accounts.owner.key();
    vt.mint = ctx.accounts.mint.key();
    vt.pool = ctx.accounts.pool.key();
    vt.season_start = season_start;
    vt.season_duration = season_duration;
    vt.max_deposit_per_user = max_deposit_per_user;
    vt.instant_deactivation = instant_deactivation;
    vt.bump = ctx.bumps.vault_type;

    Ok(())
}
