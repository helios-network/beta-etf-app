"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { DataState } from "@/components/data-state"
import { Heading } from "@/components/heading"
import { Input } from "@/components/input"
import { Badge } from "@/components/badge"
import {
  fetchPortfolio,
  fetchPortfolioAssets,
  fetchPortfolioSummary
} from "@/helpers/request"
import type {
  PortfolioAsset,
  PortfolioSummary
} from "@/helpers/request"
import { truncateAddress } from "@/lib/utils"
import { formatTokenAmount } from "@/lib/utils/number"
import { ethers } from "ethers"
import { useAccount } from "wagmi"
import { useState, useEffect } from "react"
import { useMediaQuery } from "usehooks-ts"
import s from "./page.module.scss"

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

        const [, assetsData, summaryData] = await Promise.all([
          fetchPortfolio(displayAddress),
          fetchPortfolioAssets(displayAddress),
          fetchPortfolioSummary(displayAddress)
        ])

        // null means 404 (no portfolio found) - treat as empty
        setAssets(assetsData?.data || [])
        setSummary(summaryData?.data || null)
      } catch (err) {
        // Only set error for non-404 errors
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
        <Heading
          icon="hugeicons:wallet-01"
          title="Portfolio"
          description={
            displayAddressFormatted ? (
              <span className={s.address}>
                {displayAddressFormatted}
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
              </span>
            ) : (
              "Connect your wallet to view your portfolio"
            )
          }
        />
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
          {assets.map((asset, index) => (
            <Card key={index} className={s.assetCard}>
              <div className={s.cardHeader}>
                <div className={s.cardTitle}>
                  <h4 className={s.assetName}>{asset.etfName}</h4>
                  <span className={s.assetSymbol}>{asset.symbol}</span>
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
                  <span className={s.cardValue}>{asset.chain}</span>
                </div>
              </div>
            </Card>
          ))}
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
              </tr>
            </thead>
            <tbody>
              {assets.map((asset, index) => (
                <tr key={index} className={s.row}>
                  <td className={s.nameCol} data-th="Asset">
                    <div className={s.assetInfo}>
                      <div>
                        <span className={s.assetName}>{asset.etfName}</span>
                        <span className={s.assetSymbol}>{asset.symbol}</span>
                      </div>
                    </div>
                  </td>
                  <td className={s.typeCol} data-th="Chain">
                    {asset.chain}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
