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
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { useAccount } from "wagmi"
import s from "./sell-etf-modal.module.scss"
import { ETF } from "@/types/etf"

interface SellETFModalProps {
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

export function SellETFModal({ open, onClose, etf }: SellETFModalProps) {
  const { address } = useAccount()
  const web3Provider = useWeb3Provider()
  const [sellShares, setSellShares] = useState("")
  const [minOut, setMinOut] = useState("")
  const [slippageSell, setSlippageSell] = useState(0.25)
  const [shareTokenBalance, setShareTokenBalance] = useState<string | null>(null)
  const [shareTokenAllowance, setShareTokenAllowance] = useState<boolean>(false)
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false)
  const [estimatedSoldAmounts, setEstimatedSoldAmounts] = useState<string[]>([])
  const [isEstimatingDeposit, setIsEstimatingDeposit] = useState(false)

  const {
    redeem,
    approveToken,
    estimateRedeemDeposit,
    isLoading: isContractLoading
  } = useETFContract()

  // Fetch token data for logos
  const allTokenSymbols = useMemo(() => {
    if (!etf?.assets) return []
    return etf.assets.map((asset) => asset.symbol.toLowerCase())
  }, [etf?.assets])

  const { data: tokenData = {} } = useQuery({
    queryKey: ["tokenData", "sellModal", allTokenSymbols],
    queryFn: () => fetchCGTokenData(allTokenSymbols),
    enabled: allTokenSymbols.length > 0,
    staleTime: 5 * 60 * 1000
  })

