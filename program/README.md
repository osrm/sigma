# Windfall vault program

This repository contains the vault program that implements Windfall's staking hub feature.

We are participating in the Solana Radar Hackathon 2024, and this repository contains the staking portion of our project.

## Prerequisites

- Solana CLI 1.18.22+
- Anchor 0.30.1

## Build

You can build our staking program with the following commands:

```shell
npm install
anchor build
```

## Test

You can run local tests with the following commands:

```shell
# Execute local tests.
anchor test
```

## Overview

The `vault` program currently has two structures:

- `vault_type`
- `vault`

### `vault_type`

Created by Windfall team for each SPL token that Windfall accepts deposits, and it controls the overall deposit / withdrawal behavior.

The `vault_type` has a concept of "seasons", where the start and duration of the current season are represented by the `season_start` and `season_duration` fields in the structure.

### `vault`

A structure created for each `vault_type` and also for each user wallet to manage the user's deposit status.

### Withdrawal Restrictions

When a user deposits, the `vault` transitions to an active state. In principle, withdrawals are not possible while the `vault` is active.

Users wishing to withdraw must `deactivate` their `vault`, transitioning it to a `deactivating` status.

A deactivating `vault` changes to `inactive` status in the next season, at which point withdrawal becomes possible.

As an exception, if the `instant_deactivation` field of the `vault_type` is true, when users `deactivate` their `vault`, it transitions immediately to `inactive` status, allowing them to withdraw funds right away.
