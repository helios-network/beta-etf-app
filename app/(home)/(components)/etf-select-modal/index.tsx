"use client"

import { Icon } from "@/components/icon"
import { Input } from "@/components/input"
import { Modal } from "@/components/modal"
import { Symbol } from "@/components/symbol"
import { getAssetColor, getAssetIcon } from "@/utils/assets"
import { CHAIN_CONFIG } from "@/config/chain-config"
import { fetchETFs, type ETFResponse } from "@/helpers/request"

// Keep ETF interface for internal use
import { fetchCGTokenData } from "@/utils/price"
import { useQuery } from "@tanstack/react-query"
import { useDebounceValue } from "usehooks-ts"
import clsx from "clsx"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import s from "./etf-select-modal.module.scss"
import { useAccount } from "wagmi"
import { readContracts } from "@wagmi/core"
import { config } from "@/config/wagmi"
import { erc20Abi } from "@/constant/abis"
import { formatTokenAmount } from "@/lib/utils/number"
import { formatUnits } from "ethers"

interface ETF {
  id: string
  name: string
  symbol: string
  chain?: number
  tokens: Array<{
    symbol: string
    percentage: number
  }>
  held?: boolean
  sharePrice: number
  shareToken: string
  shareDecimals: number
}

interface ETFSelectModalProps {
  open: boolean
  onClose: () => void
  onSelect: (etf: ETFResponse) => void
  depositToken?: string
}

export function ETFSelectModal({
  open,
  onClose,
  onSelect,
  depositToken
}: ETFSelectModalProps) {
  const { address } = useAccount()
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm] = useDebounceValue(searchTerm, 400)
  const [etfValues, setEtfValues] = useState<{ [key: string]: string }>({}) // [etf.id] = holding $$$

  // Reset search term when modal opens
  useEffect(() => {
    if (open) {
      setSearchTerm("")
    }
  }, [open])

  // Fetch ETFs with search
  const {
    data: etfsData,
    isLoading: isLoadingETFs,
    error: etfsError
  } = useQuery({
    queryKey: [
      "etfs",
      "modal",
      depositToken,
      debouncedSearchTerm || "",
      address
    ],
    queryFn: () => {
      const searchParam = debouncedSearchTerm?.trim() || undefined
      return fetchETFs(1, 50, depositToken, searchParam, address)
    },
    enabled: open,
    staleTime: 30 * 1000
  })

  // Store full ETFResponse data
  const etfsResponse: ETFResponse[] = useMemo(() => {
    return etfsData?.data || []
  }, [etfsData?.data])

  // Convert ETFResponse to ETF format for display
  const etfs: ETF[] = useMemo(() => {
    return etfsResponse.map((etf: ETFResponse) => ({
      id: etf._id,
      name: etf.name,
      symbol: etf.symbol,
      chain: etf.chain,
      held: etf.held,
      sharePrice: parseFloat(etf.sharePrice || "0"),
      shareToken: etf.shareToken,
      shareDecimals: etf.shareDecimals || 18,
      tokens:
        etf.assets?.map((asset) => ({
          symbol: asset.symbol,
          percentage: asset.targetWeightBps / 100
        })) || []
    }))
  }, [etfsResponse])

  useEffect(() => {
    let mounted = true
    const loadPrices = async () => {
      setEtfValues({})
      if (etfs.length === 0 || !address) return
      const heldEtfs = etfs.filter((etf) => etf.held)
      if (heldEtfs.length === 0) return

      try {
        const balances = await readContracts(config, {
          contracts: heldEtfs.map((etf) => ({
            address: etf.shareToken as `0x${string}`,
            abi: erc20Abi as any,
            functionName: "balanceOf",
            args: [address]
          }))
        })
        const etfValues: { [key: string]: string } = {}
        heldEtfs.map((etf, index) => {
          const balance = (balances[index].result || 0) as number
          etfValues[etf.id] = formatTokenAmount(
            parseFloat(formatUnits(BigInt(balance), etf.shareDecimals)) *
              etf.sharePrice
          )
        })

        if (mounted) setEtfValues(etfValues)
      } catch (error) {
        console.error({ error })
      }
    }

    loadPrices()

    return () => {
      mounted = false
    }
  }, [etfs, address])

  // Get all token symbols from ETFs
  const allTokenSymbols = useMemo(() => {
    const symbols = new Set<string>()
    etfs.forEach((etf) => {
      etf.tokens.forEach((token) => {
        symbols.add(token.symbol.toLowerCase())
      })
    })
    return Array.from(symbols)
  }, [etfs])

  // Fetch token data
  const { data: tokenData = {} } = useQuery({
    queryKey: ["tokenData", "modal", allTokenSymbols],
    queryFn: () => fetchCGTokenData(allTokenSymbols),
    enabled: open && allTokenSymbols.length > 0,
    staleTime: 5 * 60 * 1000
  })

  const handleSelect = (etf: ETF) => {
    const etfResponse = etfsResponse.find((e) => e._id === etf.id)
    if (etfResponse) {
      onSelect(etfResponse)
      setSearchTerm("")
      onClose()
    }
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
          {isLoadingETFs ? (
            <div className={s.empty}>Loading...</div>
          ) : etfsError ? (
            <div className={s.empty}>
              Error loading ETFs:{" "}
              {etfsError instanceof Error ? etfsError.message : "Unknown error"}
            </div>
          ) : etfs.length === 0 ? (
            <div className={s.empty}>
              {debouncedSearchTerm
                ? `No ETFs found for "${debouncedSearchTerm}"`
                : "No ETFs found"}
            </div>
          ) : (
            etfs.map((etf) => {
              const etfIcon = getETFIcon(etf)
              const hasTokenLogos =
                etf.tokens.length > 0 &&
                etf.tokens.some(
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
                          <Symbol icon={etfIcon.icon} color={etfIcon.color} />
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
                    {etf.held && etfValues[etf.id] ? (
                      <div>$ {etfValues[etf.id]}</div>
                    ) : null}
                    {etf.chain && CHAIN_CONFIG[etf.chain]?.abbreviatedName && (
                      <Image
                        src={`/img/chains/${
                          CHAIN_CONFIG[etf.chain].abbreviatedName
                        }.png`}
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
