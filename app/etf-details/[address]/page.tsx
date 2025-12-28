"use client"

import { AboutSection } from "./(components)/about-section"
import { BasketGovernance } from "./(components)/basket-governance"
import { Disclosures } from "./(components)/disclosures"
import { PriceChart } from "./(components)/price-chart"
import { TokenComposition } from "./(components)/token-composition"
import { BuySellSidebar } from "./(components)/buy-sell-sidebar"
import { CHAIN_CONFIG } from "@/config/chain-config"
import { useParams } from "next/navigation"
import { fetchETFByVaultAddress, type ETFResponse } from "@/helpers/request"
import { DataState } from "@/components/data-state"
import { formatTokenAmount } from "@/lib/utils/number"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { type ETF } from "@/components/etf-modals"
import s from "./page.module.scss"

function formatETFResponse(etf: ETFResponse): ETF {
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
    description: etf.name ? `${etf.name} ETF basket` : "ETF basket",
    tvl: etf.tvl,
    totalSupply: etf.totalSupply || "0.000",
    sharePrice: etf.sharePrice || "0.00",
    price: etf.sharePrice || "0.00",
    volumeTradedUSD: etf.volumeTradedUSD || 0,
    dailyVolumeUSD: etf.dailyVolumeUSD || 0,
    apy: "0.00",
    change24h: 0,
    riskLevel: "medium" as const,
    category: "DeFi",
    createdAt: etf.createdAt || new Date().toISOString(),
    tokens,
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
    assets
  }
}

export default function ETFDetailsPage() {
  const params = useParams()
  const vaultAddress = params?.address as string

  const { data: etfData, isLoading, error } = useQuery({
    queryKey: ["etf", vaultAddress],
    queryFn: () => fetchETFByVaultAddress(vaultAddress),
    staleTime: 30 * 1000,
    enabled: !!vaultAddress
  })

  const etf = useMemo(() => {
    if (!etfData?.data || !vaultAddress) return null


    return formatETFResponse(etfData.data)
  }, [etfData, vaultAddress])

  if (isLoading) {
    return <DataState type="loading" message="Loading ETF details..." />
  }

  if (error || !etf) {
    return <DataState type="error" message={error ? (error instanceof Error ? error.message : "Failed to load ETF") : "ETF not found"} />
  }

  const chainConfig = CHAIN_CONFIG[etf.chain]
  const isCreator = true

  return (
    <div className={s.page}>
      <div className={s.container}>
        <div className={s.mainContent}>
          <div className={s.header}>
            <div className={s.titleSection}>
              <h1 className={s.title}>{etf.name}</h1>
              <div className={s.priceInfo}>
                <span className={s.price}>${formatTokenAmount(etf.sharePrice)}</span>
                <span className={s.priceChange}>-9.38% (7d)</span>
              </div>
            </div>
          </div>

          <PriceChart etf={etf} />

          <TokenComposition etf={etf} />

          <AboutSection
            etf={etf}
            isCreator={isCreator}
            chainConfig={chainConfig}
          />

          <BasketGovernance
            etf={etf}
            chainConfig={chainConfig}
          />

          <Disclosures />
        </div>

        <aside className={s.sidebar}>
          <BuySellSidebar etf={etf} />
        </aside>
      </div>
    </div>
  )
}
