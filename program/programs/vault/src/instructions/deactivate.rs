use anchor_lang::prelude::*;

use crate::states::*;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct Deactivate<'info> {
    #[account(
        mut,
        has_one = owner,
        has_one = vault_type,
    )]
    pub vault: Account<'info, Vault>,
    pub vault_type: Account<'info, VaultType>,
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
}

pub fn deactivate(ctx: Context<Deactivate>) -> Result<()> {
    let v = &mut ctx.accounts.vault;
    let vt = &ctx.accounts.vault_type;

    require!(v.status != VaultStatus::Inactive, ErrorCode::InvalidStatus);

    if vt.instant_deactivation {
        v.status = VaultStatus::Inactive;
    } else {
        v.status = VaultStatus::Deactivating;
        v.inactive_at = vt.season_start.checked_add(vt.season_duration).ok_or(ErrorCode::ArithmeticError)?;
    
        msg!("the vault will be inactive at {}", v.inactive_at);    
    }

    Ok(())
}
