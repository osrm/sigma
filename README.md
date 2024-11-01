# 概要

このプロジェクトの概要。

# インストールと起動方法

## Solana プログラム

```shell
anchor keys sync
```

## API サーバ

`api/.env.development.local` を記述

```shell
CIRCLE_API_KEY = <YOUR_CIRCLE_TESTNET_API_KEY>
CIRCLE_ENTITY_SECRET = <YOUR_CIRCLE_ENTITY_SECRET>
```

`api/.env` またはローカルでポート指定（指定しない場合は 3000）、ブロックチェーン (SOL または SOL-DEVNET)

```shell
PORT = 3010
BLOCKCHAIN = SOL-DEVNET
```

## フロントエンド

`frontend/.env` を記述

```shell
NEXT_PUBLIC_ENABLE_TESTNETS = true
```

