use anchor_lang::prelude::*;

#[account]
pub struct VaultType {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub pool: Pubkey,
    pub season_start: i64,
    pub season_duration: i64,
    pub max_deposit_per_user: u64,
    pub total_deposit: u64,
    pub instant_deactivation: bool,
    pub bump: u8,
}

impl VaultType {
    pub const SIZE: usize = std::mem::size_of::<Self>();
}

#[derive(Debug, Clone, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
pub enum VaultStatus {
    Active,
    Deactivating,
    Inactive,
}

#[account]
pub struct Vault {
    /// The pubkey of the owner.
    pub owner: Pubkey,

    /// The pubkey of the vault type.
    pub vault_type: Pubkey,

    /// The amount of token the user has deposited.
    pub amount: u64,

    /// The timestamp when the vault becomes inactive.
    pub inactive_at: i64,

    /// Current vault status.
    pub status: VaultStatus,

    /// The bump seed of this pda.
    pub bump: u8,
}

impl Vault {
    pub const SIZE: usize = std::mem::size_of::<Self>();
}
