use anchor_lang::prelude::*;

// These error codes start at 6000 (0x1770).

/// Custom error codes for the Raffle program
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid parameter")]
    InvalidParameter,
    #[msg("Arithmetic error")]
    ArithmeticError,
    #[msg("Invalid status")]
    InvalidStatus,
    #[msg("Deposit remaining")]
    DepositRemaining,
    #[msg("Insufficient deposit")]
    InsufficientDeposit,
    #[msg("Pool remaining")]
    PoolRemaining,
}
