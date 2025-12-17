"use client"

import { Icon } from "@/components/icon"
import { Input } from "@/components/input"
import { Modal } from "@/components/modal"
import { Symbol } from "@/components/symbol"
import { getAssetColor, getAssetIcon } from "@/utils/assets"
import { CHAIN_CONFIG } from "@/config/chain-config"
import clsx from "clsx"
import Image from "next/image"
import { useMemo, useState } from "react"
import s from "./etf-select-modal.module.scss"

interface ETF {
  id: string
  name: string
  symbol: string
  chain?: number
  tokens: Array<{
    symbol: string
    percentage: number
  }>
}

interface TokenData {
  price: number
  logo: string
}

interface ETFSelectModalProps {
  open: boolean
  onClose: () => void
  onSelect: (etf: ETF) => void
  etfs: ETF[]
  tokenData: Record<string, TokenData>
}

export function ETFSelectModal({
  open,
  onClose,
  onSelect,
  etfs,
  tokenData
}: ETFSelectModalProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredETFs = useMemo(() => {
    if (!searchTerm.trim()) return etfs

    const lowerSearch = searchTerm.toLowerCase()
    return etfs.filter(
      (etf) =>
        etf.name.toLowerCase().includes(lowerSearch) ||
        etf.symbol.toLowerCase().includes(lowerSearch) ||
        etf.tokens.some((token) =>
          token.symbol.toLowerCase().includes(lowerSearch)
        )
    )
  }, [etfs, searchTerm])

  const handleSelect = (etf: ETF) => {
    onSelect(etf)
    setSearchTerm("")
    onClose()
  }

  const getETFIcon = (etf: ETF) => {
    // Use the first token's icon as the ETF icon, or a default icon
    // This is used as fallback when no token logos are available
    if (etf.tokens.length > 0) {
      const firstToken = etf.tokens[0]
      const logo = tokenData[firstToken.symbol.toLowerCase()]?.logo
      
      if (logo) {
        return { type: "image" as const, src: logo }
      }
      
      return {
        type: "symbol" as const,
        icon: getAssetIcon(firstToken.symbol),
        color: getAssetColor(firstToken.symbol)
      }
    }
    
    // Default ETF icon
    return {
      type: "symbol" as const,
      icon: "hugeicons:chart-05",
      color: getAssetColor("ETF")
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select ETF"
      className={s.modal}
      responsiveBottom
    >
      <div className={s.content}>
        <div className={s.search}>
          <Input
            icon="hugeicons:search-01"
            placeholder="Search by name, symbol or tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={s.searchInput}
          />
        </div>

        <div className={s.list}>
          {filteredETFs.length === 0 ? (
            <div className={s.empty}>No ETFs found</div>
          ) : (
            filteredETFs.map((etf) => {
              const etfIcon = getETFIcon(etf)
              const hasTokenLogos = etf.tokens.length > 0 && etf.tokens.some(
                (token) => tokenData[token.symbol.toLowerCase()]?.logo
              )

              return (
                <button
                  key={etf.id}
                  type="button"
                  className={s.item}
                  onClick={() => handleSelect(etf)}
                >
                  <div className={s.itemContent}>
                    {hasTokenLogos ? (
                      <div
                        className={clsx(
                          s.tokenLogos,
                          etf.tokens.length > 4 && s.moreLogos
                        )}
                        data-nb-tokens={etf.tokens.length}
                        data-more-tokens={
                          etf.tokens.length > 4 ? etf.tokens.length - 4 : 0
                        }
                      >
                        {etf.tokens.slice(0, 4).map((token, index) => {
                          const logo =
                            tokenData[token.symbol.toLowerCase()]?.logo
                          return logo ? (
                            <Image
                              key={token.symbol}
                              src={logo}
                              alt={token.symbol}
                              className={s.tokenLogo}
                              style={{ zIndex: 4 - index }}
                              title={token.symbol}
                              width={48}
                              height={48}
                            />
                          ) : null
                        })}
                      </div>
                    ) : (
                      <div className={s.icon}>
                        {etfIcon.type === "image" ? (
                          <Image
                            src={etfIcon.src}
                            alt={etf.symbol}
                            width={32}
                            height={32}
                            className={s.tokenLogo}
                          />
                        ) : (
                          <Symbol
                            icon={etfIcon.icon}
                            color={etfIcon.color}
                          />
                        )}
                      </div>
                    )}
                    <div className={s.text}>
                      <div className={s.symbol}>{etf.symbol}</div>
                      <div className={s.name}>{etf.name}</div>
                      {etf.chain && CHAIN_CONFIG[etf.chain] && (
                        <div className={s.chainBadge}>
                          {CHAIN_CONFIG[etf.chain].name}
                        </div>
                      )}
                    </div>
                    {etf.chain && CHAIN_CONFIG[etf.chain]?.abbreviatedName && (
                      <Image
                        src={`/img/chains/${CHAIN_CONFIG[etf.chain].abbreviatedName}.png`}
                        alt={CHAIN_CONFIG[etf.chain].name}
                        width={24}
                        height={24}
                        className={s.chainLogo}
                        title={`${CHAIN_CONFIG[etf.chain].name} Network`}
                      />
                    )}
                    <Icon icon="hugeicons:arrow-right-01" className={s.arrow} />
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </Modal>
  )
}
