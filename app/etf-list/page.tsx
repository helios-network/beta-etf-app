"use client"

import { Badge } from "@/components/badge"
import { BorderAnimate } from "@/components/border-animate"
import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { DataState } from "@/components/data-state"
import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import { Input } from "@/components/input"
import { Select } from "@/components/input/select"
import { Modal } from "@/components/modal"
import { Link } from "@/components/link"
import { BuyETFModal, SellETFModal, type ETF } from "@/components/etf-modals"
import { routes } from "@/config/routes"
import { vaultViewAbi,  pricerViewAbi } from "@/constant/abis"
import { fetchETFs, fetchETFStats, type ETFResponse } from "@/helpers/request"
import { useETFContract, percentageToBps } from "@/hooks/useETFContract"
import { useWeb3Provider } from "@/hooks/useWeb3Provider"
import { CHAIN_CONFIG } from "@/config/chain-config"
import { formatTokenAmount } from "@/lib/utils/number"
import { formatTokenSupply } from "@/helpers/format"
import { fetchCGTokenData } from "@/utils/price"
import { getAssetColor } from "@/utils/assets"
import { useQuery } from "@tanstack/react-query"
import clsx from "clsx"
import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { useEventListener } from "usehooks-ts"
import { useAccount, useChainId } from "wagmi"
import Image from "next/image"
import s from "./page.module.scss"

function formatETFResponse(etf: ETFResponse): ETF {
  // Convert assets from API to tokens format
  // targetWeightBps: 10000 = 100%, so divide by 100 to get percentage
  const tokens =
    etf.assets?.map((asset) => ({
      symbol: asset.symbol,
      percentage: asset.targetWeightBps / 100,
      tvl: asset.tvl || "0"
    })) || []

  const assets =
    etf.assets?.map((asset) => ({
      token: asset.token,
      symbol: asset.symbol,
      decimals: asset.decimals,
      targetWeightBps: asset.targetWeightBps
    })) || []

  return {
    id: etf._id,
    factory: etf.factory,
    name: etf.name,
    symbol: etf.symbol,
    description: `${etf.name} ETF basket`,
    tvl: etf.tvl,
    totalSupply: etf.totalSupply || "0.000",
    sharePrice: etf.sharePrice || "0.00",
    volumeTradedUSD: etf.volumeTradedUSD || 0,
    dailyVolumeUSD: etf.dailyVolumeUSD || 0,
    apy: "0%", // Not available in API response
    change24h: etf.priceChange24h || 0, // Use priceChange24h from API
    priceChange24h: etf.priceChange24h,
    priceChange30d: etf.priceChange30d,
    priceChange7d: etf.priceChange7d,
    riskLevel: "medium" as const, // Default value
    category: "ETF", // Default category
    tokens,
    price: etf.sharePrice ? `$${etf.sharePrice}` : "$0.00", // Use sharePrice for price display
    vault: etf.vault,
    pricer: etf.pricer,
    shareToken: etf.shareToken,
    depositToken: etf.depositToken,
    depositSymbol: etf.depositSymbol || "TOKEN",
    depositDecimals: etf.depositDecimals || 18,
    chain: etf.chain,
    depositCount: etf.depositCount,
    redeemCount: etf.redeemCount,
    owner: etf.owner || "",
    assets,
    createdAt: etf.createdAt || new Date().toISOString(),
    shareDecimals: etf.shareDecimals || 18
  }
}

