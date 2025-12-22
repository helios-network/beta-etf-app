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
      <div className={s.headerTop}>
        <div className={s.swapIcons}>
          <Icon icon="token:usdc" className={s.iconLeft} />
          <Icon icon="hugeicons:arrow-right-01" className={s.swapArrow} />
          <Icon icon="token:ethereum" className={s.iconRight} />
        </div>
      </div>

      <h3 className={s.title}>Buy/Sell ${etf.symbol} onchain</h3>

      <p className={s.description}>
        Our Zap-swaps support common assets like ETH, USDC, USDT, and others,
        which makes DTFs easy to enter and exit.
      </p>

      <div className={s.balanceSection}>
        <div className={s.balanceLabel}>Balance</div>
        <div className={s.balanceInputSection}>
          <span className={s.dollarSign}>$</span>
          <div className={s.balanceFiller}></div>
          <span className={s.balanceAmount}>0.00 {etf.symbol}</span>
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
        >
          Buy
        </Button>
        <button className={s.sellButton}>Sell</button>
      </div>
    </Card>
  )
}
