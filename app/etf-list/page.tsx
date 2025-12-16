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
import { ETHEREUM_NETWORK_ID } from "@/config/app"
import { erc20Abi } from "@/constant/helios-contracts"
import { fetchETFs, type ETFResponse } from "@/helpers/request"
import { useETFContract } from "@/hooks/useETFContract"
import { useWeb3Provider } from "@/hooks/useWeb3Provider"
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

interface ETF {
  factory: string
  id: string
  name: string
  symbol: string
  description: string
  tvl: number
  volumeTradedUSD: number
  totalSupply: string
  sharePrice: string
  apy: string
  change24h: number
  riskLevel: "low" | "medium" | "high"
  category: string
  tokens: Array<{
    symbol: string
    percentage: number
    tvl: string
  }>
  price: string
  vault: string
  shareToken: string
  depositToken: string
  depositSymbol: string
  depositDecimals: number
  chain: number
  assets?: Array<{
    token: string
    symbol: string
    decimals: number
    targetWeightBps: number
  }>
}

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
    apy: "0%", // Not available in API response
    change24h: 0, // Not available in API response
    riskLevel: "medium" as const, // Default value
    category: "ETF", // Default category
    tokens,
    price: etf.sharePrice ? `$${etf.sharePrice}` : "$0.00", // Use sharePrice for price display
    vault: etf.vault,
    shareToken: etf.shareToken,
    depositToken: etf.depositToken,
    depositSymbol: etf.depositSymbol || "TOKEN",
    depositDecimals: etf.depositDecimals || 18,
    chain: etf.chain,
    assets
  }
}

