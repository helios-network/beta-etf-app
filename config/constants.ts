export const TRUNCATE_START = 5
export const TRUNCATE_END = 4

export const CHAIN_COLORS = {
  ethereum: "#627EEA",
  polygon: "#8248E5",
  helios: "#002dcb",
  bsc: "#F0B90B",
  avalanche: "#E84142",
  solana: "#14F195",
  arbitrum: "#28A0F0",
  base: "#1C1C1C",
  optimism: "#FF0420"
} as const

export const TOKEN_COLORS = {
  ahelios: "#002dcb",
  hls: "#002dcb",
  weth: "#627EEA",
  wusdt: "#26A17B",
  wusdc: "#2775CA",
  wbnb: "#F0B90B",
  wmatic: "#8248E5",
  wavax: "#E84142",
  wsol: "#14F195",
  warb: "#28A0F0",
  wlink: "#2A5ADA",
  wdai: "#F5AC37",
  waave: "#B6509E",
  wuni: "#FF007A",
  wpol: "#7D3EE2"
} as const

export type ChainId = keyof typeof CHAIN_COLORS
export type TokenId = keyof typeof TOKEN_COLORS

export const ASSETS_ADDRS = {
  [1]: { // Ethereum mainnet
    HLS: '0x970a341B4E311A5c7248Dc9c3d8d4f35fEdFA73e',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  [42161]: { // Arbitrum mainnet
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    HLS: '0x4267ac2b815664047855b6c64be5605af9d51304',
  },
};