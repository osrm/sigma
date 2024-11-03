use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::states::*;

#[derive(Accounts)]
pub struct RollOverVaultType<'info> {
    #[account(mut)]
    pub vault_type: Account<'info, VaultType>,
    #[account(mut)]
    pub payer: Signer<'info>,
}

pub fn roll_over_vault_type(ctx: Context<RollOverVaultType>) -> Result<()> {
    let vt = &mut ctx.accounts.vault_type;
    let season_end = vt
        .season_start
        .checked_add(vt.season_duration)
        .ok_or(ErrorCode::ArithmeticError)?;
    let now = Clock::get()?.unix_timestamp;

    if now > season_end {
        vt.season_start = season_end;
    }

    Ok(())
}
