import { ETFResponse } from "@/helpers/request"
import { ETF } from "@/types/etf"

export function wrangleEtfResponse(etf: ETFResponse): ETF {
  // Convert assets from API to tokens format
  // targetWeightBps: 10000 = 100%, so divide by 100 to get percentage
  const tokens =
    etf.assets?.map((asset) => ({
      symbol: asset.symbol,
      percentage: asset.targetWeightBps / 100,
      tvl: asset.tvl || "0"
    })) || []

  const assets =
    etf.assets?.map((asset) => ({
      token: asset.token,
      symbol: asset.symbol,
      decimals: asset.decimals,
      targetWeightBps: asset.targetWeightBps
    })) || []

  return {
    id: etf._id,
    factory: etf.factory,
    name: etf.name,
    symbol: etf.symbol,
    description: `${etf.name} ETF basket`,
    tvl: etf.tvl,
    totalSupply: etf.totalSupply || "0.000",
    sharePrice: etf.sharePrice || "0.00",
    volumeTradedUSD: etf.volumeTradedUSD || 0,
    dailyVolumeUSD: etf.dailyVolumeUSD || 0,
    apy: "0%", // Not available in API response
    change24h: etf.priceChange24h || 0, // Use priceChange24h from API
    priceChange24h: etf.priceChange24h,
    priceChange30d: etf.priceChange30d,
    priceChange7d: etf.priceChange7d,
    riskLevel: "medium" as const, // Default value
    category: "ETF", // Default category
    tokens,
    price: etf.sharePrice ? `$${etf.sharePrice}` : "$0.00", // Use sharePrice for price display
    vault: etf.vault,
    pricer: etf.pricer,
    shareToken: etf.shareToken,
    depositToken: etf.depositToken,
    depositSymbol: etf.depositSymbol || "TOKEN",
    depositDecimals: etf.depositDecimals || 18,
    chain: etf.chain,
    depositCount: etf.depositCount,
    redeemCount: etf.redeemCount,
    owner: etf.owner || "",
    assets,
    createdAt: etf.createdAt || new Date().toISOString(),
    shareDecimals: etf.shareDecimals || 18
  }
}