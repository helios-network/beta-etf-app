"use client"

import { Icon } from "@/components/icon"
import { Input } from "@/components/input"
import { Modal } from "@/components/modal"
import { Symbol } from "@/components/symbol"
import { getAssetColor, getAssetIcon } from "@/utils/assets"
import Image from "next/image"
import { useMemo, useState } from "react"
import s from "./token-select-modal.module.scss"

interface Token {
  symbol: string
  name: string
}

interface TokenData {
  price: number
  logo: string
}

interface TokenSelectModalProps {
  open: boolean
  onClose: () => void
  onSelect: (token: Token) => void
  tokens: Token[]
  tokenData: Record<string, TokenData>
}

export function TokenSelectModal({
  open,
  onClose,
  onSelect,
  tokens,
  tokenData
}: TokenSelectModalProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredTokens = useMemo(() => {
    if (!searchTerm.trim()) return tokens

    const lowerSearch = searchTerm.toLowerCase()
    return tokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(lowerSearch) ||
        token.name.toLowerCase().includes(lowerSearch)
    )
  }, [tokens, searchTerm])

  const handleSelect = (token: Token) => {
    onSelect(token)
    setSearchTerm("")
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select Token"
      className={s.modal}
      responsiveBottom
    >
      <div className={s.content}>
        <div className={s.search}>
          <Input
            icon="hugeicons:search-01"
            placeholder="Search by symbol or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={s.searchInput}
          />
        </div>

        <div className={s.list}>
          {filteredTokens.length === 0 ? (
            <div className={s.empty}>No tokens found</div>
          ) : (
            filteredTokens.map((token) => {
              const logo = tokenData[token.symbol.toLowerCase()]?.logo

              return (
                <button
                  key={token.symbol}
                  type="button"
                  className={s.item}
                  onClick={() => handleSelect(token)}
                >
                  <div className={s.itemContent}>
                    <div className={s.icon}>
                      {logo ? (
                        <Image
                          src={logo}
                          alt={token.symbol}
                          width={32}
                          height={32}
                          className={s.tokenLogo}
                        />
                      ) : (
                        <Symbol
                          icon={getAssetIcon(token.symbol)}
                          color={getAssetColor(token.symbol)}
                        />
                      )}
                    </div>
                    <div className={s.text}>
                      <div className={s.symbol}>{token.symbol}</div>
                      <div className={s.name}>{token.name}</div>
                    </div>
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
