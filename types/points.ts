export interface PointsData {
  season1: number
  season2: number
  season3: number
}

export interface LeaderboardEntry {
  rank: number
  address: string
  totalPointsAccrued: number
  feesGenerated: string
  volumeTraded: string
  transactionsPerformed: number
  referralPoints: number
  iaaStPoints: number
}
