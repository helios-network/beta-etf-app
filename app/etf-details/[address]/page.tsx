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
import { formatTokenAmount, formatTotalMarketCap } from "@/lib/utils/number"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import clsx from "clsx"
import s from "./page.module.scss"
import { wrangleEtfResponse } from "@/utils/etf"
import { ETF } from "@/types/etf"

function formatETFResponse(etf: ETFResponse): ETF {
  return {
    ...wrangleEtfResponse(etf),
    description: etf.name ? `${etf.name} ETF basket` : "ETF basket",
    totalSupply: etf.totalSupply || "0",
    price: etf.sharePrice || "0.00",
    apy: "0.00",
    category: "DeFi",
  }
}

export default function ETFDetailsPage() {
  const params = useParams()
  const vaultAddress = params?.address as string
  const [selectedPeriod, setSelectedPeriod] = useState("7d")

  const {
    data: etfData,
    isLoading,
    error
  } = useQuery({
    queryKey: ["etf", vaultAddress],
    queryFn: () => fetchETFByVaultAddress(vaultAddress),
    staleTime: 30 * 1000,
    enabled: !!vaultAddress
  })

  const etf = useMemo(() => {
    if (!etfData?.data || !vaultAddress) return null

    return formatETFResponse(etfData.data)
  }, [etfData, vaultAddress])

  const getPriceChange = (period: string): number | undefined => {
    switch (period) {
      case "24h":
        return etf?.priceChange24h
      case "7d":
        return etf?.priceChange7d
      case "1m":
        return etf?.priceChange30d
      case "all":
        return etf?.priceChange24h
      default:
        return etf?.priceChange24h
    }
  }

  const getPeriodLabel = (period: string): string => {
    switch (period) {
      case "24h":
        return "24h"
      case "7d":
        return "7d"
      case "1m":
        return "1m"
      case "all":
        return "24h"
      default:
        return "24h"
    }
  }

  if (isLoading) {
    return <DataState type="loading" message="Loading ETF details..." />
  }

  if (error || !etf) {
    return (
      <DataState
        type="error"
        message={
          error
            ? error instanceof Error
              ? error.message
              : "Failed to load ETF"
            : "ETF not found"
        }
      />
    )
  }

  const chainConfig = CHAIN_CONFIG[etf.chain]
  const isCreator = true
  const priceChange = getPriceChange(selectedPeriod) ?? 0
  const periodLabel = getPeriodLabel(selectedPeriod)

  return (
    <div className={s.page}>
      <div className={s.container}>
        <div className={s.mainContent}>
          <div className={s.header}>
            <div className={s.titleSection}>
              <h1 className={s.title}>{etf.name}</h1>
              <div className={s.priceInfo}>
                <span className={s.price}>
                  ${formatTokenAmount(etf.sharePrice)}
                </span>
                <span
                  className={clsx(
                    s.priceChange,
                    priceChange >= 0 ? s.positive : s.negative
                  )}
                >
                  {priceChange >= 0 ? "+" : ""}
                  {priceChange.toFixed(2)}% ({periodLabel})
                </span>
              </div>
            </div>
            <div className={s.totalMarketCapSection}>
              <div className={s.totalMarketCapSectionLabel}>
                Total Market Cap
              </div>
              <div className={s.totalMarketCapSectionText}>
                ${" "}
                {formatTotalMarketCap(
                  etf.totalSupply,
                  etf.sharePrice,
                  etf.shareDecimals
                )}
              </div>
            </div>
          </div>

          <PriceChart
            etf={etf}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />

          <TokenComposition etf={etf} />

          <AboutSection
            etf={etf}
            isCreator={isCreator}
            chainConfig={chainConfig}
          />

          <BasketGovernance etf={etf} chainConfig={chainConfig} />

          <Disclosures />
        </div>

        <aside className={s.sidebar}>
          <BuySellSidebar etf={etf} />
        </aside>
      </div>
    </div>
  )
}
