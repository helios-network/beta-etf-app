"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { calculatePositionPrice } from "@/helpers/prediction"
import type { Prediction, TradingMode, PredictionDirection } from "@/types/prediction"
import { useState } from "react"
import clsx from "clsx"
import s from "./trading-sidebar.module.scss"

interface TradingSidebarProps {
  prediction: Prediction
}

export function TradingSidebar({ prediction }: TradingSidebarProps) {
  const [mode, setMode] = useState<TradingMode>("buy")
  const [direction, setDirection] = useState<PredictionDirection>("up")
  const [amount, setAmount] = useState<number>(0)
  const [useShares, setUseShares] = useState(false)

  const upPrice = calculatePositionPrice("up", prediction.upPercentage)
  const downPrice = calculatePositionPrice("down", prediction.upPercentage)

  const currentPrice = direction === "up" ? upPrice : downPrice
  const shares = useShares ? amount : Math.floor(amount / currentPrice)
  const totalCost = useShares ? amount * currentPrice : amount
  const potentialWin = shares

  const balance = 82.88

  const handlePercentage = (percentage: number) => {
    setAmount(balance * (percentage / 100))
  }

  const handleMax = () => {
    setAmount(balance)
  }

  const handleTrade = () => {
    console.log("Trading:", { mode, direction, amount, shares, totalCost })
  }

  return (
    <Card className={clsx(s.tradingSidebar, "auto")}>
      <div className={s.tabs}>
        <button
          className={clsx(s.tab, mode === "buy" && s.active)}
          onClick={() => setMode("buy")}
        >
          Buy
        </button>
        <button
          className={clsx(s.tab, mode === "sell" && s.active)}
          onClick={() => setMode("sell")}
        >
          Sell
        </button>
      </div>

      <div className={s.directionButtons}>
        <button
          className={clsx(s.directionBtn, s.up, direction === "up" && s.active)}
          onClick={() => setDirection("up")}
        >
          <span className={s.directionLabel}>Up</span>
          <span className={s.directionPrice}>{(upPrice * 100).toFixed(0)}¢</span>
        </button>
        <button
          className={clsx(
            s.directionBtn,
            s.down,
            direction === "down" && s.active
          )}
          onClick={() => setDirection("down")}
        >
          <span className={s.directionLabel}>Down</span>
          <span className={s.directionPrice}>{(downPrice * 100).toFixed(0)}¢</span>
        </button>
      </div>

      <div className={s.inputSection}>
        <div className={s.inputHeader}>
          <label className={s.inputLabel}>
            {useShares ? "Shares" : "Amount"}
          </label>
          <button
            className={s.toggleButton}
            onClick={() => setUseShares(!useShares)}
          >
            Switch to {useShares ? "Amount" : "Shares"}
          </button>
        </div>
        <div className={s.balanceInfo}>
          <span className={s.balanceLabel}>Balance</span>
          <span className={s.balanceValue}>${balance.toFixed(2)}</span>
        </div>
        <div className={s.inputWrapper}>
          <span className={s.inputPrefix}>{useShares ? "" : "$"}</span>
          <input
            type="number"
            className={s.input}
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="0"
            min="0"
            step={useShares ? "1" : "0.01"}
          />
        </div>
        <div className={s.quickButtons}>
          <button className={s.quickBtn} onClick={() => handlePercentage(25)}>
            25%
          </button>
          <button className={s.quickBtn} onClick={() => handlePercentage(50)}>
            50%
          </button>
          <button className={s.quickBtn} onClick={() => handlePercentage(75)}>
            75%
          </button>
          <button className={s.quickBtn} onClick={handleMax}>
            Max
          </button>
        </div>
      </div>

      {amount > 0 && (
        <div className={s.winSection}>
          <div className={s.winHeader}>
            <span className={s.winLabel}>
              To win <span className={s.winEmoji}>💸</span>
            </span>
            <span className={s.avgPrice}>
              Avg. Price {(currentPrice * 100).toFixed(0)}¢
            </span>
          </div>
          <div className={s.winAmount}>${potentialWin.toFixed(2)}</div>
        </div>
      )}

      <Button
        variant="primary"
        size="large"
        className={s.tradeButton}
        onClick={handleTrade}
        disabled={amount <= 0}
      >
        {mode === "buy" ? "Buy" : "Sell"} {direction === "up" ? "Up" : "Down"}
      </Button>

      <div className={s.disclaimer}>
        By trading, you agree to the{" "}
        <a href="#" className={s.disclaimerLink}>
          Terms of Use
        </a>
        .
      </div>
    </Card>
  )
}
