"use client"

import { Card } from "@/components/card"
import { RechartsTooltip } from "@/components/recharts/tooltip"
import { generateMockPriceData } from "@/helpers/prediction"
import type { Prediction } from "@/types/prediction"
import { useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"
import clsx from "clsx"
import s from "./prediction-chart.module.scss"

interface PredictionChartProps {
  prediction: Prediction
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <RechartsTooltip>
        <strong>{data.date}</strong>
        <span>${data.price.toFixed(2)}</span>
      </RechartsTooltip>
    )
  }
  return null
}

export function PredictionChart({ prediction }: PredictionChartProps) {
  const chartData = useMemo(() => {
    return generateMockPriceData(prediction.currentPrice, 0.003, 60)
  }, [prediction.currentPrice])

  const minValue = Math.min(...chartData.map((d) => d.price))
  const maxValue = Math.max(...chartData.map((d) => d.price))
  const padding = (maxValue - minValue) * 0.15

  const isAboveTarget = prediction.currentPrice > prediction.targetPrice

  return (
    <Card className={clsx(s.predictionChart, "auto")}>
      <div className={s.chartContainer}>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--primary-medium)"
                  stopOpacity={0.2}
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
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
              height={30}
            />
            <YAxis
              domain={[minValue - padding, maxValue + padding]}
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
              width={65}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={prediction.targetPrice}
              stroke="var(--text-secondary)"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `Target: $${prediction.targetPrice.toFixed(2)}`,
                position: "right",
                fill: "var(--text-secondary)",
                fontSize: 12
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="var(--primary-medium)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPrice)"
            />
            <CartesianGrid stroke="rgba(0,0,0,.03)" strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className={s.chartFooter}>
        <div className={s.targetInfo}>
          <span className={s.targetLabel}>Price to Beat:</span>
          <span className={s.targetValue}>
            ${prediction.targetPrice.toFixed(2)}
          </span>
        </div>
        <div className={clsx(s.status, isAboveTarget ? s.up : s.down)}>
          <span className={s.statusDot} />
          <span className={s.statusText}>
            Currently {isAboveTarget ? "Above" : "Below"} Target
          </span>
        </div>
      </div>
    </Card>
  )
}
