"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { DataState } from "@/components/data-state"
import { Heading } from "@/components/heading"
import { Input } from "@/components/input"
import { Badge } from "@/components/badge"
import { Icon } from "@/components/icon"
import { Symbol } from "@/components/symbol"
import { fetchPortfolioAll, fetchETFs, type ETFResponse } from "@/helpers/request"
import type {
  PortfolioAsset,
  PortfolioSummary
} from "@/helpers/request"
import { truncateAddress } from "@/lib/utils"
import { formatTokenAmount } from "@/lib/utils/number"
import { ethers } from "ethers"
import { useAccount } from "wagmi"
import { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react"
import { useMediaQuery } from "usehooks-ts"
import { useQuery } from "@tanstack/react-query"
import { fetchCGTokenData } from "@/utils/price"
import { getAssetColor, getAssetIcon } from "@/utils/assets"
import { CHAIN_CONFIG } from "@/config/chain-config"
import { toast } from "sonner"
import Image from "next/image"
import clsx from "clsx"
import s from "./page.module.scss"

function useTruncateAddress<T extends HTMLElement = HTMLElement>(address: string, containerRef: React.RefObject<T | null>) {
  const [startChars, setStartChars] = useState(8)
  const [endChars, setEndChars] = useState(6)

  useLayoutEffect(() => {
    if (!containerRef.current || !address) return

    const updateTruncation = () => {
      const container = containerRef.current
      if (!container) return

      const containerWidth = container.offsetWidth
      const buttonWidth = 28
      const gap = 8
      const iconWidth = 14
      const padding = 16
      const availableWidth = containerWidth - buttonWidth - gap - iconWidth - padding

      const charWidth = 7.5
      const ellipsisWidth = 8
      const minChars = 10

      let totalChars = Math.floor((availableWidth - ellipsisWidth) / charWidth)
      totalChars = Math.max(minChars, totalChars)

      if (totalChars >= address.length - 2) {
        setStartChars(Math.floor(address.length / 2))
        setEndChars(Math.ceil(address.length / 2))
      } else {
        const start = Math.floor(totalChars * 0.6)
        const end = totalChars - start
        setStartChars(Math.max(4, start))
        setEndChars(Math.max(4, end))
      }
    }

    updateTruncation()
    const resizeObserver = new ResizeObserver(updateTruncation)
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [address, containerRef])

  return truncateAddress(address, startChars, endChars)
}

function ContractAddressCell({ 
  asset,
  onAddToWallet
}: { 
  asset: PortfolioAsset
  onAddToWallet: (asset: PortfolioAsset) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chainConfig = CHAIN_CONFIG[asset.chain]
  const explorerUrl = chainConfig ? `${chainConfig.explorerUrl}/address/${asset.etfTokenAddress}` : null
  const truncatedAddress = useTruncateAddress(asset.etfTokenAddress, containerRef)

  return (
    <div ref={containerRef} className={s.contractActions}>
      {explorerUrl ? (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={s.contractLink}
        >
          {truncatedAddress}
          <Icon
            icon="hugeicons:external-link-01"
            className={s.externalIcon}
          />
        </a>
      ) : (
        <span className={s.contractAddress}>
          {truncatedAddress}
        </span>
      )}
      <button
        onClick={() => onAddToWallet(asset)}
        className={s.addWalletButton}
        title="Add to wallet"
      >
        <Icon icon="hugeicons:wallet-add-01" />
      </button>
    </div>
  )
}

export default function PortfolioPage() {
  const { address: connectedAddress, isConnected } = useAccount()
  const [searchAddress, setSearchAddress] = useState<string | undefined>(
    undefined
  )
  const [searchValue, setSearchValue] = useState("")
  const [searchError, setSearchError] = useState<string | null>(null)

  const [assets, setAssets] = useState<PortfolioAsset[]>([])
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMobile = useMediaQuery("(max-width: 768px)")

  // Use search address if provided, otherwise use connected wallet
  const displayAddress = searchAddress || connectedAddress

  // Reset search address when wallet disconnects
  useEffect(() => {
    if (!isConnected && searchAddress) {
      setSearchAddress(undefined)
      setSearchValue("")
      setSearchError(null)
    }
  }, [isConnected, searchAddress])

  // Reset search when connected address changes
  useEffect(() => {
    if (searchAddress === connectedAddress) {
      setSearchValue("")
      setSearchError(null)
    }
  }, [searchAddress, connectedAddress])

  useEffect(() => {
    async function loadPortfolio() {
      if (!displayAddress) {
        setAssets([])
        setSummary(null)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const portfolioData = await fetchPortfolioAll(displayAddress)

        if (!portfolioData) {
          setAssets([])
          setSummary(null)
          return
        }

        const { assets: portfolioAssets, allocation, totalAssets, byChain, address, totalValueUSD } = portfolioData.data

        setAssets(portfolioAssets || [])
        setSummary({
          address,
          totalValueUSD,
          totalAssets,
          allocation: allocation || [],
          byChain: byChain || {}
        })
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load portfolio"
        )
        setAssets([])
        setSummary(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadPortfolio()
  }, [displayAddress])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchValue(value)
    setSearchError(null)

    // If empty, reset to connected wallet
    if (!value.trim()) {
      setSearchAddress(connectedAddress)
      return
    }

    // Validate address format
    if (value.trim() && !ethers.isAddress(value.trim())) {
      setSearchError("Invalid Ethereum address format")
      return
    }

    // Valid address
    if (ethers.isAddress(value.trim())) {
      setSearchError(null)
      setSearchAddress(value.trim())
    }
  }

  const handleReset = () => {
    setSearchValue("")
    setSearchError(null)
    setSearchAddress(connectedAddress)
  }

  const displayAddressFormatted = displayAddress
    ? truncateAddress(displayAddress)
    : null
  const isSearching = searchAddress && searchAddress !== connectedAddress

  const allETFSymbols = useMemo(() => {
    return assets.map((asset) => asset.symbol).filter(Boolean)
  }, [assets])

  const { data: etfsData } = useQuery({
    queryKey: ["portfolio-etfs", allETFSymbols],
    queryFn: async () => {
      const etfMap: Record<string, ETFResponse> = {}
      for (const symbol of allETFSymbols) {
        try {
          const response = await fetchETFs(1, 1, undefined, symbol)
          if (response.data && response.data.length > 0) {
            etfMap[symbol] = response.data[0]
          }
        } catch (error) {
          console.error(`Failed to fetch ETF for ${symbol}:`, error)
        }
      }
      return etfMap
    },
    enabled: allETFSymbols.length > 0 && !isLoading,
    staleTime: 5 * 60 * 1000,
  })

  const allTokenSymbols = useMemo(() => {
    const symbols = new Set<string>()
    if (etfsData) {
      Object.values(etfsData).forEach((etf) => {
        etf.assets?.forEach((asset) => {
          symbols.add(asset.symbol.toLowerCase())
        })
      })
    }
    return Array.from(symbols)
  }, [etfsData])

  const { data: tokenData = {} } = useQuery({
    queryKey: ["portfolio-token-data", allTokenSymbols],
    queryFn: () => fetchCGTokenData(allTokenSymbols),
    enabled: allTokenSymbols.length > 0 && !isLoading,
    staleTime: 5 * 60 * 1000,
  })

  const handleAddToWallet = async (asset: PortfolioAsset) => {
    if (!window.ethereum) {
      toast.error("MetaMask not detected")
      return
    }

    try {
      await (window.ethereum.request as any)({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: asset.etfTokenAddress,
            symbol: asset.symbol,
            decimals: asset.decimals,
          },
        },
      })
      toast.success(`${asset.symbol} added to wallet!`)
    } catch {
      toast.error(`Failed to add ${asset.symbol} to wallet`)
    }
  }

  const getAssetTokens = (asset: PortfolioAsset) => {
    const etf = etfsData?.[asset.symbol]
    if (!etf?.assets) return []
    return etf.assets.map((a) => ({
      symbol: a.symbol,
      logo: tokenData[a.symbol.toLowerCase()]?.logo,
    }))
  }


  // If no wallet connected and no search, show empty state
  if (!isConnected && !searchAddress) {
    return (
      <div className={s.page}>
        <div className={s.headingWrapper}>
          <Heading
            icon="hugeicons:wallet-01"
            title="Portfolio"
            description="Connect your wallet to view your portfolio"
          />
        </div>
        <DataState
          type="empty"
          message="Connect your wallet to view your portfolio"
          icon="hugeicons:wallet-01"
        />
      </div>
    )
  }

  return (
    <div className={s.page}>
      <div className={s.headingWrapper}>
        <div className={s.headingContent}>
          <Heading
            icon="hugeicons:wallet-01"
            title="Portfolio"
            description={
              displayAddressFormatted ? (
                <span className={s.address}>
                  {displayAddressFormatted}
                </span>
              ) : (
                "Connect your wallet to view your portfolio"
              )
            }
          />
          {isSearching && (
            <Button
              variant="secondary"
              size="small"
              onClick={handleReset}
              className={s.resetButton}
              iconLeft="hugeicons:arrow-left-01"
            >
              Back to my wallet
            </Button>
          )}
        </div>
      </div>

      {connectedAddress && (
        <div className={s.filterCardContent}>
          <div className={s.filterGrid}>
            <div className={s.searchWrapper}>
              <Input
                icon="hugeicons:search-01"
                placeholder="Search by Ethereum address..."
                value={searchValue}
                onChange={handleSearchChange}
                className={s.searchInput}
                helperText={searchError || undefined}
              />
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {isLoading ? (
        <div className={s.summary}>
          <Card className={s.stat}>
            <div className={s.skeleton}>
              <div className={s.skeletonLabel} />
              <div className={s.skeletonValue} />
            </div>
          </Card>
          <Card className={s.stat}>
            <div className={s.skeleton}>
              <div className={s.skeletonLabel} />
              <div className={s.skeletonValue} />
            </div>
          </Card>
          <Card className={s.stat}>
            <div className={s.skeleton}>
              <div className={s.skeletonLabel} />
              <div className={s.skeletonValue} />
            </div>
          </Card>
        </div>
      ) : summary ? (
        <div className={s.summary}>
          <Card className={s.stat}>
            <span className={s.label}>Total Value</span>
            <span className={s.value}>
              ${formatTokenAmount(assets.reduce((acc, asset) => acc + asset.amountUSD, 0).toString())}
            </span>
          </Card>
          <Card className={s.stat}>
            <span className={s.label}>Assets</span>
            <span className={s.value}>{summary.totalAssets}</span>
          </Card>
          {summary.allocation &&
            summary.allocation.length > 0 && (
              <Card className={s.stat}>
                <span className={s.label}>Top Allocation</span>
                <span className={s.value}>
                  {summary.allocation
                    .sort((a, b) => b.percentage - a.percentage)
                    .slice(0, 1)
                    .map((item) => (
                      <span key={item.symbol} className={s.allocation}>
                        {item.symbol}: {item.percentage.toFixed(1)}%
                      </span>
                    ))}
                </span>
              </Card>
            )}
        </div>
      ) : null}

      {/* Assets List */}
      {isLoading ? (
        <DataState
          type="loading"
          message="Loading portfolio assets..."
          background={false}
        />
      ) : error ? (
        <DataState
          type="error"
          message={error}
          background={false}
        />
      ) : !assets || assets.length === 0 ? (
        <DataState
          type="empty"
          message="No assets found in this portfolio"
          icon="hugeicons:wallet-01"
          background={false}
        />
      ) : isMobile ? (
        <div className={s.assetsList}>
          {assets.map((asset, index) => {
            const tokens = getAssetTokens(asset)
            const hasTokenLogos = tokens.length > 0 && tokens.some((t) => t.logo)

            return (
              <Card key={index} className={s.assetCard}>
                <div className={s.cardHeader}>
                  <div className={s.cardTitle}>
                    <div className={s.cardTitleRow}>
                      {hasTokenLogos ? (
                        <div
                          className={clsx(
                            s.tokenLogos,
                            tokens.length > 4 && s.moreLogos
                          )}
                          data-nb-tokens={tokens.length}
                          data-more-tokens={
                            tokens.length > 4 ? tokens.length - 4 : 0
                          }
                        >
                          {tokens.slice(0, 4).map((token, idx) => {
                            return token.logo ? (
                              <Image
                                key={token.symbol}
                                src={token.logo}
                                alt={token.symbol}
                                className={s.tokenLogo}
                                style={{ zIndex: 4 - idx }}
                                title={token.symbol}
                                width={48}
                                height={48}
                              />
                            ) : null
                          })}
                        </div>
                      ) : (
                        <div className={s.icon}>
                          <Symbol
                            icon={getAssetIcon(asset.symbol)}
                            color={getAssetColor(asset.symbol)}
                          />
                        </div>
                      )}
                      <div>
                        <h4 className={s.assetName}>{asset.etfName}</h4>
                        <span className={s.assetSymbol}>{asset.symbol}</span>
                      </div>
                    </div>
                  </div>
                  <Badge status="primary">ETF</Badge>
                </div>
                <div className={s.cardBody}>
                  <div className={s.cardRow}>
                    <span className={s.cardLabel}>Quantity</span>
                    <span className={s.cardValue}>{asset.amountFormatted}</span>
                  </div>
                  <div className={s.cardRow}>
                    <span className={s.cardLabel}>Value</span>
                    <span className={s.cardValue}>
                      ${formatTokenAmount(asset.amountUSD)}
                    </span>
                  </div>
                  <div className={s.cardRow}>
                    <span className={s.cardLabel}>Share Price</span>
                    <span className={s.cardValue}>
                      ${formatTokenAmount(asset.sharePriceUSD)}
                    </span>
                  </div>
                  <div className={s.cardRow}>
                    <span className={s.cardLabel}>Chain</span>
                    <span className={s.cardValue}>
                      {CHAIN_CONFIG[asset.chain]?.name || asset.chain}
                    </span>
                  </div>
                  <div className={s.cardRow}>
                    <span className={s.cardLabel}>Contract</span>
                    <ContractAddressCell asset={asset} onAddToWallet={handleAddToWallet} />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className={s.tableWrapper}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.nameCol}>Asset</th>
                <th className={s.typeCol}>Chain</th>
                <th className={s.quantityCol}>Quantity</th>
                <th className={s.valueCol}>Value</th>
                <th className={s.allocationCol}>Share Price</th>
                <th className={s.contractCol}>Contract</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset, index) => {
                const tokens = getAssetTokens(asset)
                const hasTokenLogos = tokens.length > 0 && tokens.some((t) => t.logo)

                return (
                  <tr key={index} className={s.row}>
                    <td className={s.nameCol} data-th="Asset">
                      <div className={s.assetInfo}>
                        {hasTokenLogos ? (
                          <div
                            className={clsx(
                              s.tokenLogos,
                              tokens.length > 4 && s.moreLogos
                            )}
                            data-nb-tokens={tokens.length}
                            data-more-tokens={
                              tokens.length > 4 ? tokens.length - 4 : 0
                            }
                          >
                            {tokens.slice(0, 4).map((token, idx) => {
                              return token.logo ? (
                                <Image
                                  key={token.symbol}
                                  src={token.logo}
                                  alt={token.symbol}
                                  className={s.tokenLogo}
                                  style={{ zIndex: 4 - idx }}
                                  title={token.symbol}
                                  width={48}
                                  height={48}
                                />
                              ) : null
                            })}
                          </div>
                        ) : (
                          <div className={s.icon}>
                            <Symbol
                              icon={getAssetIcon(asset.symbol)}
                              color={getAssetColor(asset.symbol)}
                            />
                          </div>
                        )}
                        <div>
                          <span className={s.assetName}>{asset.etfName}</span>
                          <span className={s.assetSymbol}>{asset.symbol}</span>
                        </div>
                      </div>
                    </td>
                    <td className={s.typeCol} data-th="Chain">
                      {CHAIN_CONFIG[asset.chain]?.name || asset.chain}
                    </td>
                    <td className={s.quantityCol} data-th="Quantity">
                      {asset.amountFormatted}
                    </td>
                    <td className={s.valueCol} data-th="Value">
                      ${formatTokenAmount(asset.amountUSD)}
                    </td>
                    <td className={s.allocationCol} data-th="Share Price">
                      ${formatTokenAmount(asset.sharePriceUSD)}
                    </td>
                    <td className={s.contractCol} data-th="Contract">
                      <ContractAddressCell asset={asset} onAddToWallet={handleAddToWallet} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
