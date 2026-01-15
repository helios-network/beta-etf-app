export interface Prediction {
  token: string
  symbol: string
  currentPrice: number
  targetPrice: number
  expiryDate: Date
  upPercentage: number
  downPercentage: number
  totalVolume: number
  priceChange: number
  priceChangePercentage: number
}

export interface PredictionPosition {
  direction: "up" | "down"
  amount: number
  entryPrice: number
  currentValue: number
  pnl: number
}

export interface PriceDataPoint {
  timestamp: number
  price: number
  date: string
}

export interface TimeRemaining {
  hours: number
  minutes: number
  seconds: number
  total: number
}

export type PredictionDirection = "up" | "down"
export type TradingMode = "buy" | "sell"
