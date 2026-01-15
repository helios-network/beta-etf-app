"use client"

import { Card } from "@/components/card"
import { Icon } from "@/components/icon"
import { Link } from "@/components/link"
import { getMockPredictions } from "@/helpers/prediction"
import type { Prediction } from "@/types/prediction"
import clsx from "clsx"
import s from "./prediction-list.module.scss"

interface PredictionListProps {
  currentToken?: string
}

export function PredictionList({ currentToken }: PredictionListProps) {
  const predictions = getMockPredictions()

  return (
    <Card className={clsx(s.predictionList, "auto")}>
      <div className={s.header}>
        <h3 className={s.title}>Other Markets</h3>
      </div>
      <div className={s.list}>
        {predictions.map((prediction) => (
          <PredictionItem
            key={prediction.token}
            prediction={prediction}
            isActive={prediction.token === currentToken}
          />
        ))}
      </div>
    </Card>
  )
}

interface PredictionItemProps {
  prediction: Prediction
  isActive: boolean
}

function PredictionItem({ prediction, isActive }: PredictionItemProps) {
  const isUp = prediction.upPercentage > 50
  
  const knownTokens = ['sol', 'btc', 'eth', 'xrp', 'bnb', 'ada', 'doge', 'matic', 'dot', 'avax']
  const hasIcon = knownTokens.includes(prediction.token.toLowerCase())

  return (
    <Link
      href={`/etf-prediction/${prediction.token}`}
      className={clsx(s.item, isActive && s.active)}
    >
      <div className={s.tokenInfo}>
        <div className={s.iconWrapper}>
          {hasIcon ? (
            <Icon icon={`cryptocurrency:${prediction.token.toLowerCase()}`} className={s.icon} />
          ) : (
            <span className={s.iconPlaceholder}>{prediction.token.substring(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className={s.details}>
          <span className={s.symbol}>{prediction.symbol}</span>
          <span className={s.token}>{prediction.token}</span>
        </div>
      </div>
      <div className={s.priceInfo}>
        <div className={clsx(s.percentage, isUp ? s.up : s.down)}>
          <span className={s.percentageValue}>{prediction.upPercentage}%</span>
          <span className={s.direction}>{isUp ? "Up" : "Down"}</span>
        </div>
        <div className={s.arrow}>
          <Icon
            icon={isUp ? "hugeicons:arrow-up-01" : "hugeicons:arrow-down-01"}
            className={clsx(s.arrowIcon, isUp ? s.up : s.down)}
          />
        </div>
      </div>
    </Link>
  )
}
