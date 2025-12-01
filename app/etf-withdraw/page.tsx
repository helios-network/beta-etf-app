"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import { Input } from "@/components/input"
import { useAccount, useChainId } from "wagmi"
import { ETHEREUM_NETWORK_ID } from "@/config/app"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, ChangeEvent } from "react"
import { toast } from "sonner"
import s from "./page.module.scss"

interface TokenOutput {
  symbol: string
  amount: string
  percentage: number
}

export default function ETFWithdraw() {
  const chainId = useChainId()
  const { address } = useAccount()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const etfSymbol = searchParams.get("symbol") || "ETF"

  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [expectedTokens, setExpectedTokens] = useState<TokenOutput[]>([
    { symbol: "USDC", amount: "", percentage: 40 },
    { symbol: "USDT", amount: "", percentage: 30 },
    { symbol: "DAI", amount: "", percentage: 30 }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const isEthereumNetwork = chainId === ETHEREUM_NETWORK_ID
  const isWalletConnected = !!address

  const handleWithdrawAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setWithdrawAmount(value)

    if (value && parseFloat(value) > 0) {
      const amount = parseFloat(value)
      setExpectedTokens((prev) =>
        prev.map((token) => ({
          ...token,
          amount: (amount * (token.percentage / 100)).toFixed(6)
        }))
      )
    } else {
      setExpectedTokens((prev) =>
        prev.map((token) => ({
          ...token,
          amount: ""
        }))
      )
    }
  }

  const calculateTotalValue = () => {
    return expectedTokens.reduce((sum, token) => {
      return sum + (parseFloat(token.amount) || 0)
    }, 0)
  }

  const handlePreview = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error("Enter a valid ETF amount to withdraw")
      return
    }

    setShowPreview(true)
  }

  const handleConfirmWithdraw = async () => {
    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      
      toast.success(`Successfully withdrew ${withdrawAmount} ${etfSymbol} tokens!`)
      setShowPreview(false)
      setWithdrawAmount("")
      setExpectedTokens([
        { symbol: "USDC", amount: "", percentage: 40 },
        { symbol: "USDT", amount: "", percentage: 30 },
        { symbol: "DAI", amount: "", percentage: 30 }
      ])
      
      setTimeout(() => {
        router.push("/etf-list")
      }, 1000)
    } catch (error: any) {
      toast.error(error?.message || "Withdrawal failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={s.etfWithdraw}>
      <div className={s.container}>
        <Button
          variant="secondary"
          size="small"
          onClick={() => router.back()}
          iconLeft="hugeicons:arrow-left-01"
          className={s.backButton}
        >
          Back
        </Button>

        <div className={s.content}>
          <div className={s.leftColumn}>
            <Card>
              <Heading
                icon="hugeicons:minus-circle"
                title="Withdraw ETF Tokens"
                description={`Burn ${etfSymbol} tokens to receive underlying assets`}
              />

              <div className={s.form}>
                <Input
                  label="Amount of ETF to Withdraw"
                  icon="hugeicons:coins-01"
                  type="number"
                  value={withdrawAmount}
                  placeholder="e.g., 100"
                  onChange={handleWithdrawAmountChange}
                  min={0}
                />

                <div className={s.tokensSection}>
                  <h3>You Will Receive</h3>
                  <p>Underlying assets from your ETF withdrawal</p>

                  {expectedTokens.map((token) => (
                    <div key={token.symbol} className={s.tokenOutput}>
                      <div className={s.tokenHeader}>
                        <span className={s.symbol}>{token.symbol}</span>
                        <span className={s.percentage}>{token.percentage}%</span>
                      </div>
                      <div className={s.amountDisplay}>
                        <span className={s.amount}>{token.amount || "0"}</span>
                        <span className={s.unit}>{token.symbol}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={s.summary}>
                  <div className={s.summaryRow}>
                    <span>ETF Tokens to Burn</span>
                    <span className={s.amount}>{withdrawAmount || "0"} {etfSymbol}</span>
                  </div>
                  <div className={s.summaryRow}>
                    <span>Total Value to Receive</span>
                    <span className={s.amount}>${calculateTotalValue().toFixed(2)}</span>
                  </div>
                </div>

                <div className={s.actions}>
                  <Button
                    variant="primary"
                    onClick={handlePreview}
                    disabled={!isWalletConnected || !isEthereumNetwork || !withdrawAmount}
                    iconLeft="hugeicons:eye"
                  >
                    Preview Withdrawal
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className={s.rightColumn}>
            <Card className={s.infoCard}>
              <Heading
                icon="hugeicons:info-circle"
                title="How to Withdraw"
                description="Step-by-step guide"
              />

              <div className={s.steps}>
                <div className={s.step}>
                  <div className={s.stepNumber}>1</div>
                  <div className={s.stepContent}>
                    <h4>Enter Withdrawal Amount</h4>
                    <p>Specify how many ETF tokens you want to burn</p>
                  </div>
                </div>

                <div className={s.step}>
                  <div className={s.stepNumber}>2</div>
                  <div className={s.stepContent}>
                    <h4>Review Underlying Assets</h4>
                    <p>Check the tokens you&apos;ll receive in return</p>
                  </div>
                </div>

                <div className={s.step}>
                  <div className={s.stepNumber}>3</div>
                  <div className={s.stepContent}>
                    <h4>Confirm Transaction</h4>
                    <p>Approve and confirm the withdrawal transaction</p>
                  </div>
                </div>

                <div className={s.step}>
                  <div className={s.stepNumber}>4</div>
                  <div className={s.stepContent}>
                    <h4>Receive Assets</h4>
                    <p>Underlying tokens will be transferred to your wallet</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className={s.benefitsCard}>
              <h3>Benefits</h3>
              <ul>
                <li>
                  <Icon icon="hugeicons:check-circle" />
                  <span>Instant withdrawal on-chain</span>
                </li>
                <li>
                  <Icon icon="hugeicons:check-circle" />
                  <span>No hidden fees</span>
                </li>
                <li>
                  <Icon icon="hugeicons:check-circle" />
                  <span>Transparent pricing</span>
                </li>
                <li>
                  <Icon icon="hugeicons:check-circle" />
                  <span>Flexible redemption</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>

        {showPreview && (
          <div className={s.previewModal}>
            <Card className={s.previewCard}>
              <button
                className={s.closeButton}
                onClick={() => setShowPreview(false)}
              >
                <Icon icon="hugeicons:x" />
              </button>

              <Heading
                icon="hugeicons:eye"
                title="Withdrawal Preview"
                description="Review your withdrawal transaction details"
              />

              <div className={s.previewContent}>
                <div className={s.previewRow}>
                  <span>ETF Tokens to Burn</span>
                  <span className={s.value}>{withdrawAmount} {etfSymbol}</span>
                </div>

                <div className={s.divider} />

                <div className={s.previewSection}>
                  <h4>You Will Receive</h4>
                  {expectedTokens.map((token) => (
                    <div key={token.symbol} className={s.previewRow}>
                      <span className={s.label}>{token.symbol}</span>
                      <span className={s.value}>{token.amount}</span>
                    </div>
                  ))}
                </div>

                <div className={s.divider} />

                <div className={s.previewRow + " " + s.total}>
                  <span>Total Value</span>
                  <span>${calculateTotalValue().toFixed(2)}</span>
                </div>

                <div className={s.previewActions}>
                  <Button
                    variant="secondary"
                    onClick={() => setShowPreview(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleConfirmWithdraw}
                    disabled={isLoading}
                    iconRight="hugeicons:arrow-right-01"
                  >
                    {isLoading ? "Processing..." : "Confirm Withdrawal"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
