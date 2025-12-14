"use client"

import { Icon } from "@/components/icon"
import { Input } from "@/components/input"
import { Modal } from "@/components/modal"
import { Symbol } from "@/components/symbol"
import { getAssetColor, getAssetIcon } from "@/utils/assets"
import Image from "next/image"
import { useMemo, useState } from "react"
import s from "./etf-select-modal.module.scss"

interface ETF {
  id: string
  name: string
  symbol: string
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

  const displayTokens = (tokens: ETF["tokens"]) => {
    const visibleTokens = tokens.slice(0, 3)
    const remainingCount = tokens.length - 3

    return (
      <div className={s.tokens}>
        {visibleTokens.map((token, index) => {
          const logo = tokenData[token.symbol.toLowerCase()]?.logo

          return (
            <div key={index} className={s.token}>
              {logo ? (
                <Image
                  src={logo}
                  alt={token.symbol}
                  width={16}
                  height={16}
                  className={s.tokenLogo}
                />
              ) : (
                <Symbol
                  icon={getAssetIcon(token.symbol)}
                  color={getAssetColor(token.symbol)}
                  className={s.tokenIcon}
                />
              )}
              <span className={s.tokenSymbol}>{token.symbol}</span>
            </div>
          )
        })}
        {remainingCount > 0 && (
          <span className={s.tokenMore}>+{remainingCount}</span>
        )}
      </div>
    )
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
            filteredETFs.map((etf) => (
              <button
                key={etf.id}
                type="button"
                className={s.item}
                onClick={() => handleSelect(etf)}
              >
                <div className={s.itemContent}>
                  <div className={s.mainInfo}>
                    <div className={s.name}>
                      {etf.name}
                      <Icon
                        icon="hugeicons:arrow-right-01"
                        className={s.arrow}
                      />
                    </div>
                    <div className={s.symbol}>{etf.symbol}</div>
                  </div>
                  {etf.tokens.length > 0 && (
                    <div className={s.tokensContainer}>
                      {displayTokens(etf.tokens)}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
