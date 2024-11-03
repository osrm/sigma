use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod states;

use instructions::*;

declare_id!("DcnDr4dPpXWHkmS8TSXG3bL9dnshCVRRzQi4gTndtUsG");

#[program]
pub mod vault {
    use super::*;

    pub fn new_vault_type(
        ctx: Context<NewVaultType>,
        season_start: i64,
        season_duration: i64,
        max_deposit_per_user: u64,
        instant_deactivation: bool,
    ) -> Result<()> {
        instructions::new_vault_type(ctx, season_start, season_duration, max_deposit_per_user, instant_deactivation)
    }
    
    pub fn roll_over_vault_type(ctx: Context<RollOverVaultType>) -> Result<()> {
        instructions::roll_over_vault_type(ctx)
    }

    pub fn withdraw_from_pool(ctx: Context<WithdrawFromPool>, amount: u64) -> Result<()> {
        instructions::withdraw_from_pool(ctx, amount)
    }

    pub fn close_vault_type(ctx: Context<CloseVaultType>) -> Result<()> {
        instructions::close_vault_type(ctx)
    }

    // TODO: add `update_vault_type``
    
    pub fn new_vault(ctx: Context<NewVault>) -> Result<()> {
        instructions::new_vault(ctx)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit(ctx, amount)
    }

    pub fn deactivate(ctx: Context<Deactivate>) -> Result<()> {
        instructions::deactivate(ctx)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw(ctx, amount)
    }

    pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
        instructions::close_vault(ctx)
    }
}
