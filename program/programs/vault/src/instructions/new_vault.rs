use anchor_lang::prelude::*;

use crate::constants::VAULT_PREFIX;
use crate::states::*;

#[derive(Accounts)]
pub struct NewVault<'info> {
    #[account(
        init,
        seeds = [VAULT_PREFIX, vault_type.key().as_ref(), owner.key().as_ref()],
        bump,
        payer = payer,
        space = 8 + Vault::SIZE,
    )]
    pub vault: Account<'info, Vault>,
    pub vault_type: Account<'info, VaultType>,
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn new_vault(ctx: Context<NewVault>) -> Result<()> {
    let v = &mut ctx.accounts.vault;

    v.owner = ctx.accounts.owner.key();
    v.vault_type = ctx.accounts.vault_type.key();
    v.amount = 0;
    v.inactive_at = 0;
    v.status = VaultStatus::Inactive;
    v.bump = ctx.bumps.vault;

    Ok(())
}
