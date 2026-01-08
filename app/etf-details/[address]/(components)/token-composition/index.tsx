"use client"

import { useState } from "react"
import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import { Button } from "@/components/button"
import Image from "next/image"
import { fetchCGTokenData } from "@/utils/price"
import { useQuery } from "@tanstack/react-query"
import clsx from "clsx"
import { createPortal } from "react-dom"
import { useEventListener } from "usehooks-ts"

import s from "./token-composition.module.scss"
import { formatTokenAmount } from "@/lib/utils/number"

interface Token {
  symbol: string
  percentage: number
  tvl?: string
}

interface ETF {
  symbol: string
  tokens?: Token[]
}

interface TokenCompositionProps {
  etf: ETF
}

export function TokenComposition({ etf }: TokenCompositionProps) {
  const [showAll, setShowAll] = useState(false)
  const tokens = etf.tokens || []
  const displayedTokens = showAll ? tokens : tokens.slice(0, 10)
  const [hoveredToken, setHoveredToken] = useState<{
    targetPercentage: number
    currentPercentage: number
    tvl: string
  } | null>(null)
  const allTokenSymbols = tokens.map((t) => t.symbol.toLowerCase())

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEventListener("mousemove", (e: MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY })
  })

  const { data: tokenData = {} } = useQuery({
    queryKey: ["tokenData", "composition", allTokenSymbols],
    queryFn: () => fetchCGTokenData(allTokenSymbols),
    enabled: allTokenSymbols.length > 0,
    staleTime: 5 * 60 * 1000
  })

  if (tokens.length === 0) {
    return null
  }

  const totalTVL = tokens.reduce((sum, t) => sum + parseFloat(t.tvl || "0"), 0)

  return (
    <Card className={clsx(s.composition, "auto")}>
      <Heading
        icon="hugeicons:package"
        title="Composition"
        description={`Portfolio allocation across ${tokens.length} digital assets`}
      />

      <div className={s.tokens}>
        {displayedTokens.map((token) => {
          const currentPercentage =
            totalTVL > 0 && token.tvl
              ? (parseFloat(token.tvl) / totalTVL) * 100
              : token.percentage
          const targetPercentage = token.percentage

          const logo = tokenData[token.symbol.toLowerCase()]?.logo

          return (
            <div
              key={token.symbol}
              className={s.token}
              onMouseEnter={() => {
                setHoveredToken({
                  targetPercentage,
                  currentPercentage,
                  tvl: token.tvl || "0"
                })
              }}
              onMouseLeave={() => {
                setHoveredToken(null)
              }}
            >
              <div className={s.tokenInfo}>
                {logo ? (
                  <Image
                    src={logo}
                    alt={token.symbol}
                    className={s.tokenLogo}
                    width={24}
                    height={24}
                  />
                ) : (
                  <div className={s.tokenIconPlaceholder}>
                    {token.symbol.charAt(0)}
                  </div>
                )}
                <span className={s.tokenSymbol}>{token.symbol}</span>
              </div>
              <div className={s.percentageBar}>
                <div
                  className={s.percentageFill}
                  style={{ width: `${targetPercentage}%` }}
                  title={`Target: ${targetPercentage.toFixed(2)}%`}
                />
                <div
                  className={s.currentMarker}
                  style={{ left: `${currentPercentage}%` }}
                  title={`Current: ${currentPercentage.toFixed(2)}%`}
                />
              </div>
              <span className={s.percentage}>{targetPercentage}%</span>
            </div>
          )
        })}
      </div>

      {tokens.length > 10 && (
        <div className={s.viewAll}>
          <Button
            variant="secondary"
            size="small"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show less" : `See all ${tokens.length} assets`}
          </Button>
        </div>
      )}
      {hoveredToken &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className={s.tokenTooltipFixed}
            style={{
              left: `${mousePosition.x + 10}px`,
              top: `${mousePosition.y + 10}px`
            }}
          >
            <div className={s.tooltipContent}>
              <div>
                Target:{" "}
                <strong>{hoveredToken.targetPercentage.toFixed(2)}%</strong>
              </div>
              <div>
                Current:{" "}
                <strong>{hoveredToken.currentPercentage.toFixed(2)}%</strong>
              </div>
              <div>
                TVL: <strong>${formatTokenAmount(hoveredToken.tvl)}</strong>
              </div>
            </div>
          </div>,
          document.body
        )}
    </Card>
  )
}
