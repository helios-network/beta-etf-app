"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import { RechartsTooltip } from "@/components/recharts/tooltip"
import clsx from "clsx"
import { useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart
} from "recharts"
import s from "./price-chart.module.scss"

interface ETF {
  symbol: string
  sharePrice: string
}

interface PriceChartProps {
  etf: ETF
}

const periods = [
  { id: "24h", label: "24H" },
  { id: "7d", label: "7D" },
  { id: "1m", label: "1M" },
  { id: "all", label: "All" }
]

const generateFakeData = (period: string) => {
  const data = []
  const now = new Date()
  let days = 7

  if (period === "24h") days = 1
  else if (period === "7d") days = 7
  else if (period === "1m") days = 30
  else days = 90

  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const value = 170 + Math.random() * 20
    data.push({
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      }),
      value: parseFloat(value.toFixed(2))
    })
  }

  return data
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <RechartsTooltip>
        <div className={s.tooltipContent}>
          <strong>{data.date}</strong>
          <span>${data.value.toFixed(2)}</span>
        </div>
      </RechartsTooltip>
    )
  }
  return null
}

export function PriceChart({ etf }: PriceChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("7d")
  const [chartType, setChartType] = useState<"area" | "line">("area")
  const chartData = generateFakeData(selectedPeriod)

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

  const values = chartData.map((d) => d.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const padding = (maxValue - minValue) * 0.1
  const currentPrice = parseFloat(etf.sharePrice)
  const firstPrice = chartData[0]?.value || currentPrice
  const lastPrice = chartData[chartData.length - 1]?.value || currentPrice
  const priceChange = lastPrice - firstPrice
  const priceChangePercent = ((priceChange / firstPrice) * 100).toFixed(2)
  const high = maxValue.toFixed(2)
  const low = minValue.toFixed(2)
  const volatility = (((maxValue - minValue) / currentPrice) * 100).toFixed(2)

  return (
    <Card className={clsx(s.priceChart, "auto")}>
      <div className={s.header}>
        <div>
          <Heading
            icon="hugeicons:chart-01"
            title="Price Chart"
            description="Historical price performance and analytics"
          />
        </div>
        <div className={s.headerControls}>
          <div className={s.toggleGroup}>
            <span className={s.toggleLabel}>Chart Type</span>
            <div className={s.chartTypeToggle}>
              <button
                className={clsx(s.toggleBtn, chartType === "area" && s.active)}
                onClick={() => setChartType("area")}
                title="Area Chart"
              >
                <Icon icon="hugeicons:square-01" />
                <span className={s.toggleBtnLabel}>Area</span>
              </button>
              <button
                className={clsx(s.toggleBtn, chartType === "line" && s.active)}
                onClick={() => setChartType("line")}
                title="Line Chart"
              >
                <Icon icon="hugeicons:line-chart-01" />
                <span className={s.toggleBtnLabel}>Line</span>
              </button>
            </div>
          </div>
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
        </div>
      </div>

      <div className={s.statsGrid}>
        <div className={s.statCard}>
          <div className={s.statLabel}>Current Price</div>
          <div className={s.statValue}>${currentPrice.toFixed(2)}</div>
        </div>

        <div className={s.statCard}>
          <div className={s.statLabel}>Period Change</div>
          <div className={clsx(s.statValue, priceChange >= 0 ? s.positive : s.negative)}>
            {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)} ({priceChangePercent}%)
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statLabel}>24h High / Low</div>
          <div className={s.statValue}>
            <span className={s.highLow}>
              ${high} / ${low}
            </span>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statLabel}>Volatility</div>
          <div className={s.statValue} style={{ color: "rgba(67, 133, 245, 0.7)" }}>
            {volatility}%
          </div>
        </div>
      </div>

      <div className={s.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          {chartType === "area" ? (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="rgba(67, 133, 245, 0.2)"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor="rgba(67, 133, 245, 0.2)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(0,0,0,.05)" strokeDasharray="5 5" />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--text-secondary)", fontSize: 14 }}
                tickLine={false}
                axisLine={false}
                {...xAxisConfig}
              />
              <YAxis
                domain={[minValue - padding, maxValue + padding]}
                tick={{ fill: "var(--text-secondary)", fontSize: 14 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="rgba(67, 133, 245, 0.8)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid stroke="rgba(0,0,0,.05)" strokeDasharray="5 5" />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--text-secondary)", fontSize: 14 }}
                tickLine={false}
                axisLine={false}
                {...xAxisConfig}
              />
              <YAxis
                domain={[minValue - padding, maxValue + padding]}
                tick={{ fill: "var(--text-secondary)", fontSize: 14 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="rgba(67, 133, 245, 0.9)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
