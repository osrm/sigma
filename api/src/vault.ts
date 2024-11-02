/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/vault.json`.
 */
export type Vault = {
    "address": "DcnDr4dPpXWHkmS8TSXG3bL9dnshCVRRzQi4gTndtUsG",
    "metadata": {
      "name": "vault",
      "version": "0.1.0",
      "spec": "0.1.0",
      "description": "Created with Anchor"
    },
    "instructions": [
      {
        "name": "closeVault",
        "discriminator": [
          141,
          103,
          17,
          126,
          72,
          75,
          29,
          29
        ],
        "accounts": [
          {
            "name": "vault",
            "writable": true
          },
          {
            "name": "vaultType",
            "relations": [
              "vault"
            ]
          },
          {
            "name": "owner",
            "signer": true,
            "relations": [
              "vault"
            ]
          },
          {
            "name": "payer",
            "writable": true,
            "signer": true
          },
          {
            "name": "systemProgram",
            "address": "11111111111111111111111111111111"
          }
        ],
        "args": []
      },
      {
        "name": "closeVaultType",
        "discriminator": [
          214,
          7,
          188,
          145,
          85,
          167,
          48,
          233
        ],
        "accounts": [
          {
            "name": "vaultType",
            "writable": true
          },
          {
            "name": "owner",
            "signer": true,
            "relations": [
              "vaultType"
            ]
          },
          {
            "name": "pool",
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "vaultType"
                },
                {
                  "kind": "const",
                  "value": [
                    6,
                    221,
                    246,
                    225,
                    215,
                    101,
                    161,
                    147,
                    217,
                    203,
                    225,
                    70,
                    206,
                    235,
                    121,
                    172,
                    28,
                    180,
                    133,
                    237,
                    95,
                    91,
                    55,
                    145,
                    58,
                    140,
                    245,
                    133,
                    126,
                    255,
                    0,
                    169
                  ]
                },
                {
                  "kind": "account",
                  "path": "vault_type.mint",
                  "account": "vaultType"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            },
            "relations": [
              "vaultType"
            ]
          },
          {
            "name": "payer",
            "writable": true,
            "signer": true
          },
          {
            "name": "systemProgram",
            "address": "11111111111111111111111111111111"
          },
          {
            "name": "tokenProgram",
            "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          }
        ],
        "args": []
      },
      {
        "name": "deactivate",
        "discriminator": [
          44,
          112,
          33,
          172,
          113,
          28,
          142,
          13
        ],
        "accounts": [
          {
            "name": "vault",
            "writable": true
          },
          {
            "name": "vaultType",
            "relations": [
              "vault"
            ]
          },
          {
            "name": "owner",
            "signer": true,
            "relations": [
              "vault"
            ]
          },
          {
            "name": "payer",
            "writable": true,
            "signer": true
          }
        ],
        "args": []
      },
      {
        "name": "deposit",
        "discriminator": [
          242,
          35,
          198,
          137,
          82,
          225,
          242,
          182
        ],
        "accounts": [
          {
            "name": "vault",
            "writable": true
          },
          {
            "name": "vaultType",
            "relations": [
              "vault"
            ]
          },
          {
            "name": "owner",
            "signer": true,
            "relations": [
              "vault"
            ]
          },
          {
            "name": "pool",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "vaultType"
                },
                {
                  "kind": "const",
                  "value": [
                    6,
                    221,
                    246,
                    225,
                    215,
                    101,
                    161,
                    147,
                    217,
                    203,
                    225,
                    70,
                    206,
                    235,
                    121,
                    172,
                    28,
                    180,
                    133,
                    237,
                    95,
                    91,
                    55,
                    145,
                    58,
                    140,
                    245,
                    133,
                    126,
                    255,
                    0,
                    169
                  ]
                },
                {
                  "kind": "account",
                  "path": "vault_type.mint",
                  "account": "vaultType"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            },
            "relations": [
              "vaultType"
            ]
          },
          {
            "name": "from",
            "writable": true
          },
          {
            "name": "payer",
            "writable": true,
            "signer": true
          },
          {
            "name": "systemProgram",
            "address": "11111111111111111111111111111111"
          },
          {
            "name": "tokenProgram",
            "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          }
        ],
        "args": [
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      },
      {
        "name": "newVault",
        "discriminator": [
          0,
          196,
          119,
          39,
          154,
          60,
          10,
          44
        ],
        "accounts": [
          {
            "name": "vault",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    118,
                    97,
                    117,
                    108,
                    116
                  ]
                },
                {
                  "kind": "account",
                  "path": "vaultType"
                },
                {
                  "kind": "account",
                  "path": "owner"
                }
              ]
            }
          },
          {
            "name": "vaultType"
          },
          {
            "name": "owner",
            "signer": true
          },
          {
            "name": "payer",
            "writable": true,
            "signer": true
          },
          {
            "name": "systemProgram",
            "address": "11111111111111111111111111111111"
          }
        ],
        "args": []
      },
      {
        "name": "newVaultType",
        "discriminator": [
          115,
          230,
          146,
          235,
          63,
          19,
          186,
          29
        ],
        "accounts": [
          {
            "name": "vaultType",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    118,
                    97,
                    117,
                    108,
                    116,
                    95,
                    116,
                    121,
                    112,
                    101
                  ]
                },
                {
                  "kind": "account",
                  "path": "mint"
                },
                {
                  "kind": "account",
                  "path": "owner"
                }
              ]
            }
          },
          {
            "name": "mint"
          },
          {
            "name": "owner",
            "signer": true
          },
          {
            "name": "pool",
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "vaultType"
                },
                {
                  "kind": "const",
                  "value": [
                    6,
                    221,
                    246,
                    225,
                    215,
                    101,
                    161,
                    147,
                    217,
                    203,
                    225,
                    70,
                    206,
                    235,
                    121,
                    172,
                    28,
                    180,
                    133,
                    237,
                    95,
                    91,
                    55,
                    145,
                    58,
                    140,
                    245,
                    133,
                    126,
                    255,
                    0,
                    169
                  ]
                },
                {
                  "kind": "account",
                  "path": "mint"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            }
          },
          {
            "name": "payer",
            "writable": true,
            "signer": true
          },
          {
            "name": "systemProgram",
            "address": "11111111111111111111111111111111"
          }
        ],
        "args": [
          {
            "name": "seasonStart",
            "type": "i64"
          },
          {
            "name": "seasonDuration",
            "type": "i64"
          },
          {
            "name": "maxDepositPerUser",
            "type": "u64"
          },
          {
            "name": "instantDeactivation",
            "type": "bool"
          }
        ]
      },
      {
        "name": "rollOverVaultType",
        "discriminator": [
          233,
          161,
          46,
          228,
          96,
          94,
          245,
          57
        ],
        "accounts": [
          {
            "name": "vaultType",
            "writable": true
          },
          {
            "name": "payer",
            "writable": true,
            "signer": true
          }
        ],
        "args": []
      },
      {
        "name": "withdraw",
        "discriminator": [
          183,
          18,
          70,
          156,
          148,
          109,
          161,
          34
        ],
        "accounts": [
          {
            "name": "vault",
            "writable": true
          },
          {
            "name": "vaultType",
            "relations": [
              "vault"
            ]
          },
          {
            "name": "owner",
            "signer": true,
            "relations": [
              "vault"
            ]
          },
          {
            "name": "pool",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "vaultType"
                },
                {
                  "kind": "const",
                  "value": [
                    6,
                    221,
                    246,
                    225,
                    215,
                    101,
                    161,
                    147,
                    217,
                    203,
                    225,
                    70,
                    206,
                    235,
                    121,
                    172,
                    28,
                    180,
                    133,
                    237,
                    95,
                    91,
                    55,
                    145,
                    58,
                    140,
                    245,
                    133,
                    126,
                    255,
                    0,
                    169
                  ]
                },
                {
                  "kind": "account",
                  "path": "vault_type.mint",
                  "account": "vaultType"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            },
            "relations": [
              "vaultType"
            ]
          },
          {
            "name": "to",
            "writable": true
          },
          {
            "name": "payer",
            "writable": true,
            "signer": true
          },
          {
            "name": "systemProgram",
            "address": "11111111111111111111111111111111"
          },
          {
            "name": "tokenProgram",
            "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          }
        ],
        "args": [
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      },
      {
        "name": "withdrawFromPool",
        "discriminator": [
          62,
          33,
          128,
          81,
          40,
          234,
          29,
          77
        ],
        "accounts": [
          {
            "name": "vaultType"
          },
          {
            "name": "owner",
            "signer": true,
            "relations": [
              "vaultType"
            ]
          },
          {
            "name": "pool",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "vaultType"
                },
                {
                  "kind": "const",
                  "value": [
                    6,
                    221,
                    246,
                    225,
                    215,
                    101,
                    161,
                    147,
                    217,
                    203,
                    225,
                    70,
                    206,
                    235,
                    121,
                    172,
                    28,
                    180,
                    133,
                    237,
                    95,
                    91,
                    55,
                    145,
                    58,
                    140,
                    245,
                    133,
                    126,
                    255,
                    0,
                    169
                  ]
                },
                {
                  "kind": "account",
                  "path": "vault_type.mint",
                  "account": "vaultType"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            },
            "relations": [
              "vaultType"
            ]
          },
          {
            "name": "destination",
            "writable": true
          },
          {
            "name": "payer",
            "writable": true,
            "signer": true
          },
          {
            "name": "systemProgram",
            "address": "11111111111111111111111111111111"
          },
          {
            "name": "tokenProgram",
            "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          }
        ],
        "args": [
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    ],
    "accounts": [
      {
        "name": "vault",
        "discriminator": [
          211,
          8,
          232,
          43,
          2,
          152,
          117,
          119
        ]
      },
      {
        "name": "vaultType",
        "discriminator": [
          251,
          71,
          249,
          103,
          117,
          71,
          62,
          101
        ]
      }
    ],
    "errors": [
      {
        "code": 6000,
        "name": "invalidParameter",
        "msg": "Invalid parameter"
      },
      {
        "code": 6001,
        "name": "arithmeticError",
        "msg": "Arithmetic error"
      },
      {
        "code": 6002,
        "name": "invalidStatus",
        "msg": "Invalid status"
      },
      {
        "code": 6003,
        "name": "depositRemaining",
        "msg": "Deposit remaining"
      },
      {
        "code": 6004,
        "name": "insufficientDeposit",
        "msg": "Insufficient deposit"
      },
      {
        "code": 6005,
        "name": "poolRemaining",
        "msg": "Pool remaining"
      }
    ],
    "types": [
      {
        "name": "vault",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "owner",
              "docs": [
                "The pubkey of the owner."
              ],
              "type": "pubkey"
            },
            {
              "name": "vaultType",
              "docs": [
                "The pubkey of the vault type."
              ],
              "type": "pubkey"
            },
            {
              "name": "amount",
              "docs": [
                "The amount of token the user has deposited."
              ],
              "type": "u64"
            },
            {
              "name": "inactiveAt",
              "docs": [
                "The timestamp when the vault becomes inactive."
              ],
              "type": "i64"
            },
            {
              "name": "status",
              "docs": [
                "Current vault status."
              ],
              "type": {
                "defined": {
                  "name": "vaultStatus"
                }
              }
            },
            {
              "name": "bump",
              "docs": [
                "The bump seed of this pda."
              ],
              "type": "u8"
            }
          ]
        }
      },
      {
        "name": "vaultStatus",
        "type": {
          "kind": "enum",
          "variants": [
            {
              "name": "active"
            },
            {
              "name": "deactivating"
            },
            {
              "name": "inactive"
            }
          ]
        }
      },
      {
        "name": "vaultType",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "owner",
              "type": "pubkey"
            },
            {
              "name": "mint",
              "type": "pubkey"
            },
            {
              "name": "pool",
              "type": "pubkey"
            },
            {
              "name": "seasonStart",
              "type": "i64"
            },
            {
              "name": "seasonDuration",
              "type": "i64"
            },
            {
              "name": "maxDepositPerUser",
              "type": "u64"
            },
            {
              "name": "totalDeposit",
              "type": "u64"
            },
            {
              "name": "instantDeactivation",
              "type": "bool"
            },
            {
              "name": "bump",
              "type": "u8"
            }
          ]
        }
      }
    ]
  };
  