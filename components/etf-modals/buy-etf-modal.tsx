"use client"

import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import { Input } from "@/components/input"
import { Modal } from "@/components/modal"
import { erc20Abi } from "@/constant/abis"
import { useETFContract, percentageToBps } from "@/hooks/useETFContract"
import { useWeb3Provider } from "@/hooks/useWeb3Provider"
import { fetchCGTokenData } from "@/utils/price"
import { getAssetColor } from "@/utils/assets"
import { useQuery } from "@tanstack/react-query"
import clsx from "clsx"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { useAccount } from "wagmi"
import type { ETF } from "./types"
import s from "./buy-etf-modal.module.scss"

interface BuyETFModalProps {
  open: boolean
  onClose: () => void
  etf: ETF | null
}

// Format number to string without scientific notation
function formatNumberToString(num: number, maxDecimals: number = 18): string {
  if (num === 0) return "0"
  let str = num.toFixed(maxDecimals)
  str = str.replace(/\.?0+$/, "")
  return str
}

// Validate and format decimal number input
function validateDecimalInput(value: string, maxDecimals: number = 18): string {
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

async function fetchTokenBalance(
  web3Provider: any,
  address: string,
  tokenAddress: string,
  decimals: number
): Promise<string | null> {
  if (!web3Provider || !address) return null

  try {
    const tokenContract = new web3Provider.eth.Contract(erc20Abi as any, tokenAddress)
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

async function checkAllowance(
  web3Provider: any,
  address: string,
  tokenAddress: string,
  spenderAddress: string,
  amount: string
): Promise<boolean> {
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

export function BuyETFModal({ open, onClose, etf }: BuyETFModalProps) {
  const { address } = useAccount()
  const web3Provider = useWeb3Provider()
  const [buyAmount, setBuyAmount] = useState("")
  const [minSharesOut, setMinSharesOut] = useState("")
  const [slippageBuy, setSlippageBuy] = useState(0.25)
  const [depositTokenBalance, setDepositTokenBalance] = useState<string | null>(null)
  const [depositTokenAllowance, setDepositTokenAllowance] = useState<boolean>(false)
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false)
  const [estimatedAmountsOut, setEstimatedAmountsOut] = useState<string[]>([])
  const [estimatedValuesPerAsset, setEstimatedValuesPerAsset] = useState<string[]>([])
  const [impermanentLossPercentage, setImpermanentLossPercentage] = useState<number | null>(null)
  const [isEstimatingShares, setIsEstimatingShares] = useState(false)

  const {
    deposit,
    approveToken,
    estimateDepositShares,
    isLoading: isContractLoading
  } = useETFContract()

  // Fetch token data for logos
  const allTokenSymbols = useMemo(() => {
    if (!etf?.assets) return []
    return etf.assets.map((asset) => asset.symbol.toLowerCase())
  }, [etf?.assets])

  const { data: tokenData = {} } = useQuery({
    queryKey: ["tokenData", "buyModal", allTokenSymbols],
    queryFn: () => fetchCGTokenData(allTokenSymbols),
    enabled: allTokenSymbols.length > 0,
    staleTime: 5 * 60 * 1000
  })

  // Calculate total estimated value
  const totalEstimatedValue = useMemo(() => {
    if (estimatedValuesPerAsset.length === 0) return null

    try {
      const total = estimatedValuesPerAsset.reduce((sum, value) => {
        if (!value || value === "0") return sum
        return sum + BigInt(value)
      }, 0n)

      const multiplier = BigInt(10) ** BigInt(18)
      const totalNumber = Number(total) / Number(multiplier)
      return totalNumber
    } catch (error) {
      console.error("Error calculating total value:", error)
      return null
    }
  }, [estimatedValuesPerAsset])

  // Fetch deposit token balance when modal opens
  useEffect(() => {
    if (open && etf && web3Provider && address) {
      fetchTokenBalance(web3Provider, address, etf.depositToken, etf.depositDecimals).then(
        setDepositTokenBalance
      )
    }
  }, [open, etf, web3Provider, address])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setBuyAmount("")
      setMinSharesOut("")
      setDepositTokenBalance(null)
      setDepositTokenAllowance(false)
      setEstimatedAmountsOut([])
      setEstimatedValuesPerAsset([])
      setImpermanentLossPercentage(null)
    }
  }, [open])

  const handleAmountChange = async (value: string) => {
    if (!etf || !web3Provider || !address) return

    const validatedValue = validateDecimalInput(value, etf.depositDecimals || 18)
    setBuyAmount(validatedValue)

    if (validatedValue && parseFloat(validatedValue) > 0) {
      const depositDecimals = etf.depositDecimals || 18
      const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
      const [integerPart = "0", fractionalPart = ""] = validatedValue.split(".")
      const paddedFractional = fractionalPart.padEnd(depositDecimals, "0").slice(0, depositDecimals)
      const amountWei = (BigInt(integerPart) * depositMultiplier + BigInt(paddedFractional)).toString()

      setIsCheckingAllowance(true)
      setIsEstimatingShares(true)

      const hasAllowance = await checkAllowance(
        web3Provider,
        address,
        etf.depositToken,
        etf.vault,
        amountWei
      )
      setDepositTokenAllowance(hasAllowance)

      try {
        const estimateResult = await estimateDepositShares({
          factory: etf.factory,
          vault: etf.vault,
          amount: amountWei,
          allowance: hasAllowance ? BigInt(amountWei) : BigInt(0),
          slippageBps: percentageToBps(slippageBuy)
        })

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

        if (estimateResult.sharesOut && estimateResult.sharesOut !== "0") {
          const sharesDecimals = 18
          const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
          const sharesBigInt = BigInt(estimateResult.sharesOut)
          const slippageMultiplier = BigInt(Math.floor((100 - slippageBuy) * 100))
          const sharesWithSlippage = (sharesBigInt * slippageMultiplier) / 10000n
          const sharesNumber = Number(sharesWithSlippage) / Number(sharesMultiplier)
          const estimatedShares = formatNumberToString(sharesNumber, sharesDecimals)
          setMinSharesOut(estimatedShares)
        }
      } catch (error) {
        console.error("Error estimating shares:", error)
        setEstimatedAmountsOut([])
        setEstimatedValuesPerAsset([])
        setImpermanentLossPercentage(null)
      }

      setIsCheckingAllowance(false)
      setIsEstimatingShares(false)
    } else {
      setDepositTokenAllowance(false)
      setMinSharesOut("")
    }
  }

  const handleMaxClick = async () => {
    if (depositTokenBalance !== null && etf && web3Provider && address) {
      setBuyAmount(depositTokenBalance)
      await handleAmountChange(depositTokenBalance)
    }
  }

  const handleApprove = async () => {
    if (!etf || !buyAmount || parseFloat(buyAmount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    try {
      const depositDecimals = etf.depositDecimals || 18
      const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
      const [integerPart = "0", fractionalPart = ""] = buyAmount.split(".")
      const paddedFractional = fractionalPart.padEnd(depositDecimals, "0").slice(0, depositDecimals)
      const amountWei = (BigInt(integerPart) * depositMultiplier + BigInt(paddedFractional)).toString()

      await approveToken({
        tokenAddress: etf.depositToken,
        spenderAddress: etf.vault,
        amount: amountWei
      })

      toast.success("Token approved successfully!")
      if (web3Provider && address) {
        const hasAllowance = await checkAllowance(
          web3Provider,
          address,
          etf.depositToken,
          etf.vault,
          amountWei
        )
        setDepositTokenAllowance(hasAllowance)
        
        // Automatically trigger deposit after approval
        if (hasAllowance && minSharesOut && parseFloat(minSharesOut) > 0) {
          await handleConfirm()
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Approval failed"
      toast.error(errorMessage)
    }
  }

  const handleConfirm = async () => {
    if (!etf || !buyAmount || parseFloat(buyAmount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    if (!minSharesOut || parseFloat(minSharesOut) < 0) {
      toast.error("Please enter a valid minimum shares out")
      return
    }

    try {
      const depositDecimals = etf.depositDecimals || 18
      const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
      const [integerPart = "0", fractionalPart = ""] = buyAmount.split(".")
      const paddedFractional = fractionalPart.padEnd(depositDecimals, "0").slice(0, depositDecimals)
      const amountWei = (BigInt(integerPart) * depositMultiplier + BigInt(paddedFractional)).toString()

      const sharesDecimals = 18
      const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
      const [sharesInteger = "0", sharesFractional = ""] = minSharesOut.split(".")
      const paddedSharesFractional = sharesFractional.padEnd(sharesDecimals, "0").slice(0, sharesDecimals)
      const minSharesOutWei = (
        BigInt(sharesInteger) * sharesMultiplier +
        BigInt(paddedSharesFractional)
      ).toString()

      const result = await deposit({
        factory: etf.factory,
        vault: etf.vault,
        depositToken: etf.depositToken,
        amount: amountWei,
        minSharesOut: minSharesOutWei,
        slippageBps: percentageToBps(slippageBuy)
      })

      const sharesReceived = Number(result.sharesOut) / Number(sharesMultiplier)
      
      // Format the assets purchased
      let assetsMessage = ""
      if (result.amountsOut && result.amountsOut.length > 0 && etf.assets) {
        const assetsList = etf.assets
          .map((asset, index) => {
            if (index >= result.amountsOut.length) return null
            const amountOut = result.amountsOut[index]
            if (!amountOut || amountOut === "0") return null
            
            const decimals = asset.decimals || 18
            const multiplier = BigInt(10) ** BigInt(decimals)
            const amountNumber = Number(BigInt(amountOut)) / Number(multiplier)
            
            return `${amountNumber.toFixed(6)} ${asset.symbol}`
          })
          .filter((item): item is string => item !== null)
        
        if (assetsList.length > 0) {
          assetsMessage = ` Assets purchased: ${assetsList.join(", ")}.`
        }
      }
      
      toast.success(`Successfully deposited! Received ${sharesReceived.toFixed(6)} shares.${assetsMessage}`)
      onClose()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Deposit failed"
      toast.error(errorMessage)
    }
  }

  if (!etf) return null

  return (
    <Modal open={open} onClose={onClose} title={`Buy ${etf.symbol}`}>
      <div className={s.modalContent}>
        <p className={s.modalDescription}>
          Deposit {etf.depositSymbol || "tokens"} to receive ETF shares
        </p>
        <Input
          label={`Amount to Deposit (${etf.depositSymbol || "TOKEN"})`}
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={buyAmount}
          onChange={(e) => handleAmountChange(e.target.value)}
          icon="hugeicons:wallet-01"
          balance={depositTokenBalance ?? undefined}
          showMaxButton={!!depositTokenBalance && parseFloat(depositTokenBalance) > 0}
          onMaxClick={handleMaxClick}
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
            <button
              type="button"
              className={clsx(s.slippageButton, slippageBuy === 5 && s.active)}
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
            isEstimatingShares ? "Estimating shares..." : "Minimum shares you're willing to accept"
          }
          disabled={isEstimatingShares}
        />

        {totalEstimatedValue !== null && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "var(--background-low)",
              borderRadius: "var(--radius-s)",
              border: "1px solid var(--border-light)",
              fontSize: "0.9rem",
              color: "var(--text-secondary)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span>Estimated Value:</span>
            <span
              style={{
                fontWeight: "600",
                fontSize: "1rem",
                color: "var(--text-primary)"
              }}
            >
              ~${totalEstimatedValue.toFixed(2)}
            </span>
          </div>
        )}

        {impermanentLossPercentage !== null && impermanentLossPercentage > 2 && (
          <div
            style={{
              padding: "1rem",
              background:
                impermanentLossPercentage > 5 ? "var(--danger-lowest)" : "var(--warning-lowest)",
              border: `1px solid ${
                impermanentLossPercentage > 5 ? "var(--danger-low)" : "var(--warning-low)"
              }`,
              borderRadius: "var(--radius-s)",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem"
            }}
          >
            <Icon
              icon={impermanentLossPercentage > 5 ? "hugeicons:alert-circle" : "hugeicons:alert-02"}
              style={{
                fontSize: "1.5rem",
                color: impermanentLossPercentage > 5 ? "var(--danger-high)" : "var(--warning-high)",
                flexShrink: 0
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <strong
                style={{
                  color: impermanentLossPercentage > 5 ? "var(--danger-high)" : "var(--warning-high)",
                  fontSize: "0.9rem"
                }}
              >
                {impermanentLossPercentage > 5
                  ? "High Impermanent Loss Detected!"
                  : "Impermanent Loss Warning"}
              </strong>
              <span
                style={{
                  color: impermanentLossPercentage > 5 ? "var(--danger-medium)" : "var(--warning-medium)",
                  fontSize: "0.85rem",
                  lineHeight: "1.4"
                }}
              >
                {impermanentLossPercentage > 5
                  ? `You may lose approximately ${impermanentLossPercentage.toFixed(2)}% due to swap fees and slippage. Consider depositing a smaller amount or waiting for better market conditions.`
                  : `You may lose approximately ${impermanentLossPercentage.toFixed(2)}% due to swap fees and slippage.`}
              </span>
            </div>
          </div>
        )}

        {estimatedAmountsOut.length > 0 && etf.assets && (
          <div className={s.tokenDistribution}>
            <div className={s.tokenDistributionHeader}>
              <Icon icon="hugeicons:pie-chart" />
              <span>Estimated Token Added in ETF</span>
            </div>
            <div className={s.tokenDistributionList}>
              {etf.assets.map((asset, index) => {
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
                        <div
                          className={s.tokenLogo}
                          style={{
                            backgroundColor: `var(--${getAssetColor(asset.symbol)})`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.7rem",
                            fontWeight: "600"
                          }}
                        >
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
                      <span className={s.tokenValue}>≈ ${valueNumber.toFixed(2)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className={s.modalActions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {depositTokenAllowance ? (
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={isContractLoading || !buyAmount || !minSharesOut}
              iconLeft={isContractLoading ? "hugeicons:loading-01" : "hugeicons:checkmark-circle-02"}
            >
              {isContractLoading ? "Processing..." : "Confirm Buy"}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleApprove}
              disabled={isContractLoading || isCheckingAllowance || !buyAmount}
              iconLeft={isContractLoading ? "hugeicons:loading-01" : "hugeicons:lock-01"}
            >
              {isContractLoading ? "Processing..." : "Approve"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

