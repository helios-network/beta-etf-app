export interface PointsData {
  season1: number
  season2: number
  season3: number
}

export interface TransactionCounts {
  createEtf: number
  deposit: number
  redeem: number
  rebalance: number
}

export interface PointsByType {
  createEtf: number
  deposit: number
  redeem: number
  rebalance: number
}

export interface LeaderboardEntry {
  rank: number
  address: string
  feesGenerated: string
  volumeTradedUSD: string
  transactionsPerformed: number
  referralPoints: number
  iaaStPoints: number
  tvl: number
  avgTransactionSize: string
  pointsPerTransaction: string
  lastActivity: string | null
  transactionCounts?: TransactionCounts
  pointsByType?: PointsByType
  totalPoints?: number
}