  // Fetch share token balance when modal opens
  useEffect(() => {
    if (open && etf && web3Provider && address) {
      fetchTokenBalance(web3Provider, address, etf.shareToken, 18).then(setShareTokenBalance)
    }
  }, [open, etf, web3Provider, address])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSellShares("")
      setMinOut("")
      setShareTokenBalance(null)
      setShareTokenAllowance(false)
      setEstimatedSoldAmounts([])
    }
  }, [open])

  const handleSharesChange = async (value: string) => {
    if (!etf || !web3Provider || !address) return

    const validatedValue = validateDecimalInput(value, 18)
    setSellShares(validatedValue)

    if (validatedValue && parseFloat(validatedValue) > 0) {
      const sharesDecimals = 18
      const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
      const [sharesInteger = "0", sharesFractional = ""] = validatedValue.split(".")
      const paddedSharesFractional = sharesFractional.padEnd(sharesDecimals, "0").slice(0, sharesDecimals)
      const sharesWei = (BigInt(sharesInteger) * sharesMultiplier + BigInt(paddedSharesFractional)).toString()

      setIsCheckingAllowance(true)
      setIsEstimatingDeposit(true)

      const hasAllowance = await checkAllowance(
        web3Provider,
        address,
        etf.shareToken,
        etf.vault,
        sharesWei
      )
      setShareTokenAllowance(hasAllowance)

      try {
        const estimateResult = await estimateRedeemDeposit({
          factory: etf.factory,
          vault: etf.vault,
          shares: sharesWei,
          allowance: hasAllowance ? BigInt(sharesWei) : BigInt(0),
          slippageBps: percentageToBps(slippageSell)
        })

        setEstimatedSoldAmounts(estimateResult.soldAmounts)

        if (estimateResult.depositOut && estimateResult.depositOut !== "0") {
          const depositDecimals = etf.depositDecimals || 18
          const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
          const depositBigInt = BigInt(estimateResult.depositOut)
          const slippageMultiplier = BigInt(Math.floor((100 - slippageSell) * 100))
          const depositWithSlippage = (depositBigInt * slippageMultiplier) / 10000n
          const depositNumber = Number(depositWithSlippage) / Number(depositMultiplier)
          const estimatedDeposit = formatNumberToString(depositNumber, depositDecimals)
          setMinOut(estimatedDeposit)
        }
      } catch (error) {
        console.error("Error estimating deposit tokens:", error)
        setEstimatedSoldAmounts([])
      }

      setIsCheckingAllowance(false)
      setIsEstimatingDeposit(false)
    } else {
      setShareTokenAllowance(false)
      setMinOut("")
    }
  }

  const handleMaxClick = async () => {
    if (shareTokenBalance !== null && etf && web3Provider && address) {
      setSellShares(shareTokenBalance)
      await handleSharesChange(shareTokenBalance)
    }
  }

  const handleApprove = async () => {
    if (!etf || !sellShares || parseFloat(sellShares) <= 0) {
      toast.error("Please enter a valid number of shares")
      return
    }

    try {
      const sharesDecimals = 18
      const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
      const [sharesInteger = "0", sharesFractional = ""] = sellShares.split(".")
      const paddedSharesFractional = sharesFractional.padEnd(sharesDecimals, "0").slice(0, sharesDecimals)
      const sharesWei = (BigInt(sharesInteger) * sharesMultiplier + BigInt(paddedSharesFractional)).toString()

      await approveToken({
        tokenAddress: etf.shareToken,
        spenderAddress: etf.vault,
        amount: sharesWei
      })

      toast.success("Token approved successfully!")
      if (web3Provider && address) {
        const hasAllowance = await checkAllowance(
          web3Provider,
          address,
          etf.shareToken,
          etf.vault,
          sharesWei
        )
        setShareTokenAllowance(hasAllowance)

        // Automatically trigger redeem after approval
        if (hasAllowance && minOut && parseFloat(minOut) > 0) {
          await handleConfirm()
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Approval failed"
      toast.error(errorMessage)
    }
  }

  const handleConfirm = async () => {
    if (!etf || !sellShares || parseFloat(sellShares) <= 0) {
      toast.error("Please enter a valid number of shares")
      return
    }

    if (!minOut || parseFloat(minOut) < 0) {
      toast.error("Please enter a valid minimum output")
      return
    }

    try {
      const sharesDecimals = 18
      const sharesMultiplier = BigInt(10) ** BigInt(sharesDecimals)
      const [sharesInteger = "0", sharesFractional = ""] = sellShares.split(".")
      const paddedSharesFractional = sharesFractional.padEnd(sharesDecimals, "0").slice(0, sharesDecimals)
      const sharesWei = (BigInt(sharesInteger) * sharesMultiplier + BigInt(paddedSharesFractional)).toString()

      const depositDecimals = etf.depositDecimals || 18
      const depositMultiplier = BigInt(10) ** BigInt(depositDecimals)
      const [minOutInteger = "0", minOutFractional = ""] = minOut.split(".")
      const paddedMinOutFractional = minOutFractional.padEnd(depositDecimals, "0").slice(0, depositDecimals)
      const minOutWei = (BigInt(minOutInteger) * depositMultiplier + BigInt(paddedMinOutFractional)).toString()

      const result = await redeem({
        factory: etf.factory,
        vault: etf.vault,
        shareToken: etf.shareToken,
        shares: sharesWei,
        minOut: minOutWei,
        slippageBps: percentageToBps(slippageSell)
      })

      const receivedAmount = Number(result.depositOut) / Number(depositMultiplier)
      const depositSymbol = etf.depositSymbol || etf.depositToken
      toast.success(
        `Successfully redeemed! Received ${receivedAmount.toFixed(6)} ${depositSymbol} tokens`
      )
      onClose()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Redeem failed"
      toast.error(errorMessage)
    }
  }

  if (!etf) return null

  return (
    <Modal open={open} onClose={onClose} title={`Sell ${etf.symbol}`}>
      <div className={s.modalContent}>
        <p className={s.modalDescription}>
          Redeem ETF shares to receive {etf.depositSymbol || "tokens"}
        </p>
        <Input
          label="Shares to Redeem"
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={sellShares}
          onChange={(e) => handleSharesChange(e.target.value)}
          icon="hugeicons:chart-01"
          balance={shareTokenBalance ?? undefined}
          showMaxButton={!!shareTokenBalance && parseFloat(shareTokenBalance) > 0}
          onMaxClick={handleMaxClick}
        />
        <div className={s.slippageContainer}>
          <label className={s.slippageLabel}>Slippage Tolerance</label>
          <div className={s.slippageButtons}>
            <button
              type="button"
              className={s.slippageButton + (slippageSell === 0.25 ? ` ${s.active}` : "")}
              onClick={() => setSlippageSell(0.25)}
            >
              0.25%
            </button>
            <button
              type="button"
              className={s.slippageButton + (slippageSell === 0.5 ? ` ${s.active}` : "")}
              onClick={() => setSlippageSell(0.5)}
            >
              0.5%
            </button>
            <button
              type="button"
              className={s.slippageButton + (slippageSell === 1 ? ` ${s.active}` : "")}
              onClick={() => setSlippageSell(1)}
            >
              1%
            </button>
          </div>
        </div>
        <Input
          label={`Minimum Output (${etf.depositSymbol || "TOKEN"})`}
          type="text"
          inputMode="decimal"
          placeholder={isEstimatingDeposit ? "Estimating..." : "0.0"}
          value={minOut}
          onChange={(e) => {
            const validatedValue = validateDecimalInput(e.target.value, etf.depositDecimals || 18)
            setMinOut(validatedValue)
          }}
          icon="hugeicons:wallet-01"
          helperText={
            isEstimatingDeposit
              ? "Estimating deposit tokens..."
              : `Minimum ${etf.depositSymbol || "tokens"} you're willing to accept`
          }
          disabled={isEstimatingDeposit}
        />

        {estimatedSoldAmounts.length > 0 && etf.assets && (
          <div className={s.tokenDistribution}>
            <div className={s.tokenDistributionHeader}>
              <Icon icon="hugeicons:pie-chart" />
              <span>Tokens to be Sold</span>
            </div>
            <div className={s.tokenDistributionList}>
              {etf.assets.map((asset, index) => {
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
          {shareTokenAllowance ? (
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={isContractLoading || !sellShares || !minOut}
              iconLeft={isContractLoading ? "hugeicons:loading-01" : "hugeicons:checkmark-circle-02"}
            >
              {isContractLoading ? "Processing..." : "Confirm Sell"}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleApprove}
              disabled={isContractLoading || isCheckingAllowance || !sellShares}
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

