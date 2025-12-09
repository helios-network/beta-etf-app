"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import { Badge } from "@/components/badge"
import { Input } from "@/components/input"
import { Select } from "@/components/input/select"
import { useAccount, useChainId } from "wagmi"
import { ETHEREUM_NETWORK_ID } from "@/config/app"
import { useRouter } from "next/navigation"
import { useState, useMemo, useEffect } from "react"
import { toast } from "sonner"
import { fetchETFs, type ETFResponse } from "@/helpers/request"
import { useETFContract } from "@/hooks/useETFContract"
import { useWeb3Provider } from "@/hooks/useWeb3Provider"
import { erc20Abi } from "@/constant/helios-contracts"
import { Modal } from "@/components/modal"
import clsx from "clsx"
import s from "./page.module.scss"
import { formatTokenAmount } from "@/lib/utils/number"

interface ETF {
  factory: string
  id: string
  name: string
  symbol: string
  description: string
  tvl: string
  sharePrice: string
  apy: string
  change24h: number
  riskLevel: "low" | "medium" | "high"
  category: string
  tokens: Array<{
    symbol: string
    percentage: number
  }>
  price: string
  vault: string
  shareToken: string
  depositToken: string
  depositSymbol: string
  depositDecimals: number
  chain: number
}

function formatETFResponse(etf: ETFResponse): ETF {


  // Convert assets from API to tokens format
  // targetWeightBps: 10000 = 100%, so divide by 100 to get percentage
  const tokens = etf.assets?.map(asset => ({
    symbol: asset.symbol,
    percentage: asset.targetWeightBps / 100
  })) || []

  return {
    id: etf._id,
    factory: etf.factory,
    name: etf.name,
    symbol: etf.symbol,
    description: `${etf.name} ETF basket`,
    tvl: etf.tvl,
    sharePrice: etf.sharePrice || "0.00",
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
    chain: etf.chain
  }
}

