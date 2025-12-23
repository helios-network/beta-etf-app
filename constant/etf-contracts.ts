import { HELIOS_NETWORK_ID, ETHEREUM_NETWORK_ID, ARBITRUM_NETWORK_ID } from "@/config/app"

export const ETF_FACTORY_CONTRACT_ADDRESS = {
  [HELIOS_NETWORK_ID]: "0x0000000000000000000000000000000000000000",
  [ETHEREUM_NETWORK_ID]: "0x0000000000000000000000000000000000000000",
  [ARBITRUM_NETWORK_ID]: "0x0000000000000000000000000000000000000000",
}

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
  }
]

