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
        indexed: true,
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
        name: "depositTokenAndDepositFeedAndRouter",
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
        internalType: "address[][]",
        name: "depositPaths",
        type: "address[][]"
      },
      {
        internalType: "address[][]",
        name: "withdrawPaths",
        type: "address[][]"
      },
      {
        internalType: "string",
        name: "name",
        type: "string"
      },
      {
        internalType: "string",
        name: "symbol",
        type: "string"
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
      }
    ],
    name: "deposit",
    outputs: [],
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
      }
    ],
    name: "redeem",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "vault",
        type: "address"
      }
    ],
    name: "rebalance",
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
        internalType: "uint256",
        name: "fromIndex",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "toIndex",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "moveValue",
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
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "bought",
        type: "uint256"
      }
    ],
    name: "Rebalance",
    type: "event"
  }
]