export default function ETFList() {
  const chainId = useChainId()
  const { address } = useAccount()
  const router = useRouter()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedRisk, setSelectedRisk] = useState("all")
  const [sortBy, setSortBy] = useState("tvl")
  const [etfs, setEtfs] = useState<ETF[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [pagination, setPagination] = useState({
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
  const [depositTokenBalance, setDepositTokenBalance] = useState<string | null>(null)
  const [shareTokenBalance, setShareTokenBalance] = useState<string | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [depositTokenAllowance, setDepositTokenAllowance] = useState<boolean>(false)
  const [shareTokenAllowance, setShareTokenAllowance] = useState<boolean>(false)
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false)

  const { deposit, redeem, rebalance, approveToken, estimateDepositShares, estimateRedeemDeposit, isLoading: isContractLoading } = useETFContract()
  const web3Provider = useWeb3Provider()
  const [isEstimatingShares, setIsEstimatingShares] = useState(false)
  const [isEstimatingDeposit, setIsEstimatingDeposit] = useState(false)

  const isEthereumNetwork = chainId === ETHEREUM_NETWORK_ID
  const isWalletConnected = !!address

  const isETFChainMatch = (etf: ETF) => {
    return chainId === etf.chain
  }

  // Format number to string without scientific notation
  const formatNumberToString = (num: number, maxDecimals: number = 18): string => {
    if (num === 0) return "0"
    
    // Use toFixed with max decimals to avoid scientific notation
    let str = num.toFixed(maxDecimals)
    
    // Remove trailing zeros
    str = str.replace(/\.?0+$/, "")
    
    return str
  }

  // Validate and format decimal number input (max 18 decimals, point as separator)
  const validateDecimalInput = (value: string, maxDecimals: number = 18): string => {
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

  const fetchTokenBalance = async (tokenAddress: string, decimals: number): Promise<string | null> => {
    if (!web3Provider || !address) return null

    try {
      const tokenContract = new web3Provider.eth.Contract(erc20Abi as any, tokenAddress)
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
      const decimalString = remainderTrimmed.length > 0 
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
      const tokenContract = new web3Provider.eth.Contract(erc20Abi as any, tokenAddress)
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
        const errorMessage = err instanceof Error ? err.message : "Failed to load ETFs"
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadETFs()
  }, [currentPage, pageSize])

  const categories = ["all", ...new Set(etfs.map(etf => etf.category))]
  const riskLevels = ["all", "low", "medium", "high"]

  const filteredAndSortedETFs = useMemo(() => {
    const filtered = etfs.filter(etf => {
      const matchesSearch = etf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          etf.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          etf.description.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = selectedCategory === "all" || etf.category === selectedCategory
      const matchesRisk = selectedRisk === "all" || etf.riskLevel === selectedRisk
      
      return matchesSearch && matchesCategory && matchesRisk
    })

    return filtered.sort((a, b) => {
      if (sortBy === "apy") {
        return parseFloat(b.apy) - parseFloat(a.apy)
      } else if (sortBy === "change24h") {
        return b.change24h - a.change24h
      } else if (sortBy === "tvl") {
        const tvlA = parseFloat(a.tvl.replace(/[^0-9.]/g, ''))
        const tvlB = parseFloat(b.tvl.replace(/[^0-9.]/g, ''))
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
      toast.error(`Please switch to the correct network (Chain ID: ${etf.chain})`)
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
    const balance = await fetchTokenBalance(etf.depositToken, etf.depositDecimals)
    setDepositTokenBalance(balance)
    setIsLoadingBalance(false)
  }

  const handleSell = async (etf: ETF) => {
    if (!isWalletConnected) {
      toast.error("Please connect your wallet first")
      return
    }
    if (!isETFChainMatch(etf)) {
      toast.error(`Please switch to the correct network (Chain ID: ${etf.chain})`)
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
      const paddedFractional = fractionalPart.padEnd(depositDecimals, "0").slice(0, depositDecimals)
      const amountWei = (BigInt(integerPart) * depositMultiplier + BigInt(paddedFractional)).toString()

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
      const errorMessage = error instanceof Error ? error.message : "Approval failed"
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
      const paddedFractional = fractionalPart.padEnd(depositDecimals, "0").slice(0, depositDecimals)
      const amountWei = (BigInt(integerPart) * depositMultiplier + BigInt(paddedFractional)).toString()
      
      // For shares, assume 18 decimals (standard for ERC20)
      const sharesDecimals = 18
      const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
      const [sharesInteger = "0", sharesFractional = ""] = minSharesOut.split(".")
      const paddedSharesFractional = sharesFractional.padEnd(sharesDecimals, "0").slice(0, sharesDecimals)
      const minSharesOutWei = (BigInt(sharesInteger) * sharesMultiplier + BigInt(paddedSharesFractional)).toString()

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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Deposit failed"
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
      const paddedSharesFractional = sharesFractional.padEnd(sharesDecimals, "0").slice(0, sharesDecimals)
      const sharesWei = (BigInt(sharesInteger) * sharesMultiplier + BigInt(paddedSharesFractional)).toString()

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
      const errorMessage = error instanceof Error ? error.message : "Approval failed"
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
      const paddedSharesFractional = sharesFractional.padEnd(sharesDecimals, "0").slice(0, sharesDecimals)
      const sharesWei = (BigInt(sharesInteger) * sharesMultiplier + BigInt(paddedSharesFractional)).toString()
      
      // Convert minOut using correct decimals for deposit token
      const depositDecimals = selectedETF.depositDecimals || 18
      const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
      const [minOutInteger = "0", minOutFractional = ""] = minOut.split(".")
      const paddedMinOutFractional = minOutFractional.padEnd(depositDecimals, "0").slice(0, depositDecimals)
      const minOutWei = (BigInt(minOutInteger) * depositMultiplier + BigInt(paddedMinOutFractional)).toString()

      const result = await redeem({
        factory: selectedETF.factory,
        vault: selectedETF.vault,
        shareToken: selectedETF.shareToken,
        shares: sharesWei,
        minOut: minOutWei
      })

      // Format the received amount using correct decimals
      const receivedAmount = Number(result.depositOut) / Number(depositMultiplier)
      const depositSymbol = selectedETF.depositSymbol || selectedETF.depositToken

      toast.success(
        `Successfully redeemed! Received ${receivedAmount.toFixed(6)} ${depositSymbol} tokens`
      )
      setSellModalOpen(false)
      setSellShares("")
      setMinOut("")
      setSelectedETF(null)
      setShareTokenAllowance(false)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Redeem failed"
      toast.error(errorMessage)
    }
  }

  const handleRebalance = async (etf: ETF) => {
    if (!isWalletConnected) {
      toast.error("Please connect your wallet first")
      return
    }
    if (!isETFChainMatch(etf)) {
      toast.error(`Please switch to the correct network (Chain ID: ${etf.chain})`)
      return
    }

    try {
      await rebalance({ factory: etf.factory, vault: etf.vault })
      toast.success(`Successfully rebalanced ${etf.symbol}`)
    } catch (error: unknown) {
      console.error("Error during rebalance", error)
      const errorMessage = error instanceof Error ? error.message : "Rebalance failed"
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

  return (
    <div className={s.etfList}>
      <div className={s.container}>
        <div className={s.statsHeader}>
          <div className={s.stat}>
            <span className={s.label}>Total ETFs</span>
            <span className={s.statValue}>{filteredAndSortedETFs.length}</span>
          </div>
          <div className={s.stat}>
            <span className={s.label}>Total TVL</span>
            <span className={s.statValue}>${(filteredAndSortedETFs.reduce((sum, etf) => sum + parseFloat(etf.tvl.replace(/[^0-9.]/g, '')), 0)).toFixed(2)}M</span>
          </div>
          <div className={s.stat}>
            <span className={s.label}>Avg APY</span>
            <span className={s.statValue}>{(filteredAndSortedETFs.reduce((sum, etf) => sum + parseFloat(etf.apy), 0) / filteredAndSortedETFs.length || 0).toFixed(2)}%</span>
          </div>
        </div>

        <Card className={s.mainCard}>
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
                options={categories.map(cat => ({
                  value: cat,
                  label: cat.charAt(0).toUpperCase() + cat.slice(1)
                }))}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              />

              <Select
                options={riskLevels.map(risk => ({
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
            <div className={s.emptyState}>
              <Icon icon="hugeicons:loading-01" className={clsx(s.emptyIcon, s.loading)} />
              <h3>Loading ETFs...</h3>
              <p>Please wait while we fetch the data</p>
            </div>
          ) : error ? (
            <div className={s.emptyState}>
              <Icon icon="hugeicons:alert-circle" className={s.emptyIcon} />
              <h3>Error Loading ETFs</h3>
              <p>{error}</p>
            </div>
          ) : filteredAndSortedETFs.length === 0 ? (
            <div className={s.emptyState}>
              <Icon icon="hugeicons:inbox-01" className={s.emptyIcon} />
              <h3>No ETFs Found</h3>
              <p>Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className={s.etfsGrid}>
              {filteredAndSortedETFs.map((etf) => (
                <Card key={etf.id} className={s.etfCard}>
                <div className={s.cardHeader}>
                  <div className={s.etfTitle}>
                    <h3>{etf.name}</h3>
                    <span className={s.symbol}>{etf.symbol}</span>
                  </div>
                  <div className={s.badges}>
                    <Badge status={getRiskColor(etf.riskLevel)}>
                      {etf.riskLevel.toUpperCase()}
                    </Badge>
                    <Badge status="primary">
                      {etf.category}
                    </Badge>
                  </div>
                </div>

                <p className={s.description}>{etf.description}</p>

                <div className={s.metricsGrid}>
                  <div className={s.metric}>
                    <span className={s.metricLabel}>TVL</span>
                    <span className={s.metricValue}>{'$' + formatTokenAmount(etf.tvl)}</span>
                  </div>
                  <div className={s.metric}>
                    <span className={s.metricLabel}>APY</span>
                    <span className={`${s.metricValue} ${s.positive}`}>{etf.apy}</span>
                  </div>
                  <div className={s.metric}>
                    <span className={s.metricLabel}>24h Change</span>
                    <span className={`${s.metricValue} ${etf.change24h >= 0 ? s.positive : s.negative}`}>
                      {etf.change24h >= 0 ? "+" : ""}{etf.change24h.toFixed(2)}%
                    </span>
                  </div>
                  <div className={s.metric}>
                    <span className={s.metricLabel}>Price</span>
                    <span className={s.metricValue}>{'$' + formatTokenAmount(etf.sharePrice)}</span>
                  </div>
                </div>

                {etf.tokens.length > 0 ? (
                <div className={s.composition}>
                  <h4>Composition ({etf.tokens.length} tokens)</h4>
                  <div className={s.tokens}>
                    {etf.tokens.map((token) => (
                      <div key={token.symbol} className={s.token}>
                        <span className={s.tokenSymbol}>{token.symbol}</span>
                        <div className={s.percentageBar}>
                          <div
                            className={s.percentageFill}
                            style={{ width: `${token.percentage}%` }}
                          />
                        </div>
                        <span className={s.percentage}>{token.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                ) : (
                  <div className={s.composition}>
                    <h4>ETF Details</h4>
                    <div className={s.tokens}>
                      <div className={s.token}>
                        <span className={s.tokenSymbol}>Vault</span>
                        <div className={s.percentageBar}>
                          <div className={s.percentageFill} style={{ width: "100%" }} />
                        </div>
                        <span className={s.percentage}>{etf.vault.slice(0, 6)}...{etf.vault.slice(-4)}</span>
                      </div>
                      <div className={s.token}>
                        <span className={s.tokenSymbol}>Share Token</span>
                        <div className={s.percentageBar}>
                          <div className={s.percentageFill} style={{ width: "100%" }} />
                        </div>
                        <span className={s.percentage}>{etf.shareToken.slice(0, 6)}...{etf.shareToken.slice(-4)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className={s.actions}>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => handleBuy(etf)}
                    disabled={!isWalletConnected || !isETFChainMatch(etf) || isContractLoading}
                    iconLeft="hugeicons:download-01"
                  >
                    Buy
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleSell(etf)}
                    disabled={!isWalletConnected || !isETFChainMatch(etf) || isContractLoading}
                    iconLeft="hugeicons:upload-01"
                  >
                    Sell
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleRebalance(etf)}
                    disabled={!isWalletConnected || !isETFChainMatch(etf) || isContractLoading}
                    iconLeft="hugeicons:refresh-01"
                  >
                    Rebalance
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
        </Card>

        {/* Buy Modal */}
        <Modal
          open={buyModalOpen}
          onClose={() => {
            setBuyModalOpen(false)
            setSelectedETF(null)
            setBuyAmount("")
            setMinSharesOut("")
            setDepositTokenAllowance(false)
          }}
          title={`Buy ${selectedETF?.symbol || ""}`}
        >
          <div className={s.modalContent}>
            <p className={s.modalDescription}>
              Deposit {selectedETF?.depositSymbol || "tokens"} to receive ETF shares
            </p>
            <Input
              label={`Amount to Deposit (${selectedETF?.depositSymbol || "TOKEN"})`}
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={buyAmount}
              onChange={async (e) => {
                const validatedValue = validateDecimalInput(e.target.value, selectedETF?.depositDecimals || 18)
                setBuyAmount(validatedValue)
                // Check allowance and estimate shares when amount changes
                if (selectedETF && validatedValue && parseFloat(validatedValue) > 0) {
                  const depositDecimals = selectedETF.depositDecimals || 18
                  const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
                  const [integerPart = "0", fractionalPart = ""] = validatedValue.split(".")
                  const paddedFractional = fractionalPart.padEnd(depositDecimals, "0").slice(0, depositDecimals)
                  const amountWei = (BigInt(integerPart) * depositMultiplier + BigInt(paddedFractional)).toString()
                  
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
                    const estimatedSharesWei = await estimateDepositShares({
                      factory: selectedETF.factory,
                      vault: selectedETF.vault,
                      amount: amountWei
                    })
                    
                    // Convert shares from wei to human-readable format and apply slippage
                    if (estimatedSharesWei && estimatedSharesWei !== "0") {
                      const sharesDecimals = 18
                      const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
                      const sharesBigInt = BigInt(estimatedSharesWei)
                      
                      // Apply slippage to the BigInt value
                      const slippageMultiplier = BigInt(Math.floor((100 - slippageBuy) * 100))
                      const sharesWithSlippage = (sharesBigInt * slippageMultiplier) / 10000n
                      
                      const sharesNumber = Number(sharesWithSlippage) / Number(sharesMultiplier)
                      const estimatedShares = formatNumberToString(sharesNumber, sharesDecimals)
                      setMinSharesOut(estimatedShares)
                    }
                  } catch (error) {
                    console.error("Error estimating shares:", error)
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
              showMaxButton={!!depositTokenBalance && parseFloat(depositTokenBalance) > 0}
              onMaxClick={async () => {
                if (depositTokenBalance !== null) {
                  setBuyAmount(depositTokenBalance)
                  // Check allowance and estimate shares after setting max
                  if (selectedETF) {
                    const depositDecimals = selectedETF.depositDecimals || 18
                    const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
                    const [integerPart = "0", fractionalPart = ""] = depositTokenBalance.split(".")
                    const paddedFractional = fractionalPart.padEnd(depositDecimals, "0").slice(0, depositDecimals)
                    const amountWei = (BigInt(integerPart) * depositMultiplier + BigInt(paddedFractional)).toString()
                    
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
                      const estimatedSharesWei = await estimateDepositShares({
                        factory: selectedETF.factory,
                        vault: selectedETF.vault,
                        amount: amountWei
                      })
                      
                      if (estimatedSharesWei && estimatedSharesWei !== "0") {
                        const sharesDecimals = 18
                        const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
                        const sharesBigInt = BigInt(estimatedSharesWei)
                        const sharesNumber = Number(sharesBigInt) / Number(sharesMultiplier)
                        const estimatedShares = formatNumberToString(sharesNumber, sharesDecimals)
                        setMinSharesOut(estimatedShares)
                      }
                    } catch (error) {
                      console.error("Error estimating shares:", error)
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
                  className={clsx(s.slippageButton, slippageBuy === 0.25 && s.active)}
                  onClick={() => setSlippageBuy(0.25)}
                >
                  0.25%
                </button>
                <button
                  type="button"
                  className={clsx(s.slippageButton, slippageBuy === 0.5 && s.active)}
                  onClick={() => setSlippageBuy(0.5)}
                >
                  0.5%
                </button>
                <button
                  type="button"
                  className={clsx(s.slippageButton, slippageBuy === 1 && s.active)}
                  onClick={() => setSlippageBuy(1)}
                >
                  1%
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
              helperText={isEstimatingShares ? "Estimating shares..." : "Minimum shares you're willing to accept"}
              disabled={isEstimatingShares}
            />
            <div className={s.modalActions}>
              <Button
                variant="secondary"
                onClick={() => {
                  setBuyModalOpen(false)
                  setSelectedETF(null)
                  setBuyAmount("")
                  setMinSharesOut("")
                }}
              >
                Cancel
              </Button>
              {depositTokenAllowance ? (
                <Button
                  variant="primary"
                  onClick={handleConfirmBuy}
                  disabled={isContractLoading || !buyAmount || !minSharesOut}
                  iconLeft={isContractLoading ? "hugeicons:loading-01" : "hugeicons:checkmark-circle-02"}
                >
                  {isContractLoading ? "Processing..." : "Confirm Buy"}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleApproveBuy}
                  disabled={isContractLoading || isCheckingAllowance || !buyAmount}
                  iconLeft={isContractLoading ? "hugeicons:loading-01" : "hugeicons:lock-01"}
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
          }}
          title={`Sell ${selectedETF?.symbol || ""}`}
        >
          <div className={s.modalContent}>
            <p className={s.modalDescription}>
              Redeem ETF shares to receive {selectedETF?.depositSymbol || "tokens"}
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
                if (selectedETF && validatedValue && parseFloat(validatedValue) > 0) {
                  const sharesDecimals = 18
                  const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
                  const [sharesInteger = "0", sharesFractional = ""] = validatedValue.split(".")
                  const paddedSharesFractional = sharesFractional.padEnd(sharesDecimals, "0").slice(0, sharesDecimals)
                  const sharesWei = (BigInt(sharesInteger) * sharesMultiplier + BigInt(paddedSharesFractional)).toString()
                  
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
                    const estimatedDepositWei = await estimateRedeemDeposit({
                      factory: selectedETF.factory,
                      vault: selectedETF.vault,
                      shares: sharesWei
                    })
                    
                    // Convert deposit tokens from wei to human-readable format and apply slippage
                    if (estimatedDepositWei && estimatedDepositWei !== "0") {
                      const depositDecimals = selectedETF.depositDecimals || 18
                      const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
                      const depositBigInt = BigInt(estimatedDepositWei)
                      
                      // Apply slippage to the BigInt value
                      const slippageMultiplier = BigInt(Math.floor((100 - slippageSell) * 100))
                      const depositWithSlippage = (depositBigInt * slippageMultiplier) / 10000n
                      
                      const depositNumber = Number(depositWithSlippage) / Number(depositMultiplier)
                      const estimatedDeposit = formatNumberToString(depositNumber, depositDecimals)
                      setMinOut(estimatedDeposit)
                    }
                  } catch (error) {
                    console.error("Error estimating deposit tokens:", error)
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
              showMaxButton={!!shareTokenBalance && parseFloat(shareTokenBalance) > 0}
              onMaxClick={async () => {
                if (shareTokenBalance !== null) {
                  setSellShares(shareTokenBalance)
                  // Check allowance and estimate deposit tokens after setting max
                  if (selectedETF) {
                    const sharesDecimals = 18
                    const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
                    const [sharesInteger = "0", sharesFractional = ""] = shareTokenBalance.split(".")
                    const paddedSharesFractional = sharesFractional.padEnd(sharesDecimals, "0").slice(0, sharesDecimals)
                    const sharesWei = (BigInt(sharesInteger) * sharesMultiplier + BigInt(paddedSharesFractional)).toString()
                    
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
                      const estimatedDepositWei = await estimateRedeemDeposit({
                        factory: selectedETF.factory,
                        vault: selectedETF.vault,
                        shares: sharesWei
                      })
                      
                      if (estimatedDepositWei && estimatedDepositWei !== "0") {
                        const depositDecimals = selectedETF.depositDecimals || 18
                        const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
                        const depositBigInt = BigInt(estimatedDepositWei)
                        
                        // Apply slippage to the BigInt value
                        const slippageMultiplier = BigInt(Math.floor((100 - slippageSell) * 100))
                        const depositWithSlippage = (depositBigInt * slippageMultiplier) / 10000n
                        
                        const depositNumber = Number(depositWithSlippage) / Number(depositMultiplier)
                        const estimatedDeposit = formatNumberToString(depositNumber, depositDecimals)
                        setMinOut(estimatedDeposit)
                      }
                    } catch (error) {
                      console.error("Error estimating deposit tokens:", error)
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
                  className={clsx(s.slippageButton, slippageSell === 0.25 && s.active)}
                  onClick={() => setSlippageSell(0.25)}
                >
                  0.25%
                </button>
                <button
                  type="button"
                  className={clsx(s.slippageButton, slippageSell === 0.5 && s.active)}
                  onClick={() => setSlippageSell(0.5)}
                >
                  0.5%
                </button>
                <button
                  type="button"
                  className={clsx(s.slippageButton, slippageSell === 1 && s.active)}
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
                const validatedValue = validateDecimalInput(e.target.value, selectedETF?.depositDecimals || 18)
                setMinOut(validatedValue)
              }}
              icon="hugeicons:wallet-01"
              helperText={isEstimatingDeposit ? "Estimating deposit tokens..." : `Minimum ${selectedETF?.depositSymbol || "tokens"} you're willing to accept`}
              disabled={isEstimatingDeposit}
            />
            <div className={s.modalActions}>
              <Button
                variant="secondary"
                onClick={() => {
                  setSellModalOpen(false)
                  setSelectedETF(null)
                  setSellShares("")
                  setMinOut("")
                }}
              >
                Cancel
              </Button>
              {shareTokenAllowance ? (
                <Button
                  variant="primary"
                  onClick={handleConfirmSell}
                  disabled={isContractLoading || !sellShares || !minOut}
                  iconLeft={isContractLoading ? "hugeicons:loading-01" : "hugeicons:checkmark-circle-02"}
                >
                  {isContractLoading ? "Processing..." : "Confirm Sell"}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleApproveSell}
                  disabled={isContractLoading || isCheckingAllowance || !sellShares}
                  iconLeft={isContractLoading ? "hugeicons:loading-01" : "hugeicons:lock-01"}
                >
                  {isContractLoading ? "Processing..." : "Approve"}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
