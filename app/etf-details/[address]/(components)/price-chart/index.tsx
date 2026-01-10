"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import { RechartsTooltip } from "@/components/recharts/tooltip"
import { fetchETFChart } from "@/helpers/request"
import { useQuery } from "@tanstack/react-query"
import clsx from "clsx"
import { useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"
import s from "./price-chart.module.scss"

interface ETF {
  symbol: string
  sharePrice: string
  vault: string
}

interface PriceChartProps {
  etf: ETF
  selectedPeriod?: string
  onPeriodChange?: (period: string) => void
}

const periods = [
  { id: "24h", label: "24H" },
  { id: "7d", label: "7D" },
  { id: "1m", label: "1M" },
  { id: "all", label: "All" }
]

const formatChartDate = (timestamp: number, period: string): string => {
  const date = new Date(timestamp)
  
  if (period === "24h") {
    return date.toLocaleTimeString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    })
  }
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  })
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <RechartsTooltip>
        <strong>{data.date}</strong>
        <span>${data.value}</span>
      </RechartsTooltip>
    )
  }
  return null
}

export function PriceChart({
  etf,
  selectedPeriod: externalSelectedPeriod,
  onPeriodChange
}: PriceChartProps) {
  const [internalSelectedPeriod, setInternalSelectedPeriod] = useState("7d")
  const selectedPeriod = externalSelectedPeriod ?? internalSelectedPeriod

  const handlePeriodChange = (period: string) => {
    if (onPeriodChange) {
      onPeriodChange(period)
    } else {
      setInternalSelectedPeriod(period)
    }
  }

  const { data: chartResponse, isLoading } = useQuery({
    queryKey: ["etfChart", etf.vault, selectedPeriod],
    queryFn: () => fetchETFChart(etf.vault, selectedPeriod),
    staleTime: 30 * 1000,
    enabled: !!etf.vault
  })

  const chartData = useMemo(() => {
    if (!chartResponse?.data) return []

    return chartResponse.data.map((point) => ({
      date: formatChartDate(point.timestamp, selectedPeriod),
      value: point.price?.average || 0,
      timestamp: point.timestamp
    }))
  }, [chartResponse, selectedPeriod])

  const getXAxisConfig = () => {
    const dataLength = chartData.length
    const isDense = dataLength > 30

    return {
      interval: "preserveStartEnd" as const,
      minTickGap: isDense ? 40 : 20,
      angle: isDense ? -45 : 0,
      textAnchor: isDense ? "end" : "middle",
      height: isDense ? 60 : 30
    }
  }

  const xAxisConfig = getXAxisConfig()

  const minValue = chartData.length > 0 ? Math.min(...chartData.map((d) => d.value)) : 0
  const maxValue = chartData.length > 0 ? Math.max(...chartData.map((d) => d.value)) : 100
  const padding = (maxValue - minValue) * 0.1

  return (
    <Card className={clsx(s.priceChart, "auto")}>
      <div className={s.header}>
        <Heading
          icon="hugeicons:chart-01"
          title="Price Chart"
          description="Historical price performance over time"
        />
        <div className={s.periodSelector}>
          {periods.map((period) => (
            <Button
              key={period.id}
              variant={selectedPeriod === period.id ? "primary" : "secondary"}
              size="small"
              onClick={() => handlePeriodChange(period.id)}
              isActive={selectedPeriod === period.id}
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>
      <div className={s.chartContainer}>
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 250, color: "var(--text-secondary)" }}>
            Loading chart data...
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 250, color: "var(--text-secondary)" }}>
            No data available for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--primary-medium)"
                    stopOpacity={0.15}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--primary-medium)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--text-secondary)" }}
                tickLine={false}
                axisLine={false}
                {...xAxisConfig}
              />
              <YAxis
                domain={[minValue - padding, maxValue + padding]}
                tick={{ fill: "var(--text-secondary)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary-medium)"
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
              <CartesianGrid stroke="rgba(0,0,0,.05)" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}
