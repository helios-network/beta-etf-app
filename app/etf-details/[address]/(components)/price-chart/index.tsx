"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
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
  YAxis
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
        <strong>{data.date}</strong>
        <span>${data.value}</span>
      </RechartsTooltip>
    )
  }
  return null
}

export function PriceChart({ etf }: PriceChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("7d")
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

  const minValue = Math.min(...chartData.map((d) => d.value))
  const maxValue = Math.max(...chartData.map((d) => d.value))
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
              onClick={() => setSelectedPeriod(period.id)}
              isActive={selectedPeriod === period.id}
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>
      <div className={s.chartContainer}>
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
      </div>
    </Card>
  )
}
