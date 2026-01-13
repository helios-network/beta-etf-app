export const etfFactoryAbi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "vault",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "eventNonce",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "eventHeight",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "etfNonce",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "address",
        name: "shareToken",
        type: "address"
      },
      {
        indexed: false,
        internalType: "string",
        name: "name",
        type: "string"
      },
      {
        indexed: false,
        internalType: "string",
        name: "symbol",
        type: "string"
      }
    ],
    name: "ETFCreated",
    type: "event"
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "config",
        type: "address[]"
      },
      {
        internalType: "address[]",
        name: "assetTokens",
        type: "address[]"
      },
      {
        internalType: "address[]",
        name: "priceFeeds",
        type: "address[]"
      },
      {
        internalType: "uint16[]",
        name: "targetWeightsBps",
        type: "uint16[]"
      },
      {
        internalType: "bytes[]",
        name: "swapPathsData",
        type: "bytes[]"
      },
      {
        internalType: "string[]",
        name: "params",
        type: "string[]"
      },
      {
        internalType: "uint256",
        name: "_initialSharePrice",
        type: "uint256"
      }
    ],
    name: "createETF",
    outputs: [
      {
        internalType: "address",
        name: "vault",
        type: "address"
      },
      {
        internalType: "address",
        name: "shareTokenAddr",
        type: "address"
      },
      {
        internalType: "address",
        name: "pricerAddr",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "vault",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "minSharesOut",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "slippageBps",
        type: "uint256"
      },
      {
        internalType: "bool",
        name: "simulate",
        type: "bool"
      }
    ],
    name: "deposit",
    outputs: [
      {
        internalType: "uint256",
        name: "sharesOutRet",
        type: "uint256"
      },
      {
        internalType: "uint256[]",
        name: "amountsOut",
        type: "uint256[]"
      },
      {
        internalType: "uint256[]",
        name: "valuesPerAsset",
        type: "uint256[]"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "vault",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "shares",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "minOut",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "slippageBps",
        type: "uint256"
      },
      {
        internalType: "bool",
        name: "simulate",
        type: "bool"
      }
    ],
    name: "redeem",
    outputs: [
      {
        internalType: "uint256",
        name: "depositOutRet",
        type: "uint256"
      },
      {
        internalType: "uint256[]",
        name: "soldAmounts",
        type: "uint256[]"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "vault",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "shares",
        type: "uint256"
      },
      {
        internalType: "bool",
        name: "simulate",
        type: "bool"
      },
      {
        internalType: "bool",
        name: "withReturn",
        type: "bool"
      }
    ],
    name: "redeemTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "depositOutRet",
        type: "uint256"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "vault",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "slippageBps",
        type: "uint256"
      }
    ],
    name: "rebalance",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "totalSoldValueUSD",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "totalBoughtValueUSD",
            type: "uint256"
          },
          {
            internalType: "uint256[]",
            name: "soldAmounts",
            type: "uint256[]"
          },
          {
            internalType: "uint256[]",
            name: "boughtAmounts",
            type: "uint256[]"
          },
          {
            internalType: "uint256[]",
            name: "soldValuesUSD",
            type: "uint256[]"
          },
          {
            internalType: "uint256[]",
            name: "boughtValuesUSD",
            type: "uint256[]"
          }
        ],
        internalType: "struct RebalanceResult",
        name: "result",
        type: "tuple"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "vault",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "imbalanceThresholdBps",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "maxPriceStaleness",
        type: "uint256"
      },
      {
        internalType: "uint64",
        name: "rebalanceCooldown",
        type: "uint64"
      },
      {
        internalType: "uint128",
        name: "maxCapacityUSD",
        type: "uint128"
      }
    ],
    name: "updateParams",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "vault",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "user",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "depositAmount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "sharesOut",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "amountsOut",
        type: "uint256[]"
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "valuesPerAsset",
        type: "uint256[]"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "eventNonce",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "eventHeight",
        type: "uint256"
      }
    ],
    name: "Deposit",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "vault",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "user",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "sharesIn",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "depositOut",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "soldAmounts",
        type: "uint256[]"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "eventNonce",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "eventHeight",
        type: "uint256"
      }
    ],
    name: "Redeem",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "vault",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "user",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "totalSoldValueUSD",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "totalBoughtValueUSD",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "soldAmounts",
        type: "uint256[]"
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "boughtAmounts",
        type: "uint256[]"
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "soldValuesUSD",
        type: "uint256[]"
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "boughtValuesUSD",
        type: "uint256[]"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "eventNonce",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "eventHeight",
        type: "uint256"
      }
    ],
    name: "Rebalance",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "vault",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "imbalanceThresholdBps",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "maxPriceStaleness",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "rebalanceCooldown",
        type: "uint64"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "maxCapacityUSD",
        type: "uint128"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "hlsBalance",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "eventNonce",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "eventHeight",
        type: "uint256"
      }
    ],
    name: "ParamsUpdated",
    type: "event"
  },
  {
    inputs: [],
    name: "hlsAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_hlsAddress",
        type: "address"
      }
    ],
    name: "setHLSAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "treasury",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_treasury",
        type: "address"
      }
    ],
    name: "setTreasury",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "depositFeeBps",
    outputs: [
      {
        internalType: "uint16",
        name: "",
        type: "uint16"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "_feeBps",
        type: "uint16"
      }
    ],
    name: "setDepositFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "feeSwapConfigs",
    outputs: [
      {
        internalType: "bool",
        name: "enabled",
        type: "bool"
      },
      {
        internalType: "bool",
        name: "isV2",
        type: "bool"
      },
      {
        internalType: "address",
        name: "router",
        type: "address"
      },
      {
        internalType: "address",
        name: "quoter",
        type: "address"
      },
      {
        internalType: "address",
        name: "tokenOut",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "slippageBps",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_depositToken",
        type: "address"
      },
      {
        internalType: "bool",
        name: "_enabled",
        type: "bool"
      },
      {
        internalType: "bool",
        name: "_isV2",
        type: "bool"
      },
      {
        internalType: "address",
        name: "_router",
        type: "address"
      },
      {
        internalType: "address",
        name: "_quoter",
        type: "address"
      },
      {
        internalType: "address[]",
        name: "_pathV2",
        type: "address[]"
      },
      {
        internalType: "bytes",
        name: "_pathV3",
        type: "bytes"
      },
      {
        internalType: "address",
        name: "_tokenOut",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "_slippageBps",
        type: "uint256"
      }
    ],
    name: "setFeeSwapConfig",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
]
