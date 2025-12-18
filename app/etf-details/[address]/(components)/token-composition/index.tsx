"use client"

import { useState } from "react"
import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import Image from "next/image"
import { fetchCGTokenData } from "@/utils/price"
import { useQuery } from "@tanstack/react-query"
import clsx from "clsx"
import s from "./token-composition.module.scss"

interface Token {
  symbol: string
  percentage: number
  tvl?: string
}

interface ETF {
  symbol: string
  shareToken?: string
  tokens?: Token[]
}

interface TokenCompositionProps {
  etf: ETF
}

const periods = [
  { id: "24h", label: "24H" },
  { id: "7d", label: "7D" },
  { id: "1m", label: "1M" },
  { id: "all", label: "All" }
]

const tabTypes = [
  { id: "exposure", label: "Exposure" },
  { id: "collateral", label: "Collateral" }
]

export function TokenComposition({ etf }: TokenCompositionProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("7d")
  const [selectedTab, setSelectedTab] = useState("exposure")
  const tokens = etf.tokens || []

  const allTokenSymbols = tokens.map(t => t.symbol.toLowerCase())
  
  const { data: tokenData = {} } = useQuery({
    queryKey: ["tokenData", "composition", allTokenSymbols],
    queryFn: () => fetchCGTokenData(allTokenSymbols),
    enabled: allTokenSymbols.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  if (tokens.length === 0) {
    return null
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const generatePriceChange = () => {
    return (Math.random() * 20 - 10).toFixed(2)
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value)
    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`
    return `$${num.toFixed(0)}`
  }

  return (
    <Card className={clsx(s.composition, "auto")}>
      <div className={s.header}>
        <Heading
          icon="hugeicons:package"
          title="Composition"
          description={`Portfolio allocation across ${tokens.length} digital assets`}
        />
        <div className={s.headerRight}>
          <div className={s.periodSelector}>
            {periods.map((period) => (
              <Button
                key={period.id}
                variant={selectedPeriod === period.id ? "primary" : "secondary"}
                size="small"
                onClick={() => setSelectedPeriod(period.id)}
              >
                {period.label}
              </Button>
            ))}
          </div>
          {etf.shareToken && (
            <button className={s.addressButton}>
              <span className={s.addressIcon}>💠</span>
              <span>{formatAddress(etf.shareToken)}</span>
              <Icon icon="hugeicons:chevron-down" className={s.chevron} />
            </button>
          )}
        </div>
      </div>

      <div className={s.tabs}>
        {tabTypes.map((tab) => (
          <button
            key={tab.id}
            className={clsx(s.tab, selectedTab === tab.id && s.active)}
            onClick={() => setSelectedTab(tab.id)}
          >
            <Icon icon={tab.id === "exposure" ? "hugeicons:eye-01" : "hugeicons:shield-01"} className={s.tabIcon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={s.tableContainer}>
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.assetCol}>Asset</th>
              <th className={s.weightCol}>
                Weight
                <Icon icon="hugeicons:arrow-down-01" className={s.sortIcon} />
              </th>
              <th className={s.changeCol}>
                <span>Price Change ({periods.find(p => p.id === selectedPeriod)?.label})</span>
                <Icon icon="hugeicons:arrow-down-01" className={s.sortIcon} />
              </th>
              <th className={s.marketCapCol}>Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => {
              const logo = tokenData[token.symbol.toLowerCase()]?.logo
              const priceChange = generatePriceChange()
              const marketCap = token.tvl || "0"

              return (
                <tr key={token.symbol} className={s.row}>
                  <td className={s.assetCell}>
                    <div className={s.assetInfo}>
                      {logo ? (
                        <Image
                          src={logo}
                          alt={token.symbol}
                          className={s.tokenLogo}
                          width={32}
                          height={32}
                        />
                      ) : (
                        <div className={s.tokenPlaceholder}>
                          {token.symbol.charAt(0)}
                        </div>
                      )}
                      <div className={s.assetDetails}>
                        <span className={s.tokenName}>{token.symbol}</span>
                        <span className={s.tokenSymbolSmall}>${token.symbol}</span>
                      </div>
                    </div>
                  </td>
                  <td className={s.weightCell}>
                    <span className={s.weight}>{token.percentage.toFixed(2)}%</span>
                  </td>
                  <td className={s.changeCell}>
                    <span className={clsx(s.change, parseFloat(priceChange) >= 0 ? s.positive : s.negative)}>
                      {parseFloat(priceChange) >= 0 ? "+" : ""}{priceChange}%
                    </span>
                  </td>
                  <td className={s.marketCapCell}>
                    <span className={s.marketCap}>{formatCurrency(marketCap)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}