export default function ETFList() {
  const chainId = useChainId()
  const { address } = useAccount()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEventListener("mousemove", (e: MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY })
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedRisk, setSelectedRisk] = useState("all")
  const [sortBy, setSortBy] = useState("tvl")
  const [etfs, setEtfs] = useState<ETF[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, ] = useState(1)
  const [pageSize] = useState(10)
  const [, setPagination] = useState({
    page: 1,
    size: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  })

  const [buyModalOpen, setBuyModalOpen] = useState(false)
  const [sellModalOpen, setSellModalOpen] = useState(false)
  const [selectedETF, setSelectedETF] = useState<ETF | null>(null)
  const [buyAmount, setBuyAmount] = useState("")
  const [sellShares, setSellShares] = useState("")
  const [minSharesOut, setMinSharesOut] = useState("")
  const [minOut, setMinOut] = useState("")
  const [slippageBuy, setSlippageBuy] = useState(0.25) // Default 0.25%
  const [slippageSell, setSlippageSell] = useState(0.25) // Default 0.25%
  const [depositTokenBalance, setDepositTokenBalance] = useState<string | null>(
    null
  )
  const [shareTokenBalance, setShareTokenBalance] = useState<string | null>(
    null
  )
  const [, setIsLoadingBalance] = useState(false)
  const [depositTokenAllowance, setDepositTokenAllowance] =
    useState<boolean>(false)
  const [shareTokenAllowance, setShareTokenAllowance] = useState<boolean>(false)
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false)
  const [estimatedAmountsOut, setEstimatedAmountsOut] = useState<string[]>([])
  const [estimatedValuesPerAsset, setEstimatedValuesPerAsset] = useState<string[]>([])
  const [estimatedSoldAmounts, setEstimatedSoldAmounts] = useState<string[]>([])
  const [impermanentLossPercentage, setImpermanentLossPercentage] = useState<number | null>(null)
  const [hoveredToken, setHoveredToken] = useState<{
    targetPercentage: number
    currentPercentage: number
    tvl: string
  } | null>(null)

  const {
    deposit,
    redeem,
    rebalance,
    approveToken,
    estimateDepositShares,
    estimateRedeemDeposit,
    isLoading: isContractLoading
  } = useETFContract()
  const web3Provider = useWeb3Provider()
  const [isEstimatingShares, setIsEstimatingShares] = useState(false)
  const [isEstimatingDeposit, setIsEstimatingDeposit] = useState(false)

  const isEthereumNetwork = chainId === ETHEREUM_NETWORK_ID
  const isWalletConnected = !!address

  const isETFChainMatch = (etf: ETF) => {
    return chainId === etf.chain
  }

  // Fetch token data for all unique symbols
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
  })

  // Calculate total value from valuesPerAsset
  const totalEstimatedValue = useMemo(() => {
    if (estimatedValuesPerAsset.length === 0) return null
    
    try {
      const total = estimatedValuesPerAsset.reduce((sum, value) => {
        if (!value || value === "0") return sum
        return sum + BigInt(value)
      }, 0n)
      
      // valuesPerAsset are in USD with 18 decimals
      const multiplier = BigInt(10) ** BigInt(18)
      const totalNumber = Number(total) / Number(multiplier)
      return totalNumber
    } catch (error) {
      console.error("Error calculating total value:", error)
      return null
    }
  }, [estimatedValuesPerAsset])


  // Format number to string without scientific notation
  const formatNumberToString = (
    num: number,
    maxDecimals: number = 18
  ): string => {
    if (num === 0) return "0"

    // Use toFixed with max decimals to avoid scientific notation
    let str = num.toFixed(maxDecimals)

    // Remove trailing zeros
    str = str.replace(/\.?0+$/, "")

    return str
  }

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

  const fetchTokenBalance = async (
    tokenAddress: string,
    decimals: number
  ): Promise<string | null> => {
    if (!web3Provider || !address) return null

    try {
      const tokenContract = new web3Provider.eth.Contract(
        erc20Abi as any,
        tokenAddress
      )
      const balance = await tokenContract.methods.balanceOf(address).call()
      console.log("balance", balance)
      // Web3.js returns balance as a string or BigInt, convert to BigInt
      const balanceStr = String(balance)
      const balanceBigInt = BigInt(balanceStr)
      const balanceMultiplier = BigInt(10) ** BigInt(decimals)

      // Use BigInt division to preserve precision
      // Calculate integer and fractional parts separately to avoid precision loss
      const integerPart = balanceBigInt / balanceMultiplier
      const remainder = balanceBigInt % balanceMultiplier

      // Convert remainder to a decimal string with proper padding
      const remainderStr = remainder.toString().padStart(decimals, "0")
      // Take only the significant digits (remove trailing zeros)
      const remainderTrimmed = remainderStr.replace(/0+$/, "")

      // Build the decimal number as a string first, then parse
      const decimalString =
        remainderTrimmed.length > 0
          ? `${integerPart.toString()}.${remainderTrimmed}`
          : integerPart.toString()

      // Return as string to preserve full precision
      return decimalString
    } catch (error) {
      console.error("Error fetching token balance:", error)
      return null
    }
  }

  const checkAllowance = async (
    tokenAddress: string,
    spenderAddress: string,
    amount: string
  ): Promise<boolean> => {
    if (!web3Provider || !address) return false

    try {
      const tokenContract = new web3Provider.eth.Contract(
        erc20Abi as any,
        tokenAddress
      )
      const allowanceStr: string = await tokenContract.methods
        .allowance(address, spenderAddress)
        .call()
      const allowance = BigInt(allowanceStr)
      const requiredAmount = BigInt(amount)
      return allowance >= requiredAmount
    } catch (error) {
      console.error("Error checking allowance:", error)
      return false
    }
  }

  useEffect(() => {
    async function loadETFs() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetchETFs(currentPage, pageSize)
        const formattedETFs = response.data.map(formatETFResponse)
        setEtfs(formattedETFs)
        setPagination(response.pagination)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load ETFs"
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadETFs()
  }, [currentPage, pageSize])

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

  const handleBuy = async (etf: ETF) => {
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
    setBuyAmount("")
    setMinSharesOut("")
    setDepositTokenBalance(null)
    setDepositTokenAllowance(false)
    setBuyModalOpen(true)

    // Fetch deposit token balance
    setIsLoadingBalance(true)
    const balance = await fetchTokenBalance(
      etf.depositToken,
      etf.depositDecimals
    )
    setDepositTokenBalance(balance)
    setIsLoadingBalance(false)
  }

  const handleSell = async (etf: ETF) => {
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
    setSellShares("")
    setMinOut("")
    setShareTokenBalance(null)
    setShareTokenAllowance(false)
    setSellModalOpen(true)

    // Fetch share token balance
    setIsLoadingBalance(true)
    const balance = await fetchTokenBalance(etf.shareToken, 18) // Share tokens typically have 18 decimals
    console.log("balance", balance)
    setShareTokenBalance(balance)
    setIsLoadingBalance(false)
  }

  const handleApproveBuy = async () => {
    if (!selectedETF) return

    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    try {
      // Convert amount using correct decimals for deposit token
      const depositDecimals = selectedETF.depositDecimals || 18
      const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
      const [integerPart = "0", fractionalPart = ""] = buyAmount.split(".")
      const paddedFractional = fractionalPart
        .padEnd(depositDecimals, "0")
        .slice(0, depositDecimals)
      const amountWei = (
        BigInt(integerPart) * depositMultiplier +
        BigInt(paddedFractional)
      ).toString()

      await approveToken({
        tokenAddress: selectedETF.depositToken,
        spenderAddress: selectedETF.vault,
        amount: amountWei
      })

      toast.success("Token approved successfully!")
      // Recheck allowance after approval
      const hasAllowance = await checkAllowance(
        selectedETF.depositToken,
        selectedETF.vault,
        amountWei
      )
      setDepositTokenAllowance(hasAllowance)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Approval failed"
      toast.error(errorMessage)
    }
  }

  const handleConfirmBuy = async () => {
    if (!selectedETF) return

    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    if (!minSharesOut || parseFloat(minSharesOut) < 0) {
      toast.error("Please enter a valid minimum shares out")
      return
    }

    try {
      // Convert amount using correct decimals for deposit token
      const depositDecimals = selectedETF.depositDecimals || 18
      const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
      // Convert human-readable amount to wei: multiply by 10^decimals
      // Handle decimal numbers by splitting integer and fractional parts
      const [integerPart = "0", fractionalPart = ""] = buyAmount.split(".")
      const paddedFractional = fractionalPart
        .padEnd(depositDecimals, "0")
        .slice(0, depositDecimals)
      const amountWei = (
        BigInt(integerPart) * depositMultiplier +
        BigInt(paddedFractional)
      ).toString()

      // For shares, assume 18 decimals (standard for ERC20)
      const sharesDecimals = 18
      const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
      const [sharesInteger = "0", sharesFractional = ""] =
        minSharesOut.split(".")
      const paddedSharesFractional = sharesFractional
        .padEnd(sharesDecimals, "0")
        .slice(0, sharesDecimals)
      const minSharesOutWei = (
        BigInt(sharesInteger) * sharesMultiplier +
        BigInt(paddedSharesFractional)
      ).toString()

      const result = await deposit({
        factory: selectedETF.factory,
        vault: selectedETF.vault,
        depositToken: selectedETF.depositToken,
        amount: amountWei,
        minSharesOut: minSharesOutWei
      })

      // Convert shares back from wei to human-readable
      const sharesReceived = Number(result.sharesOut) / Number(sharesMultiplier)

      toast.success(
        `Successfully deposited! Received ${sharesReceived.toFixed(6)} shares`
      )
      setBuyModalOpen(false)
      setBuyAmount("")
      setMinSharesOut("")
      setSelectedETF(null)
      setEstimatedAmountsOut([])
      setEstimatedValuesPerAsset([])
      setImpermanentLossPercentage(null)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Deposit failed"
      toast.error(errorMessage)
    }
  }

  const handleApproveSell = async () => {
    if (!selectedETF) return

    if (!sellShares || parseFloat(sellShares) <= 0) {
      toast.error("Please enter a valid number of shares")
      return
    }

    try {
      // Convert shares to wei (assuming 18 decimals for share token)
      const sharesDecimals = 18
      const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
      const [sharesInteger = "0", sharesFractional = ""] = sellShares.split(".")
      const paddedSharesFractional = sharesFractional
        .padEnd(sharesDecimals, "0")
        .slice(0, sharesDecimals)
      const sharesWei = (
        BigInt(sharesInteger) * sharesMultiplier +
        BigInt(paddedSharesFractional)
      ).toString()

      await approveToken({
        tokenAddress: selectedETF.shareToken,
        spenderAddress: selectedETF.vault,
        amount: sharesWei
      })

      toast.success("Token approved successfully!")
      // Recheck allowance after approval
      const hasAllowance = await checkAllowance(
        selectedETF.shareToken,
        selectedETF.vault,
        sharesWei
      )
      setShareTokenAllowance(hasAllowance)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Approval failed"
      toast.error(errorMessage)
    }
  }

  const handleConfirmSell = async () => {
    if (!selectedETF) return

    if (!sellShares || parseFloat(sellShares) <= 0) {
      toast.error("Please enter a valid number of shares")
      return
    }

    if (!minOut || parseFloat(minOut) < 0) {
      toast.error("Please enter a valid minimum output")
      return
    }

    try {
      // Convert shares to wei (assuming 18 decimals for share token)
      const sharesDecimals = 18
      const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
      const [sharesInteger = "0", sharesFractional = ""] = sellShares.split(".")
      const paddedSharesFractional = sharesFractional
        .padEnd(sharesDecimals, "0")
        .slice(0, sharesDecimals)
      const sharesWei = (
        BigInt(sharesInteger) * sharesMultiplier +
        BigInt(paddedSharesFractional)
      ).toString()

      // Convert minOut using correct decimals for deposit token
      const depositDecimals = selectedETF.depositDecimals || 18
      const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
      const [minOutInteger = "0", minOutFractional = ""] = minOut.split(".")
      const paddedMinOutFractional = minOutFractional
        .padEnd(depositDecimals, "0")
        .slice(0, depositDecimals)
      const minOutWei = (
        BigInt(minOutInteger) * depositMultiplier +
        BigInt(paddedMinOutFractional)
      ).toString()

      const result = await redeem({
        factory: selectedETF.factory,
        vault: selectedETF.vault,
        shareToken: selectedETF.shareToken,
        shares: sharesWei,
        minOut: minOutWei
      })

      // Format the received amount using correct decimals
      const receivedAmount =
        Number(result.depositOut) / Number(depositMultiplier)
      const depositSymbol =
        selectedETF.depositSymbol || selectedETF.depositToken

      toast.success(
        `Successfully redeemed! Received ${receivedAmount.toFixed(
          6
        )} ${depositSymbol} tokens`
      )
      setSellModalOpen(false)
      setSellShares("")
      setMinOut("")
      setSelectedETF(null)
      setShareTokenAllowance(false)
      setEstimatedSoldAmounts([])
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Redeem failed"
      toast.error(errorMessage)
    }
  }

  const handleRebalance = async (etf: ETF) => {
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

    try {
      await rebalance({ factory: etf.factory, vault: etf.vault })
      toast.success(`Successfully rebalanced ${etf.symbol}`)
    } catch (error: unknown) {
      console.error("Error during rebalance", error)
      const errorMessage =
        error instanceof Error ? error.message : "Rebalance failed"
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
          <span className={s.statValue}>{filteredAndSortedETFs.length}</span>
        </div>
        <div className={s.stat}>
          <span className={s.label}>Total TVL</span>
          <span className={s.statValue}>
            $
            {filteredAndSortedETFs
              .reduce(
                (sum, etf) => sum + Number(etf.tvl),
                0
              )
              .toFixed(2)}
          </span>
        </div>
        <div className={s.stat}>
          <span className={s.label}>Total Daily Volume</span>
          <span className={s.statValue}>
            ${(
              filteredAndSortedETFs.reduce(
                (sum, etf) => sum + etf.volumeTradedUSD,
                0
              )
            ).toFixed(2)}
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

      {!isEthereumNetwork && isWalletConnected && (
        <div className={s.networkWarning}>
          <Icon icon="hugeicons:alert-circle" />
          <span>Please switch to Ethereum network to trade ETFs</span>
        </div>
      )}

      <div className={s.filterCardContent}>
        <div className={s.filterGrid}>
          <div className={s.searchWrapper}>
            <Input
              icon="hugeicons:search-01"
              placeholder="Search ETFs by name, symbol or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                      <h3>{etf.name}</h3>
                      <p className={s.description}>{etf.description}</p>
                    </div>
                  </div>
                </div>
                <span className={s.symbol}>
                  {etf.symbol} <BorderAnimate />
                </span>
                <div className={s.badges}>
                  <Badge status={getRiskColor(etf.riskLevel)}>
                    {etf.riskLevel.toUpperCase()}
                  </Badge>
                  <Badge status="primary">{etf.category}</Badge>
                  <a
                    href={getExplorerUrl(etf.vault, etf.chain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.explorerLink}
                    title={`View on ${getChainName(etf.chain)} explorer`}
                  >
                    <Icon icon="hugeicons:link-square-01" />
                    {getChainName(etf.chain)}
                  </a>
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
                        etf.change24h >= 0 ? s.positive : s.negative
                      }`}
                    >
                      {etf.change24h >= 0 ? "+" : ""}
                      {etf.change24h.toFixed(2)}%
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
                  onClick={() => handleRebalance(etf)}
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

      {/* Buy Modal */}
      <Modal
        open={buyModalOpen}
        onClose={() => {
          setBuyModalOpen(false)
          setSelectedETF(null)
          setBuyAmount("")
          setMinSharesOut("")
          setDepositTokenAllowance(false)
          setEstimatedAmountsOut([])
          setEstimatedValuesPerAsset([])
          setImpermanentLossPercentage(null)
        }}
        title={`Buy ${selectedETF?.symbol || ""}`}
      >
        <div className={s.modalContent}>
          <p className={s.modalDescription}>
            Deposit {selectedETF?.depositSymbol || "tokens"} to receive ETF
            shares
          </p>
          <Input
            label={`Amount to Deposit (${
              selectedETF?.depositSymbol || "TOKEN"
            })`}
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={buyAmount}
            onChange={async (e) => {
              const validatedValue = validateDecimalInput(
                e.target.value,
                selectedETF?.depositDecimals || 18
              )
              setBuyAmount(validatedValue)
              // Check allowance and estimate shares when amount changes
              if (
                selectedETF &&
                validatedValue &&
                parseFloat(validatedValue) > 0
              ) {
                const depositDecimals = selectedETF.depositDecimals || 18
                const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
                const [integerPart = "0", fractionalPart = ""] =
                  validatedValue.split(".")
                const paddedFractional = fractionalPart
                  .padEnd(depositDecimals, "0")
                  .slice(0, depositDecimals)
                const amountWei = (
                  BigInt(integerPart) * depositMultiplier +
                  BigInt(paddedFractional)
                ).toString()

                setIsCheckingAllowance(true)
                setIsEstimatingShares(true)

                // Check allowance
                const hasAllowance = await checkAllowance(
                  selectedETF.depositToken,
                  selectedETF.vault,
                  amountWei
                )
                setDepositTokenAllowance(hasAllowance)

                // Estimate shares by calling deposit with minSharesOut = 0
                try {
                  const estimateResult = await estimateDepositShares({
                    factory: selectedETF.factory,
                    vault: selectedETF.vault,
                    amount: amountWei,
                    allowance: hasAllowance ? BigInt(amountWei) : BigInt(0)
                  })

                  // Store estimated amounts and values for display
                  setEstimatedAmountsOut(estimateResult.amountsOut)
                  setEstimatedValuesPerAsset(estimateResult.valuesPerAsset)

                  // Calculate impermanent loss
                  try {
                    const total = estimateResult.valuesPerAsset.reduce((sum, value) => {
                      if (!value || value === "0") return sum
                      return sum + BigInt(value)
                    }, 0n)
                    
                    const multiplier = BigInt(10) ** BigInt(18)
                    const totalValue = Number(total) / Number(multiplier)
                    const depositAmount = parseFloat(validatedValue)
                    
                    if (depositAmount > 0 && totalValue > 0) {
                      const lossPercentage = ((depositAmount - totalValue) / depositAmount) * 100
                      setImpermanentLossPercentage(lossPercentage)
                    } else {
                      setImpermanentLossPercentage(null)
                    }
                  } catch (err) {
                    console.error("Error calculating impermanent loss:", err)
                    setImpermanentLossPercentage(null)
                  }

                  // Convert shares from wei to human-readable format and apply slippage
                  if (estimateResult.sharesOut && estimateResult.sharesOut !== "0") {
                    const sharesDecimals = 18
                    const sharesMultiplier =
                      BigInt(10) ** BigInt(sharesDecimals)
                    const sharesBigInt = BigInt(estimateResult.sharesOut)

                    // Apply slippage to the BigInt value
                    const slippageMultiplier = BigInt(
                      Math.floor((100 - slippageBuy) * 100)
                    )
                    const sharesWithSlippage =
                      (sharesBigInt * slippageMultiplier) / 10000n

                    const sharesNumber =
                      Number(sharesWithSlippage) / Number(sharesMultiplier)
                    const estimatedShares = formatNumberToString(
                      sharesNumber,
                      sharesDecimals
                    )
                    setMinSharesOut(estimatedShares)
                  }
                } catch (error) {
                  console.error("Error estimating shares:", error)
                  setEstimatedAmountsOut([])
                  setEstimatedValuesPerAsset([])
                  setImpermanentLossPercentage(null)
                  // Don't show error to user, just log it
                }

                setIsCheckingAllowance(false)
                setIsEstimatingShares(false)
              } else {
                setDepositTokenAllowance(false)
                setMinSharesOut("")
              }
            }}
            icon="hugeicons:wallet-01"
            balance={depositTokenBalance ?? undefined}
            showMaxButton={
              !!depositTokenBalance && parseFloat(depositTokenBalance) > 0
            }
            onMaxClick={async () => {
              if (depositTokenBalance !== null) {
                setBuyAmount(depositTokenBalance)
                // Check allowance and estimate shares after setting max
                if (selectedETF) {
                  const depositDecimals = selectedETF.depositDecimals || 18
                  const depositMultiplier =
                    BigInt(10) ** BigInt(depositDecimals)
                  const [integerPart = "0", fractionalPart = ""] =
                    depositTokenBalance.split(".")
                  const paddedFractional = fractionalPart
                    .padEnd(depositDecimals, "0")
                    .slice(0, depositDecimals)
                  const amountWei = (
                    BigInt(integerPart) * depositMultiplier +
                    BigInt(paddedFractional)
                  ).toString()

                  setIsCheckingAllowance(true)
                  setIsEstimatingShares(true)

                  const hasAllowance = await checkAllowance(
                    selectedETF.depositToken,
                    selectedETF.vault,
                    amountWei
                  )
                  setDepositTokenAllowance(hasAllowance)

                  // Estimate shares
                  try {
                    console.log("estimatedSharesWei", amountWei)
                    const estimateResult = await estimateDepositShares({
                      factory: selectedETF.factory,
                      vault: selectedETF.vault,
                      amount: amountWei,
                      allowance: hasAllowance ? BigInt(amountWei) : BigInt(0)
                    })

                    // Store estimated amounts and values for display
                    setEstimatedAmountsOut(estimateResult.amountsOut)
                    setEstimatedValuesPerAsset(estimateResult.valuesPerAsset)

                    // Calculate impermanent loss
                    try {
                      const total = estimateResult.valuesPerAsset.reduce((sum, value) => {
                        if (!value || value === "0") return sum
                        return sum + BigInt(value)
                      }, 0n)
                      
                      const multiplier = BigInt(10) ** BigInt(18)
                      const totalValue = Number(total) / Number(multiplier)
                      const depositAmount = parseFloat(depositTokenBalance || "0")
                      
                      if (depositAmount > 0 && totalValue > 0) {
                        const lossPercentage = ((depositAmount - totalValue) / depositAmount) * 100
                        setImpermanentLossPercentage(lossPercentage)
                      } else {
                        setImpermanentLossPercentage(null)
                      }
                    } catch (err) {
                      console.error("Error calculating impermanent loss:", err)
                      setImpermanentLossPercentage(null)
                    }

                    if (estimateResult.sharesOut && estimateResult.sharesOut !== "0") {
                      const sharesDecimals = 18
                      const sharesMultiplier =
                        BigInt(10) ** BigInt(sharesDecimals)
                      const sharesBigInt = BigInt(estimateResult.sharesOut)
                      const sharesNumber =
                        Number(sharesBigInt) / Number(sharesMultiplier)
                      const estimatedShares = formatNumberToString(
                        sharesNumber,
                        sharesDecimals
                      )
                      setMinSharesOut(estimatedShares)
                    }
                  } catch (error) {
                    console.error("Error estimating shares:", error)
                    setEstimatedAmountsOut([])
                    setEstimatedValuesPerAsset([])
                    setImpermanentLossPercentage(null)
                    // Don't show error to user, just log it
                  }

                  setIsCheckingAllowance(false)
                  setIsEstimatingShares(false)
                }
              }
            }}
          />
          <div className={s.slippageContainer}>
            <label className={s.slippageLabel}>Slippage Tolerance</label>
            <div className={s.slippageButtons}>
              <button
                type="button"
                className={clsx(
                  s.slippageButton,
                  slippageBuy === 0.25 && s.active
                )}
                onClick={() => setSlippageBuy(0.25)}
              >
                0.25%
              </button>
              <button
                type="button"
                className={clsx(
                  s.slippageButton,
                  slippageBuy === 0.5 && s.active
                )}
                onClick={() => setSlippageBuy(0.5)}
              >
                0.5%
              </button>
              <button
                type="button"
                className={clsx(
                  s.slippageButton,
                  slippageBuy === 1 && s.active
                )}
                onClick={() => setSlippageBuy(1)}
              >
                1%
              </button>
              <button
                type="button"
                className={clsx(
                  s.slippageButton,
                  slippageBuy === 5 && s.active
                )}
                onClick={() => setSlippageBuy(5)}
              >
                5%
              </button>
            </div>
          </div>
          <Input
            label="Minimum Shares Out"
            type="text"
            inputMode="decimal"
            placeholder={isEstimatingShares ? "Estimating..." : "0.0"}
            value={minSharesOut}
            onChange={(e) => {
              const validatedValue = validateDecimalInput(e.target.value, 18)
              setMinSharesOut(validatedValue)
            }}
            icon="hugeicons:chart-01"
            helperText={
              isEstimatingShares
                ? "Estimating shares..."
                : "Minimum shares you're willing to accept"
            }
            disabled={isEstimatingShares}
          />
          
          {/* Display total estimated value */}
          {totalEstimatedValue !== null && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'var(--background-low)',
              borderRadius: 'var(--radius-s)',
              border: '1px solid var(--border-light)',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Estimated Value:</span>
              <span style={{
                fontWeight: '600',
                fontSize: '1rem',
                color: 'var(--text-primary)'
              }}>
                ~${totalEstimatedValue.toFixed(2)}
              </span>
            </div>
          )}
          
          {/* Display impermanent loss warning */}
          {impermanentLossPercentage !== null && impermanentLossPercentage > 1 && (
            <div style={{
              padding: '1rem',
              background: impermanentLossPercentage > 5 
                ? 'var(--danger-lowest)' 
                : 'var(--warning-lowest)',
              border: `1px solid ${impermanentLossPercentage > 5 
                ? 'var(--danger-low)' 
                : 'var(--warning-low)'}`,
              borderRadius: 'var(--radius-s)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <Icon 
                icon={impermanentLossPercentage > 5 
                  ? "hugeicons:alert-circle" 
                  : "hugeicons:alert-02"}
                style={{
                  fontSize: '1.5rem',
                  color: impermanentLossPercentage > 5 
                    ? 'var(--danger-high)' 
                    : 'var(--warning-high)',
                  flexShrink: 0
                }}
              />
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}>
                <strong style={{
                  color: impermanentLossPercentage > 5 
                    ? 'var(--danger-high)' 
                    : 'var(--warning-high)',
                  fontSize: '0.9rem'
                }}>
                  {impermanentLossPercentage > 5 
                    ? 'High Impermanent Loss Detected!' 
                    : 'Impermanent Loss Warning'}
                </strong>
                <span style={{
                  color: impermanentLossPercentage > 5 
                    ? 'var(--danger-medium)' 
                    : 'var(--warning-medium)',
                  fontSize: '0.85rem',
                  lineHeight: '1.4'
                }}>
                  {impermanentLossPercentage > 5 
                    ? `You may lose approximately ${impermanentLossPercentage.toFixed(2)}% due to swap fees and slippage. Consider depositing a smaller amount or waiting for better market conditions.`
                    : `You may lose approximately ${impermanentLossPercentage.toFixed(2)}% due to swap fees and slippage.`}
                </span>
              </div>
            </div>
          )}
          
          {/* Display estimated token distribution */}
          {estimatedAmountsOut.length > 0 && selectedETF?.assets && (
            <div className={s.tokenDistribution}>
              <div className={s.tokenDistributionHeader}>
                <Icon icon="hugeicons:pie-chart" />
                <span>Estimated Token Added in ETF</span>
              </div>
              <div className={s.tokenDistributionList}>
                {selectedETF.assets.map((asset, index) => {
                  if (index >= estimatedAmountsOut.length) return null
                  
                  const amountOut = estimatedAmountsOut[index]
                  const valuePerAsset = estimatedValuesPerAsset[index]
                  
                  if (!amountOut || amountOut === "0") return null
                  
                  const decimals = asset.decimals || 18
                  const multiplier = BigInt(10) ** BigInt(decimals)
                  const amountNumber = Number(BigInt(amountOut)) / Number(multiplier)
                  
                  const depositMultiplier = BigInt(10) ** BigInt(18)
                  const valueNumber = Number(BigInt(valuePerAsset || "0")) / Number(depositMultiplier)
                  
                    const logo = tokenData?.[asset.symbol.toLowerCase()]?.logo
                    
                    return (
                      <div key={asset.token} className={s.tokenDistributionItem}>
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
                          <span className={s.tokenWeight}>
                            {(asset.targetWeightBps / 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className={s.tokenAmounts}>
                          <span className={s.tokenAmount}>
                            {amountNumber.toFixed(6)} {asset.symbol}
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
          
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setBuyModalOpen(false)
                setSelectedETF(null)
                setBuyAmount("")
                setMinSharesOut("")
                setEstimatedAmountsOut([])
                setEstimatedValuesPerAsset([])
                setImpermanentLossPercentage(null)
              }}
            >
              Cancel
            </Button>
            {depositTokenAllowance ? (
              <Button
                variant="primary"
                onClick={handleConfirmBuy}
                disabled={isContractLoading || !buyAmount || !minSharesOut}
                iconLeft={
                  isContractLoading
                    ? "hugeicons:loading-01"
                    : "hugeicons:checkmark-circle-02"
                }
              >
                {isContractLoading ? "Processing..." : "Confirm Buy"}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleApproveBuy}
                disabled={
                  isContractLoading || isCheckingAllowance || !buyAmount
                }
                iconLeft={
                  isContractLoading
                    ? "hugeicons:loading-01"
                    : "hugeicons:lock-01"
                }
              >
                {isContractLoading ? "Processing..." : "Approve"}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Sell Modal */}
      <Modal
        open={sellModalOpen}
        onClose={() => {
          setSellModalOpen(false)
          setSelectedETF(null)
          setSellShares("")
          setMinOut("")
          setShareTokenAllowance(false)
          setEstimatedSoldAmounts([])
        }}
        title={`Sell ${selectedETF?.symbol || ""}`}
      >
        <div className={s.modalContent}>
          <p className={s.modalDescription}>
            Redeem ETF shares to receive{" "}
            {selectedETF?.depositSymbol || "tokens"}
          </p>
          <Input
            label="Shares to Redeem"
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={sellShares}
            onChange={async (e) => {
              const validatedValue = validateDecimalInput(e.target.value, 18)
              setSellShares(validatedValue)
              // Check allowance and estimate deposit tokens when shares change
              if (
                selectedETF &&
                validatedValue &&
                parseFloat(validatedValue) > 0
              ) {
                const sharesDecimals = 18
                const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
                const [sharesInteger = "0", sharesFractional = ""] =
                  validatedValue.split(".")
                const paddedSharesFractional = sharesFractional
                  .padEnd(sharesDecimals, "0")
                  .slice(0, sharesDecimals)
                const sharesWei = (
                  BigInt(sharesInteger) * sharesMultiplier +
                  BigInt(paddedSharesFractional)
                ).toString()

                setIsCheckingAllowance(true)
                setIsEstimatingDeposit(true)

                // Check allowance
                const hasAllowance = await checkAllowance(
                  selectedETF.shareToken,
                  selectedETF.vault,
                  sharesWei
                )
                setShareTokenAllowance(hasAllowance)

                // Estimate deposit tokens by calling redeem with minOut = 0
                try {
                  const estimateResult = await estimateRedeemDeposit({
                    factory: selectedETF.factory,
                    vault: selectedETF.vault,
                    shares: sharesWei,
                    allowance: hasAllowance ? BigInt(sharesWei) : BigInt(0)
                  })

                  // Store estimated sold amounts for display
                  setEstimatedSoldAmounts(estimateResult.soldAmounts)

                  // Convert deposit tokens from wei to human-readable format and apply slippage
                  if (estimateResult.depositOut && estimateResult.depositOut !== "0") {
                    const depositDecimals = selectedETF.depositDecimals || 18
                    const depositMultiplier =
                      BigInt(10) ** BigInt(depositDecimals)
                    const depositBigInt = BigInt(estimateResult.depositOut)

                    // Apply slippage to the BigInt value
                    const slippageMultiplier = BigInt(
                      Math.floor((100 - slippageSell) * 100)
                    )
                    const depositWithSlippage =
                      (depositBigInt * slippageMultiplier) / 10000n

                    const depositNumber =
                      Number(depositWithSlippage) / Number(depositMultiplier)
                    const estimatedDeposit = formatNumberToString(
                      depositNumber,
                      depositDecimals
                    )
                    setMinOut(estimatedDeposit)
                  }
                } catch (error) {
                  console.error("Error estimating deposit tokens:", error)
                  setEstimatedSoldAmounts([])
                  // Don't show error to user, just log it
                }

                setIsCheckingAllowance(false)
                setIsEstimatingDeposit(false)
              } else {
                setShareTokenAllowance(false)
                setMinOut("")
              }
            }}
            icon="hugeicons:chart-01"
            balance={shareTokenBalance ?? undefined}
            showMaxButton={
              !!shareTokenBalance && parseFloat(shareTokenBalance) > 0
            }
            onMaxClick={async () => {
              if (shareTokenBalance !== null) {
                setSellShares(shareTokenBalance)
                // Check allowance and estimate deposit tokens after setting max
                if (selectedETF) {
                  const sharesDecimals = 18
                  const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
                  const [sharesInteger = "0", sharesFractional = ""] =
                    shareTokenBalance.split(".")
                  const paddedSharesFractional = sharesFractional
                    .padEnd(sharesDecimals, "0")
                    .slice(0, sharesDecimals)
                  const sharesWei = (
                    BigInt(sharesInteger) * sharesMultiplier +
                    BigInt(paddedSharesFractional)
                  ).toString()

                  setIsCheckingAllowance(true)
                  setIsEstimatingDeposit(true)

                  // Check allowance
                  const hasAllowance = await checkAllowance(
                    selectedETF.shareToken,
                    selectedETF.vault,
                    sharesWei
                  )
                  setShareTokenAllowance(hasAllowance)

                  // Estimate deposit tokens
                  try {
                    const estimateResult = await estimateRedeemDeposit({
                      factory: selectedETF.factory,
                      vault: selectedETF.vault,
                      shares: sharesWei,
                      allowance: hasAllowance ? BigInt(sharesWei) : BigInt(0)
                    })

                    // Store estimated sold amounts for display
                    setEstimatedSoldAmounts(estimateResult.soldAmounts)

                    if (estimateResult.depositOut && estimateResult.depositOut !== "0") {
                      const depositDecimals = selectedETF.depositDecimals || 18
                      const depositMultiplier =
                        BigInt(10) ** BigInt(depositDecimals)
                      const depositBigInt = BigInt(estimateResult.depositOut)

                      // Apply slippage to the BigInt value
                      const slippageMultiplier = BigInt(
                        Math.floor((100 - slippageSell) * 100)
                      )
                      const depositWithSlippage =
                        (depositBigInt * slippageMultiplier) / 10000n

                      const depositNumber =
                        Number(depositWithSlippage) / Number(depositMultiplier)
                      const estimatedDeposit = formatNumberToString(
                        depositNumber,
                        depositDecimals
                      )
                      setMinOut(estimatedDeposit)
                    }
                  } catch (error) {
                    console.error("Error estimating deposit tokens:", error)
                    setEstimatedSoldAmounts([])
                  }

                  setIsCheckingAllowance(false)
                  setIsEstimatingDeposit(false)
                }
              }
            }}
          />
          <div className={s.slippageContainer}>
            <label className={s.slippageLabel}>Slippage Tolerance</label>
            <div className={s.slippageButtons}>
              <button
                type="button"
                className={clsx(
                  s.slippageButton,
                  slippageSell === 0.25 && s.active
                )}
                onClick={() => setSlippageSell(0.25)}
              >
                0.25%
              </button>
              <button
                type="button"
                className={clsx(
                  s.slippageButton,
                  slippageSell === 0.5 && s.active
                )}
                onClick={() => setSlippageSell(0.5)}
              >
                0.5%
              </button>
              <button
                type="button"
                className={clsx(
                  s.slippageButton,
                  slippageSell === 1 && s.active
                )}
                onClick={() => setSlippageSell(1)}
              >
                1%
              </button>
            </div>
          </div>
          <Input
            label={`Minimum Output (${selectedETF?.depositSymbol || "TOKEN"})`}
            type="text"
            inputMode="decimal"
            placeholder={isEstimatingDeposit ? "Estimating..." : "0.0"}
            value={minOut}
            onChange={(e) => {
              const validatedValue = validateDecimalInput(
                e.target.value,
                selectedETF?.depositDecimals || 18
              )
              setMinOut(validatedValue)
            }}
            icon="hugeicons:wallet-01"
            helperText={
              isEstimatingDeposit
                ? "Estimating deposit tokens..."
                : `Minimum ${
                    selectedETF?.depositSymbol || "tokens"
                  } you're willing to accept`
            }
            disabled={isEstimatingDeposit}
          />
          
          {/* Display estimated tokens to be sold */}
          {estimatedSoldAmounts.length > 0 && selectedETF?.assets && (
            <div className={s.tokenDistribution}>
              <div className={s.tokenDistributionHeader}>
                <Icon icon="hugeicons:pie-chart" />
                <span>Tokens to be Sold</span>
              </div>
              <div className={s.tokenDistributionList}>
                {selectedETF.assets.map((asset, index) => {
                  if (index >= estimatedSoldAmounts.length) return null
                  
                  const soldAmount = estimatedSoldAmounts[index]
                  
                  if (!soldAmount || soldAmount === "0") return null
                  
                  const decimals = asset.decimals || 18
                  const multiplier = BigInt(10) ** BigInt(decimals)
                  const amountNumber = Number(BigInt(soldAmount)) / Number(multiplier)
                  
                  const logo = tokenData?.[asset.symbol.toLowerCase()]?.logo
                  
                  return (
                    <div key={asset.token} className={s.tokenDistributionItem}>
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
                        <span className={s.tokenWeight}>
                          {(asset.targetWeightBps / 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className={s.tokenAmounts}>
                        <span className={s.tokenAmount}>
                          {amountNumber.toFixed(6)} {asset.symbol}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setSellModalOpen(false)
                setSelectedETF(null)
                setSellShares("")
                setMinOut("")
                setEstimatedSoldAmounts([])
              }}
            >
              Cancel
            </Button>
            {shareTokenAllowance ? (
              <Button
                variant="primary"
                onClick={handleConfirmSell}
                disabled={isContractLoading || !sellShares || !minOut}
                iconLeft={
                  isContractLoading
                    ? "hugeicons:loading-01"
                    : "hugeicons:checkmark-circle-02"
                }
              >
                {isContractLoading ? "Processing..." : "Confirm Sell"}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleApproveSell}
                disabled={
                  isContractLoading || isCheckingAllowance || !sellShares
                }
                iconLeft={
                  isContractLoading
                    ? "hugeicons:loading-01"
                    : "hugeicons:lock-01"
                }
              >
                {isContractLoading ? "Processing..." : "Approve"}
              </Button>
            )}
          </div>
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
