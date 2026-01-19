"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Icon } from "@/components/icon"
import { BuyETFModal, SellETFModal } from "@/components/etf-modals"
import { useChainId } from "wagmi"
import { toast } from "sonner"
import { useState } from "react"
import clsx from "clsx"
import s from "./buy-sell-sidebar.module.scss"
import { ETF } from "@/types/etf"

interface BuySellSidebarProps {
  etf: ETF
}

export function BuySellSidebar({ etf }: BuySellSidebarProps) {
  const chainId = useChainId()
  const [buyModalOpen, setBuyModalOpen] = useState(false)
  const [sellModalOpen, setSellModalOpen] = useState(false)

  const handleBuyClick = () => {
    if (chainId !== etf.chain) {
      toast.error(`Please switch to the correct network (Chain ID: ${etf.chain})`)
      return
    }
    setBuyModalOpen(true)
  }

  const handleSellClick = () => {
    if (chainId !== etf.chain) {
      toast.error(`Please switch to the correct network (Chain ID: ${etf.chain})`)
      return
    }
    setSellModalOpen(true)
  }

  return (
    <>
      <Card className={clsx(s.sidebar, "auto")}>
        <div className={s.header}>
          <h3 className={s.title}>Buy/Sell ${etf.symbol} onchain</h3>
          <div className={s.icons}>
            <Icon icon="token:usdc" className={s.tokenIcon} />
          </div>
        </div>
        <p className={s.description}>
          Our Buy/Sell-swaps support common asset USDC,
          which makes ETFs easy to enter and exit.
        </p>
        <div className={s.actions}>
          <Button
            variant="primary"
            size="medium"
            className={s.buyButton}
            iconLeft="hugeicons:download-01"
            onClick={handleBuyClick}
          >
            Buy
          </Button>
          <Button
            variant="secondary"
            size="medium"
            className={s.sellButton}
            iconLeft="hugeicons:upload-01"
            onClick={handleSellClick}
          >
            Sell
          </Button>
        </div>
      </Card>

      <BuyETFModal
        open={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
        etf={etf}
      />
      <SellETFModal
        open={sellModalOpen}
        onClose={() => setSellModalOpen(false)}
        etf={etf}
      />
    </>
  )
}
