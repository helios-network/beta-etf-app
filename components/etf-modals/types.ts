export interface ETF {
  factory: string
  id: string
  name: string
  symbol: string
  description: string
  tvl: number
  volumeTradedUSD: number
  dailyVolumeUSD: number
  totalSupply: string
  sharePrice: string
  shareDecimals: number
  apy: string
  change24h: number
  riskLevel: "low" | "medium" | "high"
  category: string
  tokens: Array<{
    symbol: string
    percentage: number
    tvl: string
  }>
  price: string
  vault: string
  pricer: string
  shareToken: string
  depositToken: string
  depositSymbol: string
  depositDecimals: number
  chain: number
  depositCount?: number
  redeemCount?: number
  assets?: Array<{
    token: string
    symbol: string
    decimals: number
    targetWeightBps: number
  }>
  owner: string
  createdAt: string
}
