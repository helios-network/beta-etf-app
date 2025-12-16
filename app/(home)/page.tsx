"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Icon } from "@/components/icon"
import { Sub } from "@/components/sub"
import { Symbol } from "@/components/symbol"
import { Tunnel } from "@/components/tunnel"
import { erc20Abi } from "@/constant/helios-contracts"
import { fetchDepositTokens, fetchETFs, type DepositToken, type ETFResponse } from "@/helpers/request"
import { useETFContract } from "@/hooks/useETFContract"
import { useWeb3Provider } from "@/hooks/useWeb3Provider"
import { getAssetColor, getAssetIcon } from "@/utils/assets"
import { fetchCGTokenData } from "@/utils/price"
import { useQuery } from "@tanstack/react-query"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { useAccount, useChainId } from "wagmi"
import { useAppKit } from "@reown/appkit/react"
import { ETFSelectModal } from "./(components)/etf-select-modal"
import { SlippageModal } from "./(components)/slippage-modal"
import { TokenSelectModal } from "./(components)/token-select-modal"
import s from "./page.module.scss"

interface ETF {
  id: string
  name: string
  symbol: string
  tokens: Array<{
    symbol: string
    percentage: number
  }>
}

export default function Home() {
  const chainId = useChainId()
  const { address } = useAccount()
  const web3Provider = useWeb3Provider()
  const { open: openLoginModal } = useAppKit()
  
  const [tokenModalOpen, setTokenModalOpen] = useState(false)
  const [etfModalOpen, setEtfModalOpen] = useState(false)
  const [slippageModalOpen, setSlippageModalOpen] = useState(false)
  const [slippage, setSlippage] = useState(0.25)
  const [selectedDepositToken, setSelectedDepositToken] = useState<DepositToken | null>(null)
  const [selectedETF, setSelectedETF] = useState<ETFResponse | null>(null)
  const [isReversed, setIsReversed] = useState(false) // false = token->ETF, true = ETF->token
  
  // Input amounts
  const [sellAmount, setSellAmount] = useState("")
  const [buyAmount, setBuyAmount] = useState("")
  
  // Balances
  const [depositTokenBalance, setDepositTokenBalance] = useState<string | null>(null)
  const [shareTokenBalance, setShareTokenBalance] = useState<string | null>(null)
  
  // Allowances
  const [depositTokenAllowance, setDepositTokenAllowance] = useState<boolean>(false)
  const [shareTokenAllowance, setShareTokenAllowance] = useState<boolean>(false)
  
  // Loading states
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false)
  const [isEstimating, setIsEstimating] = useState(false)
  
  // Estimation details
  const [estimatedAmountsOut, setEstimatedAmountsOut] = useState<string[]>([])
  const [estimatedValuesPerAsset, setEstimatedValuesPerAsset] = useState<string[]>([])
  const [estimatedSoldAmounts, setEstimatedSoldAmounts] = useState<string[]>([])
  const [impermanentLossPercentage, setImpermanentLossPercentage] = useState<number | null>(null)
  
  const {
    deposit,
    redeem,
    approveToken,
    estimateDepositShares,
    estimateRedeemDeposit,
    isLoading: isContractLoading
  } = useETFContract()

  // Fetch deposit tokens
  const { data: depositTokensData } = useQuery({
    queryKey: ["depositTokens"],
    queryFn: fetchDepositTokens,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000
  })

  // Fetch ETFs based on selected deposit token (only in buy mode)
  // In sell mode, fetch all ETFs regardless of deposit token
  const { data: etfsData } = useQuery({
    queryKey: ["etfs", selectedDepositToken?.address, isReversed],
    queryFn: () => fetchETFs(1, 10, isReversed ? undefined : selectedDepositToken?.address),
    enabled: isReversed || !!selectedDepositToken?.address,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000
  })

  const depositTokens = depositTokensData?.data || []
  const etfs = etfsData?.data || []

  // Récupérer les logos des tokens
  const allTokenSymbols = useMemo(() => {
    const symbols = new Set<string>()
    depositTokens.forEach((token) => {
      symbols.add(token.symbol.toLowerCase())
    })
    etfs.forEach((etf) => {
      if (etf.depositSymbol) {
        symbols.add(etf.depositSymbol.toLowerCase())
      }
      etf.assets?.forEach((asset) => {
        symbols.add(asset.symbol.toLowerCase())
      })
    })
    return Array.from(symbols)
  }, [depositTokens, etfs])

  const { data: tokenData = {} } = useQuery({
    queryKey: ["tokenData", allTokenSymbols],
    queryFn: () => fetchCGTokenData(allTokenSymbols),
    enabled: allTokenSymbols.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000
  })

  // Utility functions
  const formatNumberToString = (num: number, maxDecimals: number = 18): string => {
    if (num === 0) return "0"
    let str = num.toFixed(maxDecimals)
    str = str.replace(/\.?0+$/, "")
    return str
  }

  const validateDecimalInput = (value: string, maxDecimals: number = 18): string => {
    let cleaned = value.replace(/[^\d.]/g, "")
    cleaned = cleaned.replace(/,/g, ".")
    const parts = cleaned.split(".")
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("")
    }
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
      const balanceStr = String(balance)
      const balanceBigInt = BigInt(balanceStr)
      const balanceMultiplier = BigInt(10) ** BigInt(decimals)

      const integerPart = balanceBigInt / balanceMultiplier
      const remainder = balanceBigInt % balanceMultiplier

      const remainderStr = remainder.toString().padStart(decimals, "0")
      const remainderTrimmed = remainderStr.replace(/0+$/, "")

      const decimalString =
        remainderTrimmed.length > 0
          ? `${integerPart.toString()}.${remainderTrimmed}`
          : integerPart.toString()

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

  const handleDepositTokenSelect = (token: DepositToken) => {
    setSelectedDepositToken(token)
    setSelectedETF(null) // Reset ETF when token changes
    setSellAmount("")
    setBuyAmount("")
    setDepositTokenAllowance(false)
    setShareTokenAllowance(false)
    setEstimatedAmountsOut([])
    setEstimatedValuesPerAsset([])
    setEstimatedSoldAmounts([])
    setImpermanentLossPercentage(null)
  }

  const handleETFSelect = async (etf: ETFResponse) => {
    setSelectedETF(etf)
    setSellAmount("")
    setBuyAmount("")
    setDepositTokenAllowance(false)
    setShareTokenAllowance(false)
    setEstimatedAmountsOut([])
    setEstimatedValuesPerAsset([])
    setEstimatedSoldAmounts([])
    setImpermanentLossPercentage(null)
    
    // In reversed mode, set the deposit token from the ETF
    if (isReversed && etf.depositToken) {
      const depositToken = depositTokens.find(t => t.address === etf.depositToken)
      if (depositToken) {
        setSelectedDepositToken(depositToken)
      }
      // Fetch share token balance in reversed mode
      if (address && web3Provider) {
        const balance = await fetchTokenBalance(etf.shareToken, 18)
        setShareTokenBalance(balance)
      }
    } else if (!isReversed && selectedDepositToken) {
      // Fetch deposit token balance in normal mode
      if (address && web3Provider) {
        const balance = await fetchTokenBalance(
          selectedDepositToken.address,
          selectedDepositToken.decimals
        )
        setDepositTokenBalance(balance)
      }
    }
  }

  const handleSwapDirection = () => {
    setIsReversed(!isReversed)
    setSelectedETF(null)
    setSellAmount("")
    setBuyAmount("")
    setDepositTokenAllowance(false)
    setShareTokenAllowance(false)
    setDepositTokenBalance(null)
    setShareTokenBalance(null)
    setEstimatedAmountsOut([])
    setEstimatedValuesPerAsset([])
    setEstimatedSoldAmounts([])
    setImpermanentLossPercentage(null)
  }

  // Handle sell amount change (deposit token -> ETF or ETF shares -> deposit token)
  const handleSellAmountChange = async (value: string) => {
    if (!selectedETF) return
    
    const decimals = isReversed ? 18 : (selectedDepositToken?.decimals || 18)
    const validatedValue = validateDecimalInput(value, decimals)
    setSellAmount(validatedValue)

    if (!validatedValue || parseFloat(validatedValue) <= 0) {
      setBuyAmount("")
      setDepositTokenAllowance(false)
      setShareTokenAllowance(false)
      setEstimatedAmountsOut([])
      setEstimatedValuesPerAsset([])
      setEstimatedSoldAmounts([])
      setImpermanentLossPercentage(null)
      return
    }

    setIsEstimating(true)
    setIsCheckingAllowance(true)

    try {
      if (!isReversed) {
        // Deposit: depositToken -> ETF shares
        const depositDecimals = selectedDepositToken?.decimals || 18
        const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
        const [integerPart = "0", fractionalPart = ""] = validatedValue.split(".")
        const paddedFractional = fractionalPart
          .padEnd(depositDecimals, "0")
          .slice(0, depositDecimals)
        const amountWei = (
          BigInt(integerPart) * depositMultiplier +
          BigInt(paddedFractional)
        ).toString()

        // Check allowance
        const hasAllowance = await checkAllowance(
          selectedETF.depositToken,
          selectedETF.vault,
          amountWei
        )
        setDepositTokenAllowance(hasAllowance)

        // Estimate shares
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
        } catch (error) {
          console.error("Error calculating impermanent loss:", error)
          setImpermanentLossPercentage(null)
        }

        if (estimateResult.sharesOut && estimateResult.sharesOut !== "0") {
          const sharesDecimals = 18
          const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
          const sharesBigInt = BigInt(estimateResult.sharesOut)
          
          // Apply slippage
          const slippageMultiplier = BigInt(Math.floor((100 - slippage) * 100))
          const sharesWithSlippage = (sharesBigInt * slippageMultiplier) / 10000n
          
          const sharesNumber = Number(sharesWithSlippage) / Number(sharesMultiplier)
          const estimatedShares = formatNumberToString(sharesNumber, sharesDecimals)
          setBuyAmount(estimatedShares)
        }
      } else {
        // Redeem: ETF shares -> depositToken
        const sharesDecimals = 18
        const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
        const [sharesInteger = "0", sharesFractional = ""] = validatedValue.split(".")
        const paddedSharesFractional = sharesFractional
          .padEnd(sharesDecimals, "0")
          .slice(0, sharesDecimals)
        const sharesWei = (
          BigInt(sharesInteger) * sharesMultiplier +
          BigInt(paddedSharesFractional)
        ).toString()

        // Check allowance
        const hasAllowance = await checkAllowance(
          selectedETF.shareToken,
          selectedETF.vault,
          sharesWei
        )
        setShareTokenAllowance(hasAllowance)

        // Estimate deposit tokens
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
          const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
          const depositBigInt = BigInt(estimateResult.depositOut)
          
          // Apply slippage
          const slippageMultiplier = BigInt(Math.floor((100 - slippage) * 100))
          const depositWithSlippage = (depositBigInt * slippageMultiplier) / 10000n
          
          const depositNumber = Number(depositWithSlippage) / Number(depositMultiplier)
          const estimatedDeposit = formatNumberToString(depositNumber, depositDecimals)
          setBuyAmount(estimatedDeposit)
        }
      }
    } catch (error) {
      console.error("Error estimating:", error)
      setEstimatedAmountsOut([])
      setEstimatedValuesPerAsset([])
      setEstimatedSoldAmounts([])
      setImpermanentLossPercentage(null)
    } finally {
      setIsEstimating(false)
      setIsCheckingAllowance(false)
    }
  }

  // Handle approve
  const handleApprove = async () => {
    if (!selectedETF || !sellAmount || parseFloat(sellAmount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    try {
      if (!isReversed) {
        // Approve deposit token
        const depositDecimals = selectedDepositToken?.decimals || 18
        const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
        const [integerPart = "0", fractionalPart = ""] = sellAmount.split(".")
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
        const hasAllowance = await checkAllowance(
          selectedETF.depositToken,
          selectedETF.vault,
          amountWei
        )
        setDepositTokenAllowance(hasAllowance)
      } else {
        // Approve share token
        const sharesDecimals = 18
        const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
        const [sharesInteger = "0", sharesFractional = ""] = sellAmount.split(".")
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
        const hasAllowance = await checkAllowance(
          selectedETF.shareToken,
          selectedETF.vault,
          sharesWei
        )
        setShareTokenAllowance(hasAllowance)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Approval failed"
      toast.error(errorMessage)
    }
  }

  // Handle confirm
  const handleConfirm = async () => {
    if (!selectedETF || !sellAmount || parseFloat(sellAmount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      toast.error("Please wait for estimation to complete")
      return
    }

    try {
      if (!isReversed) {
        // Deposit: depositToken -> ETF shares
        const depositDecimals = selectedDepositToken?.decimals || 18
        const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
        const [integerPart = "0", fractionalPart = ""] = sellAmount.split(".")
        const paddedFractional = fractionalPart
          .padEnd(depositDecimals, "0")
          .slice(0, depositDecimals)
        const amountWei = (
          BigInt(integerPart) * depositMultiplier +
          BigInt(paddedFractional)
        ).toString()

        const sharesDecimals = 18
        const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
        const [sharesInteger = "0", sharesFractional = ""] = buyAmount.split(".")
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

        const sharesReceived = Number(result.sharesOut) / Number(sharesMultiplier)
        toast.success(`Successfully deposited! Received ${sharesReceived.toFixed(6)} shares`)
        
        // Reset form
        setSellAmount("")
        setBuyAmount("")
        setDepositTokenAllowance(false)
        setEstimatedAmountsOut([])
        setEstimatedValuesPerAsset([])
        setImpermanentLossPercentage(null)
        
        // Refresh balance
        if (selectedDepositToken) {
          const balance = await fetchTokenBalance(
            selectedDepositToken.address,
            selectedDepositToken.decimals
          )
          setDepositTokenBalance(balance)
        }
      } else {
        // Redeem: ETF shares -> depositToken
        const sharesDecimals = 18
        const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
        const [sharesInteger = "0", sharesFractional = ""] = sellAmount.split(".")
        const paddedSharesFractional = sharesFractional
          .padEnd(sharesDecimals, "0")
          .slice(0, sharesDecimals)
        const sharesWei = (
          BigInt(sharesInteger) * sharesMultiplier +
          BigInt(paddedSharesFractional)
        ).toString()

        const depositDecimals = selectedETF.depositDecimals || 18
        const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
        const [minOutInteger = "0", minOutFractional = ""] = buyAmount.split(".")
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

        const receivedAmount = Number(result.depositOut) / Number(depositMultiplier)
        const depositSymbol = selectedETF.depositSymbol || selectedETF.depositToken
        toast.success(
          `Successfully redeemed! Received ${receivedAmount.toFixed(6)} ${depositSymbol} tokens`
        )
        
        // Reset form
        setSellAmount("")
        setBuyAmount("")
        setShareTokenAllowance(false)
        setEstimatedSoldAmounts([])
        
        // Refresh balance
        const balance = await fetchTokenBalance(selectedETF.shareToken, 18)
        setShareTokenBalance(balance)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Transaction failed"
      toast.error(errorMessage)
    }
  }

  // Effect to fetch balances when selections change
  useEffect(() => {
    const fetchBalances = async () => {
      if (!address || !web3Provider) return

      if (!isReversed && selectedDepositToken) {
        const balance = await fetchTokenBalance(
          selectedDepositToken.address,
          selectedDepositToken.decimals
        )
        setDepositTokenBalance(balance)
      } else if (isReversed && selectedETF) {
        const balance = await fetchTokenBalance(selectedETF.shareToken, 18)
        setShareTokenBalance(balance)
      }
    }

    fetchBalances()
  }, [address, web3Provider, isReversed, selectedDepositToken, selectedETF])

  const isWalletConnected = !!address
  const isETFChainMatch = selectedETF ? chainId === selectedETF.chain : true
  
  const hasAllowance = isReversed ? shareTokenAllowance : depositTokenAllowance
  const canProceed = 
    isWalletConnected && 
    isETFChainMatch && 
    selectedETF && 
    (isReversed || selectedDepositToken) &&
    sellAmount &&
    parseFloat(sellAmount) > 0 &&
    buyAmount &&
    parseFloat(buyAmount) > 0

  // Convert ETFResponse to ETF for modal compatibility
  const etfsForModal: ETF[] = useMemo(() => {
    return etfs.map((etf) => ({
      id: etf._id,
      name: etf.name,
      symbol: etf.symbol,
      tokens: etf.assets?.map((asset) => ({
        symbol: asset.symbol,
        percentage: asset.targetWeightBps / 100
      })) || []
    }))
  }, [etfs])

  // Convert DepositToken to Token for modal compatibility
  const tokensForModal = useMemo(() => {
    return depositTokens.map((token) => ({
      symbol: token.symbol,
      name: token.symbol // We don't have the full name from API
    }))
  }, [depositTokens])

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


  return (
    <div className={s.home}>
      <div className={s.header}>
        <Sub className={s.sub}>
          Welcome to Helios <strong>Forge</strong>
        </Sub>
        <h1>Create, Mint, and Evolve ETFs.</h1>
        <p>
          Experience the ETF token trading on Arbitrum Chain. Create, Mint and
          Manage a diversified token baskets portfolio. Powered by Helios Chain.
        </p>
      </div>
      <Card className={s.form}>
        {!isReversed ? (
          <>
            {/* Sell: Deposit Token */}
        <div className={s.field}>
          <label htmlFor="sell">Sell</label>
          <div className={s.middle}>
                <input 
                  id="sell" 
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={sellAmount}
                  onChange={(e) => handleSellAmountChange(e.target.value)}
                />
            <Button
              icon="hugeicons:arrow-down-01"
              variant="secondary"
              onClick={() => setTokenModalOpen(true)}
            >
                  {selectedDepositToken ? (
                <span className={s.tokenButtonContent}>
                  {(() => {
                    const logo =
                          tokenData[selectedDepositToken.symbol.toLowerCase()]?.logo
                    return logo ? (
                      <Image
                        src={logo}
                            alt={selectedDepositToken.symbol}
                        width={20}
                        height={20}
                        className={s.tokenButtonIcon}
                      />
                    ) : (
                      <Symbol
                            icon={getAssetIcon(selectedDepositToken.symbol)}
                            color={getAssetColor(selectedDepositToken.symbol)}
                        className={s.tokenButtonIcon}
                      />
                    )
                  })()}
                      <span>{selectedDepositToken.symbol}</span>
                </span>
                  ) : (
                    "Select Token"
              )}
            </Button>
          </div>
              <div className={s.bottom}>
                {sellAmount && selectedETF?.sharePrice 
                  ? `~$${(parseFloat(sellAmount) * parseFloat(selectedETF.sharePrice)).toFixed(2)}`
                  : depositTokenBalance !== null 
                    ? `Balance: ${depositTokenBalance} ${selectedDepositToken?.symbol || ""}` 
                    : "$0.00"}
              </div>
        </div>
        <div className={s.actions}>
          <Button
            icon="hugeicons:arrow-data-transfer-vertical"
            variant="secondary"
                onClick={handleSwapDirection}
          />
          <Button
            icon="hugeicons:settings-02"
            variant="secondary"
            onClick={() => setSlippageModalOpen(true)}
          />
          <Tunnel className={s.tunnel} />
        </div>
            {/* Buy: ETF */}
        <div className={s.field}>
          <label htmlFor="buy">Buy</label>
          <div className={s.middle}>
                <input 
                  type="text"
                  inputMode="decimal"
                  placeholder={isEstimating ? "Estimating..." : "0.00"} 
                  id="buy"
                  value={buyAmount}
                  readOnly
                  disabled
                />
                <Button
                  icon="hugeicons:arrow-down-01"
                  variant="secondary"
                  onClick={() => setEtfModalOpen(true)}
                  disabled={!selectedDepositToken}
                >
                  {selectedETF?.symbol || "Select ETF"}
                </Button>
              </div>
              <div className={s.bottom}>
                {isEstimating ? "Estimating..." : totalEstimatedValue !== null
                  ? `~$${totalEstimatedValue.toFixed(2)}`
                  : buyAmount && selectedETF?.sharePrice 
                    ? `~$${(parseFloat(buyAmount) * parseFloat(selectedETF.sharePrice)).toFixed(2)}`
                    : "$0.00"}
              </div>
            </div>
            
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
                gap: '0.75rem',
                marginTop: '0.5rem'
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
            
            {/* Display estimated token distribution for deposit */}
            {estimatedAmountsOut.length > 0 && selectedETF?.assets && (
              <div className={s.tokenDistribution}>
                <div className={s.tokenDistributionHeader}>
                  <Icon icon="hugeicons:pie-chart" />
                  <span>Estimated Token Distribution</span>
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
          </>
        ) : (
          <>
            {/* Sell: ETF */}
            <div className={s.field}>
              <label htmlFor="sell">Sell</label>
              <div className={s.middle}>
                <input 
                  id="sell" 
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={sellAmount}
                  onChange={(e) => handleSellAmountChange(e.target.value)}
                />
            <Button
              icon="hugeicons:arrow-down-01"
              variant="secondary"
              onClick={() => setEtfModalOpen(true)}
            >
              {selectedETF?.symbol || "Select ETF"}
            </Button>
          </div>
              <div className={s.bottom}>
                {sellAmount && selectedETF?.sharePrice 
                  ? `~$${(parseFloat(sellAmount) * parseFloat(selectedETF.sharePrice)).toFixed(2)}`
                  : shareTokenBalance !== null 
                    ? `Balance: ${shareTokenBalance} ${selectedETF?.symbol || ""}` 
                    : "$0.00"}
              </div>
            </div>
            <div className={s.actions}>
              <Button
                icon="hugeicons:arrow-data-transfer-vertical"
                variant="secondary"
                onClick={handleSwapDirection}
              />
              <Button
                icon="hugeicons:settings-02"
                variant="secondary"
                onClick={() => setSlippageModalOpen(true)}
              />
              <Tunnel className={s.tunnel} />
            </div>
            {/* Buy: Deposit Token */}
            <div className={s.field}>
              <label htmlFor="buy">Buy</label>
              <div className={s.middle}>
                <input 
                  type="text"
                  inputMode="decimal"
                  placeholder={isEstimating ? "Estimating..." : "0.00"}
                  id="buy"
                  value={buyAmount}
                  readOnly
                  disabled
                />
                <Button
                  icon="hugeicons:arrow-down-01"
                  variant="secondary"
                  disabled
                >
                  {selectedETF && selectedDepositToken ? (
                    <span className={s.tokenButtonContent}>
                      {(() => {
                        const logo =
                          tokenData[selectedDepositToken.symbol.toLowerCase()]?.logo
                        return logo ? (
                          <Image
                            src={logo}
                            alt={selectedDepositToken.symbol}
                            width={20}
                            height={20}
                            className={s.tokenButtonIcon}
                          />
                        ) : (
                          <Symbol
                            icon={getAssetIcon(selectedDepositToken.symbol)}
                            color={getAssetColor(selectedDepositToken.symbol)}
                            className={s.tokenButtonIcon}
                          />
                        )
                      })()}
                      <span>{selectedDepositToken.symbol}</span>
                    </span>
                  ) : (
                    "Select ETF first"
                  )}
                </Button>
              </div>
              <div className={s.bottom}>
                {isEstimating ? "Estimating..." : sellAmount && selectedETF?.sharePrice 
                  ? `~$${(parseFloat(sellAmount) * parseFloat(selectedETF.sharePrice)).toFixed(2)}`
                  : "$0.00"}
              </div>
        </div>
        
            {/* Display estimated tokens to be sold for redeem */}
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
          </>
        )}
        {!isWalletConnected ? (
          <Button 
            className={s.start} 
            onClick={() => openLoginModal()}
            iconLeft="hugeicons:wallet-01"
          >
            Connect Wallet
          </Button>
        ) : !isETFChainMatch && selectedETF ? (
          <Button className={s.start} disabled>
            Wrong Network (Chain ID: {selectedETF.chain})
          </Button>
        ) : !selectedETF || (!isReversed && !selectedDepositToken) ? (
          <Button className={s.start} disabled>
            Select tokens to swap
          </Button>
        ) : !sellAmount || parseFloat(sellAmount) <= 0 ? (
          <Button className={s.start} disabled>
            Enter amount
          </Button>
        ) : isEstimating || isCheckingAllowance ? (
          <Button className={s.start} disabled iconLeft="hugeicons:loading-01">
            Loading...
          </Button>
        ) : !hasAllowance ? (
          <Button 
            className={s.start} 
            onClick={handleApprove}
            disabled={isContractLoading}
            iconLeft={isContractLoading ? "hugeicons:loading-01" : "hugeicons:lock-01"}
          >
            {isContractLoading ? "Approving..." : "Approve"}
          </Button>
        ) : (
          <Button 
            className={s.start}
            onClick={handleConfirm}
            disabled={isContractLoading || !canProceed}
            iconLeft={isContractLoading ? "hugeicons:loading-01" : "hugeicons:checkmark-circle-02"}
          >
            {isContractLoading ? "Processing..." : isReversed ? "Redeem" : "Deposit"}
          </Button>
        )}
      </Card>
      <TokenSelectModal
        open={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
        onSelect={(token) => {
          const depositToken = depositTokens.find(t => t.symbol === token.symbol)
          if (depositToken) {
            handleDepositTokenSelect(depositToken)
          }
        }}
        tokens={tokensForModal}
        tokenData={tokenData}
      />
      <ETFSelectModal
        open={etfModalOpen}
        onClose={() => setEtfModalOpen(false)}
        onSelect={(etf) => {
          const etfResponse = etfs.find(e => e._id === etf.id)
          if (etfResponse) {
            handleETFSelect(etfResponse)
          }
        }}
        etfs={etfsForModal}
        tokenData={tokenData}
      />

      <SlippageModal
        open={slippageModalOpen}
        onClose={() => setSlippageModalOpen(false)}
        onConfirm={setSlippage}
        initialSlippage={slippage}
      />
    </div>
  )
}
