"use client"

import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import { ChainConfig } from "@/config/chain-config"
import { formatHash } from "@/utils/string"
import clsx from "clsx"
import { toast } from "sonner"
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
  icon: string
  explorerUrl?: string
}

function AddressItem({ label, address, icon, explorerUrl }: AddressItemProps) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(address)
    toast.success("Address copied")
  }

  const openExplorer = () => {
    if (explorerUrl) {
      window.open(`${explorerUrl}/address/${address}`, "_blank")
    }
  }

  return (
    <div className={s.addressItem}>
      <div className={s.addressItemHeader}>
        <div className={s.addressLabel}>
          <Icon icon={icon} className={s.addressIcon} />
          <span>{label}</span>
        </div>
        <div className={s.addressActions}>
          <button
            onClick={copyToClipboard}
            className={s.actionButton}
            title="Copy address"
          >
            <Icon icon="hugeicons:copy-01" />
          </button>
          <button
            onClick={openExplorer}
            className={s.actionButton}
            title="Open in explorer"
          >
            <Icon icon="hugeicons:arrow-up-right-01" />
          </button>
        </div>
      </div>
      <div className={s.addressValueDisplay}>{formatHash(address, 6, 4)}</div>
      <div className={s.addressValueFull}>{address}</div>
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
        icon="hugeicons:pie-chart-09"
        title="Basket Governance"
        description="Smart contract addresses and rebalancing data"
      />

      <div className={s.content}>
        <div className={s.addressesGrid}>
          <div className={s.gridColumn}>
            <div className={s.columnLabel}>Smart Contracts</div>
            <div className={s.addressList}>
              <AddressItem
                label="Vault"
                address={etf.vault}
                icon="hugeicons:vault-02"
                explorerUrl={chainConfig?.explorerUrl}
              />

              <AddressItem
                label="Pricer"
                address={etf.pricer}
                icon="hugeicons:calculator"
                explorerUrl={chainConfig?.explorerUrl}
              />

              <AddressItem
                label="Share Token"
                address={etf.shareToken}
                icon="hugeicons:coins-hand-02"
                explorerUrl={chainConfig?.explorerUrl}
              />
            </div>
          </div>

          <div className={s.rebalanceCard}>
            <div className={s.rebalanceLabel}>Latest Rebalance</div>
            <div className={s.rebalanceContent}>
              <Icon icon="hugeicons:clock-02" className={s.rebalanceIcon} />
              <div className={s.rebalanceDateText}>{rebalanceDate}</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
