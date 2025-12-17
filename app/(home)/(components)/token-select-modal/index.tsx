"use client"

import { Icon } from "@/components/icon"
import { Input } from "@/components/input"
import { Modal } from "@/components/modal"
import { Symbol } from "@/components/symbol"
import { getAssetColor, getAssetIcon } from "@/utils/assets"
import { fetchDepositTokens, type DepositToken } from "@/helpers/request"

// Keep Token interface for internal use
import { fetchCGTokenData } from "@/utils/price"
import { useQuery } from "@tanstack/react-query"
import { useDebounceValue } from "usehooks-ts"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
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
  onSelect: (token: DepositToken) => void
  chainId: number
}

export function TokenSelectModal({
  open,
  onClose,
  onSelect,
  chainId
}: TokenSelectModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm] = useDebounceValue(searchTerm, 400)

  // Reset search term when modal opens
  useEffect(() => {
    if (open) {
      setSearchTerm("")
    }
  }, [open])

  // Fetch tokens with search
  const { data: tokensData, isLoading: isLoadingTokens, error: tokensError } = useQuery({
    queryKey: ["depositTokens", "modal", chainId, debouncedSearchTerm || ""],
    queryFn: () => {
      const searchParam = debouncedSearchTerm?.trim() || undefined
      return fetchDepositTokens(chainId, searchParam)
    },
    enabled: open,
    staleTime: 30 * 1000,
  })

  // Store full DepositToken data
  const depositTokens: DepositToken[] = useMemo(() => {
    return tokensData?.data || []
  }, [tokensData?.data])

  // Convert DepositToken to Token format for display
  const tokens: Token[] = useMemo(() => {
    return depositTokens.map((token) => ({
      symbol: token.symbol,
      name: token.symbol // We don't have the full name from API
    }))
  }, [depositTokens])

  // Get all token symbols
  const allTokenSymbols = useMemo(() => {
    return tokens.map((token) => token.symbol.toLowerCase())
  }, [tokens])

  // Fetch token data
  const { data: tokenData = {} } = useQuery({
    queryKey: ["tokenData", "modal", allTokenSymbols],
    queryFn: () => fetchCGTokenData(allTokenSymbols),
    enabled: open && allTokenSymbols.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  const handleSelect = (token: Token) => {
    const depositToken = depositTokens.find((t) => t.symbol === token.symbol)
    if (depositToken) {
      onSelect(depositToken)
      setSearchTerm("")
      onClose()
    }
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
          {isLoadingTokens ? (
            <div className={s.empty}>Loading...</div>
          ) : tokensError ? (
            <div className={s.empty}>
              Error loading tokens: {tokensError instanceof Error ? tokensError.message : "Unknown error"}
            </div>
          ) : tokens.length === 0 ? (
            <div className={s.empty}>
              {debouncedSearchTerm ? `No tokens found for "${debouncedSearchTerm}"` : "No tokens found"}
            </div>
          ) : (
            tokens.map((token) => {
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
