"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Icon } from "@/components/icon"
import clsx from "clsx"
import s from "./buy-sell-sidebar.module.scss"

interface ETF {
  symbol: string
  sharePrice: string
}

interface BuySellSidebarProps {
  etf: ETF
}

export function BuySellSidebar({ etf }: BuySellSidebarProps) {
  return (
    <Card className={clsx(s.sidebar, "auto")}>
      <div className={s.header}>
        <h3 className={s.title}>Buy/Sell ${etf.symbol} onchain</h3>
        <div className={s.icons}>
          <Icon icon="token:ethereum" className={s.tokenIcon} />
          <Icon icon="token:usdc" className={s.tokenIcon} />
          <Icon icon="token:usdt" className={s.tokenIcon} />
        </div>
      </div>
      <p className={s.description}>
        Our Zap-swaps support common assets like ETH, USDC, USDT, and others,
        which makes DTFs easy to enter and exit.
      </p>
      <div className={s.balance}>
        <div className={s.balanceRow}>
          <span className={s.balanceLabel}>Balance</span>
          <span className={s.balanceValue}>$-.-</span>
        </div>
        <div className={s.balanceRow}>
          <span className={s.balanceLabel}></span>
          <span className={s.balanceValue}>0.00 {etf.symbol}</span>
        </div>
      </div>
      <div className={s.change}>
        <span className={s.changeValue}>↑ $0.00 Past week</span>
      </div>
      <div className={s.actions}>
        <Button
          variant="primary"
          size="medium"
          className={s.buyButton}
          iconLeft="hugeicons:download-01"
        >
          Buy
        </Button>
        <Button
          variant="secondary"
          size="medium"
          className={s.sellButton}
          iconLeft="hugeicons:upload-01"
        >
          Sell
        </Button>
      </div>
    </Card>
  )
}
