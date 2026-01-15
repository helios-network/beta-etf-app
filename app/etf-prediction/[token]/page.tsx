"use client"

import {
  PredictionChart,
  TradingSidebar,
  PredictionList
} from "./(components)"
import { DataState } from "@/components/data-state"
import { Icon } from "@/components/icon"
import {
  getPredictionByToken,
  calculateTimeRemaining,
  formatTimeUnit
} from "@/helpers/prediction"
import { fetchETFByVaultAddress } from "@/helpers/request"
import { useParams } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import clsx from "clsx"
import s from "./page.module.scss"

export default function PredictionPage() {
  const params = useParams()
  const token = params?.token as string
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0, total: 0 })

  const isAddress = Boolean(token && token.startsWith("0x"))
  
  const { data: etfData, isLoading: isLoadingETF } = useQuery({
    queryKey: ["etf-prediction", token],
    queryFn: () => fetchETFByVaultAddress(token),
    enabled: isAddress,
    retry: false,
    staleTime: 30 * 1000
  })

  const prediction = useMemo(() => {
    const now = new Date()
    const expiryDate = new Date(now.getTime() + 19 * 60 * 60 * 1000 + 28 * 60 * 1000)
    
    const mockPrediction = getPredictionByToken(token)
    if (mockPrediction) {
      return mockPrediction
    }
    
    if (etfData?.data) {
      const etf = etfData.data
      return {
        token: etf.symbol || "TOKEN",
        symbol: etf.name || "Token",
        currentPrice: parseFloat(etf.sharePrice || "147.35"),
        targetPrice: parseFloat(etf.sharePrice || "147.35") - 0.36,
        expiryDate,
        upPercentage: 51,
        downPercentage: 49,
        totalVolume: 1200,
        priceChange: 0.36,
        priceChangePercentage: 0.24
      }
    }
    
    let displayToken = token || "TOKEN"
    let displaySymbol = token || "Token"
    
    if (token && !token.startsWith("0x")) {
      displayToken = token.toUpperCase()
      displaySymbol = token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
    }
    
    return {
      token: displayToken,
      symbol: displaySymbol,
      currentPrice: 147.35,
      targetPrice: 146.99,
      expiryDate,
      upPercentage: 51,
      downPercentage: 49,
      totalVolume: 1200,
      priceChange: 0.36,
      priceChangePercentage: 0.24
    }
  }, [token, etfData])

  useEffect(() => {
    if (!prediction) return

    const updateTimer = () => {
      const remaining = calculateTimeRemaining(prediction.expiryDate)
      setTimeRemaining(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [prediction])

  const isPositive = prediction.priceChangePercentage >= 0

  if (isAddress && isLoadingETF) {
    return <DataState type="loading" message="Loading prediction market..." />
  }

  return (
    <div className={s.page}>
      <div className={s.container}>
        <div className={s.mainContent}>
          <div className={s.header}>
            <div className={s.titleSection}>
              <div className={s.titleContent}>
                <h1 className={s.title}>
                  {prediction.symbol} Up or Down on{" "}
                  {prediction.expiryDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric"
                  })}
                  ?
                </h1>
              </div>
              <div className={s.countdown}>
                <span className={s.countdownLabel}>Time Remaining</span>
                <div className={s.countdownTime}>
                  <div className={s.timeUnit}>
                    <span className={s.timeValue}>
                      {formatTimeUnit(timeRemaining.hours)}
                    </span>
                    <span className={s.timeLabel}>HRS</span>
                  </div>
                  <span className={s.timeSeparator}>:</span>
                  <div className={s.timeUnit}>
                    <span className={s.timeValue}>
                      {formatTimeUnit(timeRemaining.minutes)}
                    </span>
                    <span className={s.timeLabel}>MINS</span>
                  </div>
                  <span className={s.timeSeparator}>:</span>
                  <div className={s.timeUnit}>
                    <span className={s.timeValue}>
                      {formatTimeUnit(timeRemaining.seconds)}
                    </span>
                    <span className={s.timeLabel}>SECS</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={s.priceSection}>
              <div className={s.priceCard}>
                <span className={s.priceLabel}>Current Price</span>
                <span className={s.priceValue}>
                  ${prediction.currentPrice.toFixed(2)}
                </span>
                <span
                  className={clsx(
                    s.priceChange,
                    isPositive ? s.positive : s.negative
                  )}
                >
                  <Icon
                    icon={
                      isPositive
                        ? "hugeicons:arrow-up-01"
                        : "hugeicons:arrow-down-01"
                    }
                  />
                  {isPositive ? "+" : ""}
                  {prediction.priceChangePercentage.toFixed(2)}%
                </span>
              </div>
              <div className={s.priceCard}>
                <span className={s.priceLabel}>Price to Beat</span>
                <span className={s.priceValue}>
                  ${prediction.targetPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <PredictionChart prediction={prediction} />
        </div>

        <aside className={s.sidebar}>
          <TradingSidebar prediction={prediction} />
          <PredictionList currentToken={token} />
        </aside>
      </div>
    </div>
  )
}
