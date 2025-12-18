"use client"

import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import { Button } from "@/components/button"
import { ChainConfig } from "@/config/chain-config"
import { formatHash } from "@/utils/string"
import { toast } from "sonner"
import clsx from "clsx"
import s from "./basket-governance.module.scss"

interface ETF {
  vault: string
  pricer: string
  shareToken: string
  chain: number
  latestRebalanceDate?: string
}

interface BasketGovernanceProps {
  etf: ETF
  chainConfig?: ChainConfig
}

interface AddressItemProps {
  label: string
  address: string
  explorerUrl?: string
}

function AddressItem({ label, address, explorerUrl }: AddressItemProps) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(address)
    toast.success("Address copied to clipboard")
  }

  const openExplorer = () => {
    if (explorerUrl) {
      window.open(`${explorerUrl}/address/${address}`, "_blank")
    }
  }

  return (
    <div className={s.infoItem}>
      <div className={s.infoHeader}>
        <span className={s.label}>{label}</span>
        <div className={s.actions}>
          <Button
            onClick={copyToClipboard}
            title="Copy"
            variant="secondary"
            border
            icon="hugeicons:copy-01"
            size="xsmall"
          />
          <Button
            onClick={openExplorer}
            title="Open in explorer"
            variant="secondary"
            border
            icon="hugeicons:link-square-01"
            size="xsmall"
          />
        </div>
      </div>
      <div className={s.addressValue}>
        {formatHash(address, 6, 4)}
      </div>
      <div className={s.fullAddress}>{address}</div>
    </div>
  )
}

export function BasketGovernance({ etf, chainConfig }: BasketGovernanceProps) {
  const rebalanceDate = etf.latestRebalanceDate 
    ? new Date(etf.latestRebalanceDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "Not available"

  return (
    <Card className={clsx(s.basketGovernance, "auto")}>
      <Heading
        icon="hugeicons:building"
        title="Basket Governance"
        description="Governance addresses and latest rebalance information"
      />

      <div className={s.content}>
        <div className={s.governanceInfo}>
          <AddressItem
            label="Vault Address"
            address={etf.vault}
            explorerUrl={chainConfig?.explorerUrl}
          />

          <AddressItem
            label="Pricer Address"
            address={etf.pricer}
            explorerUrl={chainConfig?.explorerUrl}
          />

          <AddressItem
            label="Share Token Address"
            address={etf.shareToken}
            explorerUrl={chainConfig?.explorerUrl}
          />

          <div className={s.infoItem}>
            <div className={s.infoHeader}>
              <span className={s.label}>Latest Rebalance Date</span>
            </div>
            <div className={s.dateValue}>
              {rebalanceDate}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
