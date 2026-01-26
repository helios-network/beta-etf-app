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

interface TokenInput {
  symbol: string
  amount: string
  percentage: number
}

export default function ETFMint() {
  const chainId = useChainId()
  const { address } = useAccount()
  const router = useRouter()
  const searchParams = useSearchParams()

  const etfSymbol = searchParams.get("symbol") || "ETF"

  const [mintAmount, setMintAmount] = useState("")
  const [selectedTokens, setSelectedTokens] = useState<TokenInput[]>([
    { symbol: "USDC", amount: "", percentage: 40 },
    { symbol: "USDT", amount: "", percentage: 30 },
    { symbol: "DAI", amount: "", percentage: 30 }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const isEthereumNetwork = chainId === ETHEREUM_NETWORK_ID
  const isWalletConnected = !!address

  const handleMintAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMintAmount(value)
  }

  const handleTokenAmountChange = (index: number, amount: string) => {
    setSelectedTokens((prev) => {
      const updated = [...prev]
      updated[index].amount = amount
      return updated
    })
  }

  const calculateTotalValue = () => {
    return selectedTokens.reduce((sum, token) => {
      return sum + (parseFloat(token.amount) || 0)
    }, 0)
  }

  const handlePreview = () => {
    if (!mintAmount || parseFloat(mintAmount) <= 0) {
      toast.error("Enter a valid ETF amount to mint")
      return
    }

    const hasAllTokens = selectedTokens.every(
      (t) => t.amount && parseFloat(t.amount) > 0
    )
    if (!hasAllTokens) {
      toast.error("Please provide amounts for all tokens")
      return
    }

    setShowPreview(true)
  }

  const handleConfirmMint = async () => {
    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast.success(`Successfully minted ${mintAmount} ${etfSymbol} tokens!`)
      setShowPreview(false)
      setMintAmount("")
      setSelectedTokens([
        { symbol: "USDC", amount: "", percentage: 40 },
        { symbol: "USDT", amount: "", percentage: 30 },
        { symbol: "DAI", amount: "", percentage: 30 }
      ])

      setTimeout(() => {
        router.push("/etf-list")
      }, 1000)
    } catch (error: any) {
      toast.error(error?.message || "Minting failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={s.etfMint}>
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
                icon="hugeicons:coins-01"
                title="Mint ETF Tokens"
                description={`Provide underlying assets to mint new ${etfSymbol} tokens`}
              />

              <div className={s.form}>
                <Input
                  label="Amount of ETF to Mint"
                  icon="hugeicons:coins-01"
                  type="number"
                  value={mintAmount}
                  placeholder="e.g., 100"
                  onChange={handleMintAmountChange}
                  min={0}
                />

                <div className={s.tokensSection}>
                  <h3>Provide Underlying Assets</h3>
                  <p>Enter the amount of each token needed</p>

                  {selectedTokens.map((token, index) => (
                    <div key={token.symbol} className={s.tokenInput}>
                      <div className={s.tokenHeader}>
                        <span className={s.symbol}>{token.symbol}</span>
                        <span className={s.percentage}>
                          {token.percentage}%
                        </span>
                      </div>
                      <Input
                        type="number"
                        value={token.amount}
                        placeholder={`Enter ${token.symbol} amount`}
                        onChange={(e) =>
                          handleTokenAmountChange(index, e.target.value)
                        }
                        min={0}
                      />
                    </div>
                  ))}
                </div>

                <div className={s.summary}>
                  <div className={s.summaryRow}>
                    <span>Total Value to Provide</span>
                    <span className={s.amount}>
                      ${calculateTotalValue().toFixed(2)}
                    </span>
                  </div>
                  <div className={s.summaryRow}>
                    <span>ETF Tokens to Receive</span>
                    <span className={s.amount}>
                      {mintAmount || "0"} {etfSymbol}
                    </span>
                  </div>
                </div>

                <div className={s.actions}>
                  <Button
                    variant="primary"
                    onClick={handlePreview}
                    disabled={
                      !isWalletConnected || !isEthereumNetwork || !mintAmount
                    }
                    iconLeft="hugeicons:eye"
                  >
                    Preview Mint
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className={s.rightColumn}>
            <Card className={s.infoCard}>
              <Heading
                icon="hugeicons:book-open-01"
                title="How to Mint"
                description="Step-by-step guide"
              />

              <div className={s.steps}>
                <div className={s.step}>
                  <div className={s.stepNumber}>1</div>
                  <div className={s.stepContent}>
                    <h4>Enter Mint Amount</h4>
                    <p>Specify how many ETF tokens you want to mint</p>
                  </div>
                </div>

                <div className={s.step}>
                  <div className={s.stepNumber}>2</div>
                  <div className={s.stepContent}>
                    <h4>Provide Underlying Assets</h4>
                    <p>Enter amounts for each token in the ETF basket</p>
                  </div>
                </div>

                <div className={s.step}>
                  <div className={s.stepNumber}>3</div>
                  <div className={s.stepContent}>
                    <h4>Approve & Confirm</h4>
                    <p>
                      Approve token transfers and confirm the mint transaction
                    </p>
                  </div>
                </div>

                <div className={s.step}>
                  <div className={s.stepNumber}>4</div>
                  <div className={s.stepContent}>
                    <h4>Receive ETF Tokens</h4>
                    <p>
                      Your new ETF tokens will be transferred to your wallet
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className={s.benefitsCard}>
              <h3>Benefits</h3>
              <ul>
                <li>
                  <Icon icon="hugeicons:check-circle" />
                  <span>Instant minting on-chain</span>
                </li>
                <li>
                  <Icon icon="hugeicons:check-circle" />
                  <span>Transparent pricing</span>
                </li>
                <li>
                  <Icon icon="hugeicons:check-circle" />
                  <span>Low slippage</span>
                </li>
                <li>
                  <Icon icon="hugeicons:check-circle" />
                  <span>Full composability</span>
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
                title="Mint Preview"
                description="Review your mint transaction details"
              />

              <div className={s.previewContent}>
                <div className={s.previewRow}>
                  <span>ETF Tokens to Mint</span>
                  <span className={s.value}>
                    {mintAmount} {etfSymbol}
                  </span>
                </div>

                {selectedTokens.map((token) => (
                  <div key={token.symbol} className={s.previewRow}>
                    <span className={s.label}>{token.symbol}</span>
                    <span className={s.value}>{token.amount}</span>
                  </div>
                ))}

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
                    onClick={handleConfirmMint}
                    disabled={isLoading}
                    iconRight="hugeicons:arrow-right-01"
                  >
                    {isLoading ? "Minting..." : "Confirm Mint"}
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