export default function ETFList() {
  const chainId = useChainId()
  const { address } = useAccount()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEventListener("mousemove", (e: MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY })
  })

  const [searchInput, setSearchInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedRisk, setSelectedRisk] = useState("all")
  const [sortBy, setSortBy] = useState("tvl")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)

  const [buyModalOpen, setBuyModalOpen] = useState(false)
  const [sellModalOpen, setSellModalOpen] = useState(false)
  const [selectedETF, setSelectedETF] = useState<ETF | null>(null)
  const [hoveredToken, setHoveredToken] = useState<{
    targetPercentage: number
    currentPercentage: number
    tvl: string
  } | null>(null)

  // Update params modal state
  const [updateParamsModalOpen, setUpdateParamsModalOpen] = useState(false)
  const [imbalanceThresholdBps, setImbalanceThresholdBps] = useState("")
  const [maxPriceStaleness, setMaxPriceStaleness] = useState("")
  const [rebalanceCooldown, setRebalanceCooldown] = useState("")
  const [maxCapacityUSD, setMaxCapacityUSD] = useState("")
  const [currentImbalanceThresholdBps, setCurrentImbalanceThresholdBps] = useState<string | null>(null)
  const [currentMaxPriceStaleness, setCurrentMaxPriceStaleness] = useState<string | null>(null)
  const [currentRebalanceCooldown, setCurrentRebalanceCooldown] = useState<string | null>(null)
  const [currentMaxCapacityUSD, setCurrentMaxCapacityUSD] = useState<string | null>(null)
  const [isLoadingCurrentParams, setIsLoadingCurrentParams] = useState(false)
  const [updateParamsError, setUpdateParamsError] = useState<string | null>(null)

  const {
    rebalance,
    updateParams,
    estimateRebalance,
    estimateUpdateParams,
    isLoading: isContractLoading
  } = useETFContract()
  const web3Provider = useWeb3Provider()
  
  // Rebalance modal state
  const [rebalanceModalOpen, setRebalanceModalOpen] = useState(false)
  const [isEstimatingRebalance, setIsEstimatingRebalance] = useState(false)
  const [rebalanceError, setRebalanceError] = useState<string | null>(null)
  const [rebalancePreview, setRebalancePreview] = useState<{
    totalSoldValueUSD: string
    totalBoughtValueUSD: string
    soldAmounts: string[]
    boughtAmounts: string[]
    soldValuesUSD: string[]
    boughtValuesUSD: string[]
  } | null>(null)

  const isWalletConnected = !!address

  const isETFChainMatch = (etf: ETF) => {
    return chainId === etf.chain
  }

  const { data: statsData } = useQuery({
    queryKey: ["etfStats"],
    queryFn: () => fetchETFStats(),
    staleTime: 30 * 1000,
    refetchInterval: 45 * 1000
  })

  const { data: etfsData, isLoading, error: etfsError } = useQuery({
    queryKey: ["etfs", currentPage, pageSize, searchTerm],
    queryFn: () => fetchETFs(currentPage, pageSize, undefined, searchTerm),
    staleTime: 30 * 1000
  })

  const etfs = useMemo(() => {
    if (!etfsData?.data) return []
    return etfsData.data.map(formatETFResponse)
  }, [etfsData])

  const allTokenSymbols = useMemo(() => {
    const symbols = new Set<string>()
    etfs.forEach((etf) => {
      etf.tokens.forEach((token) => {
        symbols.add(token.symbol.toLowerCase())
      })
    })
    return Array.from(symbols)
  }, [etfs])

  const { data: tokenData = {} } = useQuery({
    queryKey: ["tokenData", allTokenSymbols],
    queryFn: () => fetchCGTokenData(allTokenSymbols),
    enabled: allTokenSymbols.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000
  })

  const pagination = etfsData?.pagination || {
    page: 1,
    size: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  }

  const error = etfsError ? (etfsError instanceof Error ? etfsError.message : "Failed to load ETFs") : null

  // Validate and format decimal number input (max 18 decimals, point as separator)
  const validateDecimalInput = (
    value: string,
    maxDecimals: number = 18
  ): string => {
    // Remove any non-numeric characters except decimal point
    let cleaned = value.replace(/[^\d.]/g, "")

    // Replace comma with point
    cleaned = cleaned.replace(/,/g, ".")

    // Only allow one decimal point
    const parts = cleaned.split(".")
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("")
    }

    // Limit decimal places
    if (parts.length === 2 && parts[1].length > maxDecimals) {
      cleaned = parts[0] + "." + parts[1].slice(0, maxDecimals)
    }

    return cleaned
  }

  useEffect(() => {
    if (currentPage !== pagination.page) {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [currentPage, pagination.page])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput])

  const categories = ["all", ...new Set(etfs.map((etf) => etf.category))]
  const riskLevels = ["all", "low", "medium", "high"]

  const filteredAndSortedETFs = useMemo(() => {
    const filtered = etfs.filter((etf) => {
      const matchesSearch =
        etf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        etf.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        etf.description.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory =
        selectedCategory === "all" || etf.category === selectedCategory
      const matchesRisk =
        selectedRisk === "all" || etf.riskLevel === selectedRisk

      return matchesSearch && matchesCategory && matchesRisk
    })

    return filtered.sort((a, b) => {
      if (sortBy === "apy") {
        return parseFloat(b.apy) - parseFloat(a.apy)
      } else if (sortBy === "change24h") {
        return b.change24h - a.change24h
      } else if (sortBy === "tvl") {
        const tvlA = Number(a.tvl)
        const tvlB = Number(b.tvl)
        return tvlB - tvlA
      }
      return 0
    })
  }, [etfs, searchTerm, selectedCategory, selectedRisk, sortBy])

  const handleBuy = (etf: ETF) => {
    if (!isWalletConnected) {
      toast.error("Please connect your wallet first")
      return
    }
    if (!isETFChainMatch(etf)) {
      toast.error(
        `Please switch to the correct network (Chain ID: ${etf.chain})`
      )
      return
    }
    setSelectedETF(etf)
    setBuyModalOpen(true)
  }

  const handleSell = (etf: ETF) => {
    if (!isWalletConnected) {
      toast.error("Please connect your wallet first")
      return
    }
    if (!isETFChainMatch(etf)) {
      toast.error(
        `Please switch to the correct network (Chain ID: ${etf.chain})`
      )
      return
    }
    setSelectedETF(etf)
    setSellModalOpen(true)
  }


  const handleOpenRebalanceModal = async (etf: ETF) => {
    if (!isWalletConnected) {
      toast.error("Please connect your wallet first")
      return
    }
    if (!isETFChainMatch(etf)) {
      toast.error(
        `Please switch to the correct network (Chain ID: ${etf.chain})`
      )
      return
    }

    setSelectedETF(etf)
    setRebalanceError(null)
    setRebalancePreview(null)
    setRebalanceModalOpen(true)

    // Estimate rebalance immediately when opening modal
    setIsEstimatingRebalance(true)
    try {
      const preview = await estimateRebalance({
        factory: etf.factory,
        vault: etf.vault,
        slippageBps: percentageToBps(0.5)
      })
      setRebalancePreview(preview)
    } catch (error: unknown) {
      console.error("Error estimating rebalance", error)
      const errorMessage =
        error instanceof Error ? error.message : "Failed to estimate rebalance"
      
      // If the error is "execution reverted", it means rebalance is not necessary
      if (errorMessage.toLowerCase().includes("execution reverted")) {
        setRebalanceError("Rebalance is not necessary at the moment.")
      } else {
        setRebalanceError(errorMessage)
      }
    } finally {
      setIsEstimatingRebalance(false)
    }
  }

  const handleConfirmRebalance = async () => {
    if (!selectedETF) return

    try {
      const result = await rebalance({
        factory: selectedETF.factory,
        vault: selectedETF.vault,
        slippageBps: percentageToBps(0.5)
      })

      console.log("result", result)
      
      toast.success(`Successfully rebalanced ${selectedETF.symbol}`)
      setRebalanceModalOpen(false)
      setSelectedETF(null)
      setRebalancePreview(null)
      setRebalanceError(null)
    } catch (error: unknown) {
      console.error("Error during rebalance", error)
      const errorMessage =
        error instanceof Error ? error.message : "Rebalance failed"
      toast.error(errorMessage)
    }
  }

  const fetchCurrentParams = async (etf: ETF) => {
    if (!web3Provider) return

    setIsLoadingCurrentParams(true)
    setUpdateParamsError(null)

    try {
      // Fetch imbalanceThresholdBps from vault
      const vaultContract = new web3Provider.eth.Contract(
        vaultViewAbi as any,
        etf.vault
      )
      const imbalanceThresholdBpsValue = await vaultContract.methods
        .imbalanceThresholdBps()
        .call()

      // Fetch vaultConfig from vault (contains rebalanceCooldown and maxCapacityUSD)
      const vaultConfig: any = await vaultContract.methods
        .vaultConfig()
        .call()

      // Fetch maxPriceStaleness from pricer
      const pricerContract = new web3Provider.eth.Contract(
        pricerViewAbi as any,
        etf.pricer
      )
      const maxPriceStalenessValue = await pricerContract.methods
        .maxPriceStaleness()
        .call()

      setCurrentImbalanceThresholdBps(String(imbalanceThresholdBpsValue))
      setCurrentMaxPriceStaleness(String(maxPriceStalenessValue))
      
      // Extract vaultConfig values (Web3.js returns structs as objects with property names)
      // The struct has: lastRebalanceTimestamp, rebalanceCooldown, maxCapacityUSD
      const config = vaultConfig.rebalanceCooldown !== undefined 
        ? vaultConfig 
        : { 
            rebalanceCooldown: vaultConfig[1] || "0",
            maxCapacityUSD: vaultConfig[2] || "0"
          }
      
      setCurrentRebalanceCooldown(String(config.rebalanceCooldown || "0"))
      setCurrentMaxCapacityUSD(String(config.maxCapacityUSD || "0"))
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch current parameters"
      setUpdateParamsError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoadingCurrentParams(false)
    }
  }

  const handleOpenUpdateParamsModal = async (etf: ETF) => {
    if (!isWalletConnected) {
      toast.error("Please connect your wallet first")
      return
    }
    if (!isETFChainMatch(etf)) {
      toast.error(
        `Please switch to the correct network (Chain ID: ${etf.chain})`
      )
      return
    }

    setSelectedETF(etf)
    setImbalanceThresholdBps("")
    setMaxPriceStaleness("")
    setRebalanceCooldown("")
    setMaxCapacityUSD("")
    setCurrentImbalanceThresholdBps(null)
    setCurrentMaxPriceStaleness(null)
    setCurrentRebalanceCooldown(null)
    setCurrentMaxCapacityUSD(null)
    setUpdateParamsError(null)
    setUpdateParamsModalOpen(true)

    // Fetch current params
    await fetchCurrentParams(etf)
  }

  const handleEstimateUpdateParams = async () => {
    if (!selectedETF) return

    if (!imbalanceThresholdBps || parseFloat(imbalanceThresholdBps) < 0) {
      toast.error("Please enter a valid imbalance threshold (BPS)")
      return
    }

    if (!maxPriceStaleness || parseFloat(maxPriceStaleness) < 0) {
      toast.error("Please enter a valid max price staleness")
      return
    }

    if (!rebalanceCooldown || parseFloat(rebalanceCooldown) < 0) {
      toast.error("Please enter a valid rebalance cooldown (seconds)")
      return
    }

    if (!maxCapacityUSD || parseFloat(maxCapacityUSD) < 0) {
      toast.error("Please enter a valid max capacity USD")
      return
    }

    try {
      // Convert maxCapacityUSD to wei (18 decimals)
      const maxCapacityMultiplier = BigInt(10) ** BigInt(18)
      const [integerPart = "0", fractionalPart = ""] = maxCapacityUSD.split(".")
      const paddedFractional = fractionalPart
        .padEnd(18, "0")
        .slice(0, 18)
      const maxCapacityUSDWei = (
        BigInt(integerPart) * maxCapacityMultiplier +
        BigInt(paddedFractional)
      ).toString()

      await estimateUpdateParams({
        factory: selectedETF.factory,
        vault: selectedETF.vault,
        imbalanceThresholdBps,
        maxPriceStaleness,
        rebalanceCooldown,
        maxCapacityUSD: maxCapacityUSDWei
      })
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to validate parameters"
      toast.error(errorMessage)
      throw error
    }
  }

  const handleConfirmUpdateParams = async () => {
    if (!selectedETF) return

    if (!imbalanceThresholdBps || parseFloat(imbalanceThresholdBps) < 0) {
      toast.error("Please enter a valid imbalance threshold (BPS)")
      return
    }

    if (!maxPriceStaleness || parseFloat(maxPriceStaleness) < 0) {
      toast.error("Please enter a valid max price staleness")
      return
    }

    if (!rebalanceCooldown || parseFloat(rebalanceCooldown) < 0) {
      toast.error("Please enter a valid rebalance cooldown (seconds)")
      return
    }

    if (!maxCapacityUSD || parseFloat(maxCapacityUSD) < 0) {
      toast.error("Please enter a valid max capacity USD")
      return
    }

    try {
      // First estimate to validate
      await handleEstimateUpdateParams()

      // Convert maxCapacityUSD to wei (18 decimals)
      const maxCapacityMultiplier = BigInt(10) ** BigInt(18)
      const [integerPart = "0", fractionalPart = ""] = maxCapacityUSD.split(".")
      const paddedFractional = fractionalPart
        .padEnd(18, "0")
        .slice(0, 18)
      const maxCapacityUSDWei = (
        BigInt(integerPart) * maxCapacityMultiplier +
        BigInt(paddedFractional)
      ).toString()

      // If estimation succeeds, proceed with the update
      await updateParams({
        factory: selectedETF.factory,
        vault: selectedETF.vault,
        imbalanceThresholdBps,
        maxPriceStaleness,
        rebalanceCooldown,
        maxCapacityUSD: maxCapacityUSDWei
      })

      toast.success(`Successfully updated parameters for ${selectedETF.symbol}`)
      setUpdateParamsModalOpen(false)
      setImbalanceThresholdBps("")
      setMaxPriceStaleness("")
      setRebalanceCooldown("")
      setMaxCapacityUSD("")
      setSelectedETF(null)
      setCurrentImbalanceThresholdBps(null)
      setCurrentMaxPriceStaleness(null)
      setCurrentRebalanceCooldown(null)
      setCurrentMaxCapacityUSD(null)
      setUpdateParamsError(null)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update parameters"
      toast.error(errorMessage)
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "success"
      case "medium":
        return "primary"
      case "high":
        return "danger"
      default:
        return "primary"
    }
  }

  const getExplorerUrl = (address: string, chainId: number) => {
    switch (chainId) {
      case 1: // Ethereum Mainnet
        return `https://etherscan.io/address/${address}`
      case 42161: // Arbitrum One
        return `https://arbiscan.io/address/${address}`
      default:
        return `https://etherscan.io/address/${address}`
    }
  }

  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 1:
        return "Ethereum"
      case 42161:
        return "Arbitrum"
      default:
        return `Chain ${chainId}`
    }
  }

  return (
    <div className={s.page}>
      <div className={s.statsHeader}>
        <div className={s.stat}>
          <span className={s.label}>Total ETFs</span>
          <span className={s.statValue}>
            {statsData?.data?.totalEtfs ?? pagination.total}
          </span>
        </div>
        <div className={s.stat}>
          <span className={s.label}>Total TVL</span>
          <span className={s.statValue}>
            ${statsData?.data?.totalTVL 
              ? formatTokenSupply(statsData.data.totalTVL.toFixed(2), 0, 2)
              : formatTokenSupply(filteredAndSortedETFs
                  .reduce(
                    (sum, etf) => sum + Number(etf.tvl),
                    0
                  )
                  .toFixed(2), 0, 2)}
          </span>
        </div>
        <div className={s.stat}>
          <span className={s.label}>Total Daily Volume</span>
          <span className={s.statValue}>
            ${statsData?.data?.totalDailyVolume
              ? formatTokenSupply(statsData.data.totalDailyVolume.toFixed(2), 0, 2)
              : formatTokenSupply(filteredAndSortedETFs.reduce(
                  (sum, etf) => sum + etf.dailyVolumeUSD,
                  0
                ).toFixed(2), 0, 2)}
          </span>
        </div>
      </div>

      <div className={s.headingWrapper}>
        <Heading
          icon="hugeicons:store-01"
          title="ETF Marketplace"
          description="Browse and trade available ETF baskets. Buy, sell, mint, or withdraw your positions."
        />
      </div>

      <div className={s.filterCardContent}>
        <div className={s.filterGrid}>
          <div className={s.searchWrapper}>
            <Input
              icon="hugeicons:search-01"
              placeholder="Search ETFs by name, symbol or description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={s.searchInput}
            />
          </div>

          <Select
            options={categories.map((cat) => ({
              value: cat,
              label: cat.charAt(0).toUpperCase() + cat.slice(1)
            }))}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          />

          <Select
            options={riskLevels.map((risk) => ({
              value: risk,
              label: risk.charAt(0).toUpperCase() + risk.slice(1)
            }))}
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
          />

          <Select
            options={[
              { value: "tvl", label: "Sort by TVL" },
              { value: "apy", label: "Sort by APY" },
              { value: "change24h", label: "Sort by 24h Change" }
            ]}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <DataState type="loading" message="Loading ETFs..." />
      ) : error ? (
        <DataState type="error" message={error} />
      ) : filteredAndSortedETFs.length === 0 ? (
        <DataState
          type="empty"
          message="No ETFs Found"
          icon="hugeicons:inbox-01"
        />
      ) : (
        <div className={s.etfsGrid}>
          {filteredAndSortedETFs.map((etf) => (
            <Card key={etf.id} className={s.etfCard}>
              <BorderAnimate className={s.hover} />
              {CHAIN_CONFIG[etf.chain]?.abbreviatedName && (
                <Image
                  src={`/img/chains/${CHAIN_CONFIG[etf.chain].abbreviatedName}.png`}
                  alt={CHAIN_CONFIG[etf.chain].name}
                  width={32}
                  height={32}
                  className={s.chainLogo}
                  title={`${CHAIN_CONFIG[etf.chain].name} Network`}
                />
              )}
              <Card className={s.cardHeader}>
                <div className={s.etfTitle}>
                  <div className={s.titleRow}>
                    {etf.tokens.length > 0 && (
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
                            width={32}
                            height={32}
                          />
                        ) : null
                      })}
                      </div>
                    )}
                    <div className={s.titleRowRight}>
                      <h3>
                        <Link href={routes.etfDetails(etf.vault)} className={s.titleLink}>
                          {etf.name}
                        </Link>
                      </h3>
                      <p className={s.description}>{etf.description}</p>
                    </div>
                  </div>
                </div>
                {/* <span className={s.symbol}>
                  <Icon icon="hugeicons:link-square-01" />{etf.symbol} <BorderAnimate />
                </span> */}
                <a
                    href={getExplorerUrl(etf.shareToken, etf.chain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.symbol}
                    title={`View on ${getChainName(etf.chain)} explorer`}
                  >
                    <Icon icon="hugeicons:link-square-01" />
                    {etf.symbol} <BorderAnimate />
                </a>
                <div className={s.badges}>
                  <Badge status={getRiskColor(etf.riskLevel)}>
                    {etf.riskLevel.toUpperCase()}
                  </Badge>
                  <a
                    href={getExplorerUrl(etf.vault, etf.chain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.explorerLink}
                    title={`View on ${getChainName(etf.chain)} explorer`}
                  >
                    <Icon icon="hugeicons:link-square-01" />
                    vault
                  </a>
                  <a
                    href={getExplorerUrl(etf.pricer, etf.chain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.explorerLink}
                    title={`View on ${getChainName(etf.chain)} explorer`}
                  >
                    <Icon icon="hugeicons:link-square-01" />
                    pricer
                  </a>
                  {etf.depositCount !== undefined && etf.redeemCount !== undefined && 
                   (etf.depositCount === 0 || etf.redeemCount === 0) && (
                    <Badge status="warning">
                      Not Tested
                    </Badge>
                  )}
                </div>
                <div className={s.metricsGrid}>
                  <Card className={s.metric}>
                    <span className={s.metricLabel}>TVL</span>
                    <span className={s.metricValue}>
                      {"$" + formatTokenAmount(etf.tvl)}
                    </span>
                  </Card>
                  <Card className={s.metric}>
                    <span className={s.metricLabel}>Supply</span>
                    <span className={s.metricValue}>
                      {formatTokenSupply(`${etf.totalSupply}`, 18, 4)}
                    </span>
                  </Card>
                  <Card className={s.metric}>
                    <span className={s.metricLabel}>24h Change</span>
                    <span
                      className={`${s.metricValue} ${
                        (etf.priceChange24h ?? etf.change24h) >= 0 ? s.positive : s.negative
                      }`}
                    >
                      {(etf.priceChange24h ?? etf.change24h) >= 0 ? "+" : ""}
                      {(etf.priceChange24h ?? etf.change24h).toFixed(2)}%
                    </span>
                  </Card>
                  <Card className={s.metric}>
                    <span className={s.metricLabel}>Price</span>
                    <span className={s.metricValue}>
                      {"$" + formatTokenAmount(etf.sharePrice)}
                    </span>
                  </Card>
                </div>
              </Card>

              {etf.tokens.length > 0 ? (
                <div className={s.composition}>
                  <h4>
                    Composition <span>{etf.tokens.length} tokens</span>
                    {etf.owner && address && etf.owner.toLowerCase() === address.toLowerCase() && (
                      <Button
                        variant="secondary"
                        size="xsmall"
                        onClick={() => handleOpenUpdateParamsModal(etf)}
                        iconLeft="hugeicons:settings-01"
                        title="Update Parameters"
                      />
                    )}
                  </h4>
                  <div className={s.tokens}>
                    {etf.tokens.map((token) => {
                      // Calculate total TVL of all assets
                      const totalTVL = etf.tokens.reduce(
                        (sum, t) => sum + parseFloat(t.tvl || "0"),
                        0
                      )
                      // Calculate current percentage based on TVL
                      const currentPercentage =
                        totalTVL > 0
                          ? (parseFloat(token.tvl || "0") / totalTVL) * 100
                          : 0
                      const targetPercentage = token.percentage

                      const logo = tokenData[token.symbol.toLowerCase()]?.logo

                      return (
                        <div
                          key={token.symbol}
                          className={s.token}
                          onMouseEnter={() => {
                            setHoveredToken({
                              targetPercentage,
                              currentPercentage,
                              tvl: token.tvl
                            })
                          }}
                          onMouseLeave={() => {
                            setHoveredToken(null)
                          }}
                        >
                        <div className={s.tokenInfo}>
                          {logo && (
                            <Image
                              src={logo}
                              alt={token.symbol}
                              className={s.tokenLogoSmall}
                              width={24}
                              height={24}
                            />
                          )}
                          <span className={s.tokenSymbol}>
                            {token.symbol}
                          </span>
                        </div>
                          <div className={s.percentageBar}>
                            <div
                              className={s.percentageFill}
                              style={{ width: `${currentPercentage}%` }}
                              title={`Target: ${targetPercentage.toFixed(
                                2
                              )}% | Current: ${currentPercentage.toFixed(2)}%`}
                            />
                            <div
                              className={s.currentMarker}
                              style={{ left: `${currentPercentage}%` }}
                              title={`Current: ${currentPercentage.toFixed(
                                2
                              )}%`}
                            />
                          </div>
                          <span className={s.percentage}>
                            {targetPercentage}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className={s.composition}>
                  <h4>ETF Details</h4>
                  <div className={s.tokens}>
                    <div className={s.token}>
                      <span className={s.tokenSymbol}>Vault</span>
                      <div className={s.percentageBar}>
                        <div
                          className={s.percentageFill}
                          style={{ width: "100%" }}
                        />
                      </div>
                      <span className={s.percentage}>
                        {etf.vault.slice(0, 6)}...{etf.vault.slice(-4)}
                      </span>
                    </div>
                    <div className={s.token}>
                      <span className={s.tokenSymbol}>Share Token</span>
                      <div className={s.percentageBar}>
                        <div
                          className={s.percentageFill}
                          style={{ width: "100%" }}
                        />
                      </div>
                      <span className={s.percentage}>
                        {etf.shareToken.slice(0, 6)}...
                        {etf.shareToken.slice(-4)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <Card className={s.actions}>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => handleOpenRebalanceModal(etf)}
                  disabled={
                    !isWalletConnected ||
                    !isETFChainMatch(etf) ||
                    isContractLoading
                  }
                  iconLeft="hugeicons:reload"
                />
                <Button
                  variant="primary"
                  size="small"
                  className={s.buyAction}
                  onClick={() => handleBuy(etf)}
                  disabled={
                    !isWalletConnected ||
                    !isETFChainMatch(etf) ||
                    isContractLoading
                  }
                  iconLeft="hugeicons:download-01"
                >
                  Buy
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => handleSell(etf)}
                  disabled={
                    !isWalletConnected ||
                    !isETFChainMatch(etf) ||
                    isContractLoading
                  }
                  icon="hugeicons:upload-01"
                />
              </Card>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && pagination.totalPages > 1 && (
        <div className={s.pagination}>
          <Button
            variant="secondary"
            icon="hugeicons:arrow-left-01"
            border
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || !pagination.hasPreviousPage}
          />

          <div className={s.paginationInfo}>
            <div className={s.pageNumbers}>
            {(() => {
              const pages: (number | string)[] = []
              const totalPages = pagination.totalPages
              const maxVisible = 5

              if (totalPages <= maxVisible) {
                // Show all pages if total is 5 or less
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i)
                }
              } else {
                // Always show first page
                pages.push(1)

                if (currentPage <= 3) {
                  // Near the beginning
                  for (let i = 2; i <= 4; i++) {
                    pages.push(i)
                  }
                  pages.push("ellipsis")
                  pages.push(totalPages)
                } else if (currentPage >= totalPages - 2) {
                  // Near the end
                  pages.push("ellipsis")
                  for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i)
                  }
                } else {
                  // In the middle
                  pages.push("ellipsis")
                  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i)
                  }
                  pages.push("ellipsis")
                  pages.push(totalPages)
                }
              }

              return pages.map((page, index) => {
                if (page === "ellipsis") {
                  return (
                    <span key={`ellipsis-${index}`} className={s.ellipsis}>
                      ...
                    </span>
                  )
                }
                return (
                  <button
                    key={page}
                    className={clsx(
                      s.pageButton,
                      currentPage === page && s.active
                    )}
                    onClick={() => setCurrentPage(page as number)}
                  >
                    {page}
                  </button>
                )
              })
            })()}
            </div>
            <div className={s.pageInfo}>
              Page {pagination.page} sur {pagination.totalPages}
            </div>
          </div>

          <Button
            variant="secondary"
            iconRight="hugeicons:arrow-right-01"
            border
            onClick={() =>
              setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))
            }
            disabled={currentPage === pagination.totalPages || !pagination.hasNextPage}
          />
        </div>
      )}

      {/* Buy Modal */}
      <BuyETFModal
        open={buyModalOpen}
        onClose={() => {
          setBuyModalOpen(false)
          setSelectedETF(null)
        }}
        etf={selectedETF}
      />

      {/* Sell Modal */}
      <SellETFModal
        open={sellModalOpen}
        onClose={() => {
          setSellModalOpen(false)
          setSelectedETF(null)
        }}
        etf={selectedETF}
      />

      {/* Update Params Modal */}
      <Modal
        open={updateParamsModalOpen}
        onClose={() => {
          setUpdateParamsModalOpen(false)
          setSelectedETF(null)
          setImbalanceThresholdBps("")
          setMaxPriceStaleness("")
          setRebalanceCooldown("")
          setMaxCapacityUSD("")
          setCurrentImbalanceThresholdBps(null)
          setCurrentMaxPriceStaleness(null)
          setCurrentRebalanceCooldown(null)
          setCurrentMaxCapacityUSD(null)
          setUpdateParamsError(null)
        }}
        title={`Update Parameters - ${selectedETF?.symbol || ""}`}
      >
        <div className={s.modalContent}>
          <p className={s.modalDescription}>
            Update vault parameters for this ETF. Only the owner can modify these settings.
          </p>

          {isLoadingCurrentParams ? (
            <div style={{ padding: "1rem", textAlign: "center" }}>
              Loading current parameters...
            </div>
          ) : (
            <>
              {currentImbalanceThresholdBps !== null && currentMaxPriceStaleness !== null && (
                <div style={{
                  padding: "0.75rem 1rem",
                  background: "var(--background-low)",
                  borderRadius: "var(--radius-s)",
                  border: "1px solid var(--border-light)",
                  marginBottom: "1rem"
                }}>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                    Current Values:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div style={{ fontSize: "0.85rem" }}>
                      <strong>Imbalance Threshold:</strong> {currentImbalanceThresholdBps} BPS
                    </div>
                    <div 
                      style={{ fontSize: "0.85rem" }}
                      title={`${(parseInt(currentMaxPriceStaleness || "0") / 60).toFixed(2)} minutes, ${(parseInt(currentMaxPriceStaleness || "0") / 3600).toFixed(2)} hours, ${((parseInt(currentMaxPriceStaleness || "0") / 3600) / 24).toFixed(2)} days`}
                    >
                      <strong>Max Price Staleness:</strong> {currentMaxPriceStaleness} seconds
                    </div>
                    {currentRebalanceCooldown !== null && (
                      <div 
                        style={{ fontSize: "0.85rem" }}
                        title={`${(parseInt(currentRebalanceCooldown || "0") / 60).toFixed(2)} minutes, ${(parseInt(currentRebalanceCooldown || "0") / 3600).toFixed(2)} hours, ${((parseInt(currentRebalanceCooldown || "0") / 3600) / 24).toFixed(2)} days`}
                      >
                        <strong>Rebalance Cooldown:</strong> {currentRebalanceCooldown} seconds
                      </div>
                    )}
                    {currentMaxCapacityUSD !== null && (
                      <div style={{ fontSize: "0.85rem" }}>
                        <strong>Max Capacity USD:</strong> ${(Number(currentMaxCapacityUSD) / 1e18).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {updateParamsError && (
                <div style={{
                  padding: "0.75rem 1rem",
                  background: "var(--danger-lowest)",
                  border: "1px solid var(--danger-low)",
                  borderRadius: "var(--radius-s)",
                  color: "var(--danger-high)",
                  marginBottom: "1rem",
                  fontSize: "0.9rem"
                }}>
                  {updateParamsError}
                </div>
              )}

              <Input
                label="Imbalance Threshold (BPS)"
                type="text"
                inputMode="numeric"
                placeholder="e.g., 100"
                value={imbalanceThresholdBps}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, "")
                  setImbalanceThresholdBps(value)
                  setUpdateParamsError(null)
                }}
                icon="hugeicons:percent"
                helperText="Basis Points (1 BPS = 0.01%)"
              />

              <Input
                label="Max Price Staleness"
                type="text"
                inputMode="numeric"
                placeholder="e.g., 3600"
                value={maxPriceStaleness}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, "")
                  setMaxPriceStaleness(value)
                  setUpdateParamsError(null)
                }}
                icon="hugeicons:clock-01"
                helperText="Maximum age of price data in seconds"
              />

              <Input
                label="Rebalance Cooldown"
                type="text"
                inputMode="numeric"
                placeholder="e.g., 3600"
                value={rebalanceCooldown}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, "")
                  setRebalanceCooldown(value)
                  setUpdateParamsError(null)
                }}
                icon="hugeicons:timer-01"
                helperText="Minimum time between rebalances in seconds"
              />

              <Input
                label="Max Capacity USD"
                type="text"
                inputMode="decimal"
                placeholder="e.g., 1000000"
                value={maxCapacityUSD}
                onChange={(e) => {
                  const validatedValue = validateDecimalInput(e.target.value, 18)
                  setMaxCapacityUSD(validatedValue)
                  setUpdateParamsError(null)
                }}
                icon="hugeicons:dollar-circle"
                helperText="Maximum total value in USD (with 18 decimals)"
              />

              <div className={s.modalActions}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setUpdateParamsModalOpen(false)
                    setSelectedETF(null)
                    setImbalanceThresholdBps("")
                    setMaxPriceStaleness("")
                    setRebalanceCooldown("")
                    setMaxCapacityUSD("")
                    setCurrentImbalanceThresholdBps(null)
                    setCurrentMaxPriceStaleness(null)
                    setCurrentRebalanceCooldown(null)
                    setCurrentMaxCapacityUSD(null)
                    setUpdateParamsError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmUpdateParams}
                  disabled={isContractLoading || !imbalanceThresholdBps || !maxPriceStaleness || !rebalanceCooldown || !maxCapacityUSD}
                  iconLeft={
                    isContractLoading
                      ? "hugeicons:loading-01"
                      : "hugeicons:checkmark-circle-02"
                  }
                >
                  {isContractLoading ? "Processing..." : "Confirm Update"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Rebalance Modal */}
      <Modal
        open={rebalanceModalOpen}
        onClose={() => {
          setRebalanceModalOpen(false)
          setSelectedETF(null)
          setRebalancePreview(null)
          setRebalanceError(null)
        }}
        title={`Rebalance ${selectedETF?.symbol || ""}`}
      >
        <div className={s.modalContent}>
          <p className={s.modalDescription}>
            Rebalance the ETF to align asset weights with target allocations.
          </p>

          {isEstimatingRebalance ? (
            <div style={{ padding: "1rem", textAlign: "center" }}>
              <Icon icon="hugeicons:loading-01" style={{ fontSize: "2rem", animation: "spin 1s linear infinite" }} />
              <p style={{ marginTop: "0.5rem" }}>Estimating rebalance...</p>
            </div>
          ) : rebalanceError ? (
            <div style={{
              padding: "1rem",
              background: rebalanceError === "Rebalance is not necessary at the moment." 
                ? "var(--primary-lowest)" 
                : "var(--danger-lowest)",
              border: `1px solid ${rebalanceError === "Rebalance is not necessary at the moment." 
                ? "var(--primary-low)" 
                : "var(--danger-low)"}`,
              borderRadius: "var(--radius-s)",
              color: rebalanceError === "Rebalance is not necessary at the moment." 
                ? "var(--primary-high)" 
                : "var(--danger-high)",
              marginBottom: "1rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <Icon icon={rebalanceError === "Rebalance is not necessary at the moment." 
                  ? "hugeicons:information-circle" 
                  : "hugeicons:alert-circle"} />
                <strong>{rebalanceError === "Rebalance is not necessary at the moment." ? "Information" : "Error"}</strong>
              </div>
              <p style={{ fontSize: "0.9rem", margin: 0 }}>{rebalanceError}</p>
            </div>
          ) : rebalancePreview ? (
            <>
              {/* Summary */}
              <div style={{
                padding: "0.75rem 1rem",
                background: "var(--background-low)",
                borderRadius: "var(--radius-s)",
                border: "1px solid var(--border-light)",
                marginBottom: "1rem"
              }}>
                <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                  Rebalance Summary:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <div style={{ fontSize: "0.85rem", display: "flex", justifyContent: "space-between" }}>
                    <span>Total Sold Value:</span>
                    <strong>
                      ${(Number(rebalancePreview.totalSoldValueUSD) / 1e18).toFixed(2)}
                    </strong>
                  </div>
                  <div style={{ fontSize: "0.85rem", display: "flex", justifyContent: "space-between" }}>
                    <span>Total Bought Value:</span>
                    <strong>
                      ${(Number(rebalancePreview.totalBoughtValueUSD) / 1e18).toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Tokens to be sold */}
              {rebalancePreview.soldAmounts.length > 0 && selectedETF?.assets && (
                <div className={s.tokenDistribution} style={{ marginBottom: "1rem" }}>
                  <div className={s.tokenDistributionHeader}>
                    <Icon icon="hugeicons:arrow-down-01" />
                    <span>Tokens to be Sold</span>
                  </div>
                  <div className={s.tokenDistributionList}>
                    {selectedETF.assets.map((asset, index) => {
                      if (index >= rebalancePreview.soldAmounts.length) return null
                      
                      const soldAmount = rebalancePreview.soldAmounts[index]
                      const soldValueUSD = rebalancePreview.soldValuesUSD[index]
                      
                      if (!soldAmount || soldAmount === "0") return null
                      
                      const decimals = asset.decimals || 18
                      const multiplier = BigInt(10) ** BigInt(decimals)
                      const amountNumber = Number(BigInt(soldAmount)) / Number(multiplier)
                      const valueNumber = Number(BigInt(soldValueUSD || "0")) / 1e18
                      
                      const logo = tokenData?.[asset.symbol.toLowerCase()]?.logo
                      
                      return (
                        <div key={`sold-${asset.token}`} className={s.tokenDistributionItem}>
                          <div className={s.tokenInfo}>
                            {logo ? (
                              <Image
                                src={logo}
                                alt={asset.symbol}
                                width={20}
                                height={20}
                                className={s.tokenLogo}
                              />
                            ) : (
                              <div className={s.tokenLogo} style={{
                                backgroundColor: `var(--${getAssetColor(asset.symbol)})`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: '600'
                              }}>
                                {asset.symbol.charAt(0)}
                              </div>
                            )}
                            <span className={s.tokenSymbol}>{asset.symbol}</span>
                          </div>
                          <div className={s.tokenAmounts}>
                            <span className={s.tokenAmount} style={{ color: "var(--danger-high)" }}>
                              -{amountNumber.toFixed(6)} {asset.symbol}
                            </span>
                            <span className={s.tokenValue}>
                              ≈ ${valueNumber.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tokens to be bought */}
              {rebalancePreview.boughtAmounts.length > 0 && selectedETF?.assets && (
                <div className={s.tokenDistribution} style={{ marginBottom: "1rem" }}>
                  <div className={s.tokenDistributionHeader}>
                    <Icon icon="hugeicons:arrow-up-01" />
                    <span>Tokens to be Bought</span>
                  </div>
                  <div className={s.tokenDistributionList}>
                    {selectedETF.assets.map((asset, index) => {
                      if (index >= rebalancePreview.boughtAmounts.length) return null
                      
                      const boughtAmount = rebalancePreview.boughtAmounts[index]
                      const boughtValueUSD = rebalancePreview.boughtValuesUSD[index]
                      
                      if (!boughtAmount || boughtAmount === "0") return null
                      
                      const decimals = asset.decimals || 18
                      const multiplier = BigInt(10) ** BigInt(decimals)
                      const amountNumber = Number(BigInt(boughtAmount)) / Number(multiplier)
                      const valueNumber = Number(BigInt(boughtValueUSD || "0")) / 1e18
                      
                      const logo = tokenData?.[asset.symbol.toLowerCase()]?.logo
                      
                      return (
                        <div key={`bought-${asset.token}`} className={s.tokenDistributionItem}>
                          <div className={s.tokenInfo}>
                            {logo ? (
                              <Image
                                src={logo}
                                alt={asset.symbol}
                                width={20}
                                height={20}
                                className={s.tokenLogo}
                              />
                            ) : (
                              <div className={s.tokenLogo} style={{
                                backgroundColor: `var(--${getAssetColor(asset.symbol)})`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: '600'
                              }}>
                                {asset.symbol.charAt(0)}
                              </div>
                            )}
                            <span className={s.tokenSymbol}>{asset.symbol}</span>
                          </div>
                          <div className={s.tokenAmounts}>
                            <span className={s.tokenAmount} style={{ color: "var(--success-high)" }}>
                              +{amountNumber.toFixed(6)} {asset.symbol}
                            </span>
                            <span className={s.tokenValue}>
                              ≈ ${valueNumber.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {rebalancePreview.soldAmounts.length === 0 && rebalancePreview.boughtAmounts.length === 0 && (
                <div style={{
                  padding: "1rem",
                  background: "var(--background-low)",
                  borderRadius: "var(--radius-s)",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  marginBottom: "1rem"
                }}>
                  No rebalancing needed. All assets are within target weights.
                </div>
              )}

              <div className={s.modalActions}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRebalanceModalOpen(false)
                    setSelectedETF(null)
                    setRebalancePreview(null)
                    setRebalanceError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmRebalance}
                  disabled={isContractLoading || (!!rebalanceError && rebalanceError !== "Rebalance is not necessary at the moment.")}
                  iconLeft={
                    isContractLoading
                      ? "hugeicons:loading-01"
                      : "hugeicons:checkmark-circle-02"
                  }
                >
                  {isContractLoading ? "Processing..." : "Execute Rebalance"}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      {hoveredToken &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className={s.tokenTooltipFixed}
            style={{
              left: `${mousePosition.x + 10}px`,
              top: `${mousePosition.y + 10}px`
            }}
          >
            <div className={s.tooltipContent}>
              <div>
                Target:{" "}
                <strong>{hoveredToken.targetPercentage.toFixed(2)}%</strong>
              </div>
              <div>
                Current:{" "}
                <strong>{hoveredToken.currentPercentage.toFixed(2)}%</strong>
              </div>
              <div>
                TVL: <strong>${formatTokenAmount(hoveredToken.tvl)}</strong>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
