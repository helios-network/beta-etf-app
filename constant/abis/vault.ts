export const vaultViewAbi = [
  {
    inputs: [],
    name: "imbalanceThresholdBps",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "vaultConfig",
    outputs: [
      {
        components: [
          {
            internalType: "uint64",
            name: "lastRebalanceTimestamp",
            type: "uint64"
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
        internalType: "struct VaultConfig",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
]
