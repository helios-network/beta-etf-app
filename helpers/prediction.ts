import type { PriceDataPoint, TimeRemaining, Prediction } from "@/types/prediction"

export function generateMockPriceData(
  basePrice: number,
  volatility: number = 0.02,
  dataPoints: number = 60
): PriceDataPoint[] {
  const data: PriceDataPoint[] = []
  const now = Date.now()
  const intervalMs = (60 * 1000) / dataPoints

  let currentPrice = basePrice

  for (let i = 0; i < dataPoints; i++) {
    const change = (Math.random() - 0.5) * 2 * volatility * basePrice
    currentPrice = Math.max(currentPrice + change, basePrice * 0.95)

    const timestamp = now - (dataPoints - i) * intervalMs
    const date = new Date(timestamp)

    data.push({
      timestamp,
      price: currentPrice,
      date: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      })
    })
  }

  return data
}

export function calculateTimeRemaining(expiryDate: Date): TimeRemaining {
  const now = new Date().getTime()
  const expiry = expiryDate.getTime()
  const total = Math.max(0, expiry - now)

  const hours = Math.floor(total / (1000 * 60 * 60))
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((total % (1000 * 60)) / 1000)

  return {
    hours,
    minutes,
    seconds,
    total
  }
}

export function formatPredictionDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }

  return date.toLocaleString("en-US", options)
}

export function calculatePredictionOdds(
  upVolume: number,
  downVolume: number
): { upPercentage: number; downPercentage: number } {
  const total = upVolume + downVolume

  if (total === 0) {
    return { upPercentage: 50, downPercentage: 50 }
  }

  const upPercentage = Math.round((upVolume / total) * 100)
  const downPercentage = 100 - upPercentage

  return { upPercentage, downPercentage }
}

export function getMockPredictions(): Prediction[] {
  const now = new Date()
  const expiryDate = new Date(now.getTime() + 19 * 60 * 60 * 1000 + 28 * 60 * 1000)

  return [
    {
      token: "SOL",
      symbol: "Solana",
      currentPrice: 147.35,
      targetPrice: 146.99,
      expiryDate,
      upPercentage: 51,
      downPercentage: 49,
      totalVolume: 1200,
      priceChange: 0.36,
      priceChangePercentage: 0.24
    },
    {
      token: "BTC",
      symbol: "Bitcoin",
      currentPrice: 43250.0,
      targetPrice: 43100.0,
      expiryDate,
      upPercentage: 55,
      downPercentage: 45,
      totalVolume: 2500,
      priceChange: 150.0,
      priceChangePercentage: 0.35
    },
    {
      token: "ETH",
      symbol: "Ethereum",
      currentPrice: 2345.67,
      targetPrice: 2320.0,
      expiryDate,
      upPercentage: 56,
      downPercentage: 44,
      totalVolume: 1800,
      priceChange: 25.67,
      priceChangePercentage: 1.1
    },
    {
      token: "XRP",
      symbol: "XRP",
      currentPrice: 0.534,
      targetPrice: 0.528,
      expiryDate,
      upPercentage: 46,
      downPercentage: 54,
      totalVolume: 950,
      priceChange: 0.006,
      priceChangePercentage: 1.14
    }
  ]
}

export function getPredictionByToken(token: string): Prediction | undefined {
  const predictions = getMockPredictions()
  return predictions.find((p) => p.token.toLowerCase() === token.toLowerCase())
}

export function calculatePositionPrice(
  direction: "up" | "down",
  upPercentage: number
): number {
  if (direction === "up") {
    return upPercentage / 100
  } else {
    return (100 - upPercentage) / 100
  }
}

export function formatTimeUnit(value: number): string {
  return value.toString().padStart(2, "0")
}
