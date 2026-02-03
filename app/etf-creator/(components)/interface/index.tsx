"use client"

import { Button, Card, Heading, Icon, Input, Modal } from "@/components"
import { useRecentETFsContext } from "@/context/RecentETFsContext"
import { useETFContract } from "@/hooks/useETFContract"
import { verifyETF, VerifyETFResponse } from "@/helpers/request"
import { ChangeEvent, useState } from "react"
import { toast } from "sonner"
import { useAccount, useChainId } from "wagmi"
import s from "./interface.module.scss"
import { getChainConfig } from "@/config/chain-config"
import { ASSETS_ADDRS } from "@/config/constants"

type TokenComponent = {
  token: string
  weight: number
}

type ETFForm = {
  name: string
  symbol: string
  components: TokenComponent[]
  currentTokenAddress: string
  currentTokenWeight: string
  rebalancingMode: "automatic" | "manual" | "no-rebalancing" | null
  initialSharePrice: string
}

type VerifyState = {
  status: "idle" | "loading" | "error" | "success"
  errorMessage: string | null
  backendResult: VerifyETFResponse | null
}

export const ETFCreatorInterface = () => {
  const chainId = useChainId()
  const { address } = useAccount()
  const [showPreview, setShowPreview] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [deployedETF, setDeployedETF] = useState<any>(null)
  const [showAutomaticModal, setShowAutomaticModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  const [showNoRebalancingModal, setShowNoRebalancingModal] = useState(false)
  const [showAddTokenModal, setShowAddTokenModal] = useState(false)
  const [showInitialPriceModal, setShowInitialPriceModal] = useState(false)
  const [editingToken, setEditingToken] = useState<string | null>(null)

  const [form, setForm] = useState<ETFForm>({
    name: "",
    symbol: "",
    components: [],
    currentTokenAddress: "",
    currentTokenWeight: "",
    rebalancingMode: null,
    initialSharePrice: "1.00"
  })

  const [verifyState, setVerifyState] = useState<VerifyState>({
    status: "idle",
    errorMessage: null,
    backendResult: null
  })

  const { addETF } = useRecentETFsContext()
  const { createETF, isLoading: isCreatingETF } = useETFContract()
  const isLoadingDeploy = isLoading || isCreatingETF

  const handleInputChange =
    (field: keyof ETFForm) =>
      (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value

        if (field === "currentTokenWeight") {
          const weightValue = parseFloat(value)
          if (
            value !== "" &&
            (isNaN(weightValue) ||
              weightValue < 0 ||
              weightValue > 100)
          ) {
            return
          }
        }

        if (field === "initialSharePrice") {
          const priceValue = parseFloat(value)
          if (
            value !== "" &&
            (isNaN(priceValue) || priceValue <= 0)
          ) {
            return
          }
        }

        setForm((prev) => ({
          ...prev,
          [field]: value
        }))
      }

  const handleAddToken = () => {
    if (
      !form.currentTokenAddress ||
      !form.currentTokenWeight
    ) {
      toast.error("Please fill in token address and weight")
      return
    }

    const weight = parseFloat(form.currentTokenWeight)
    const currentTotal = form.components.reduce((sum, c) => sum + c.weight, 0)

    if (editingToken) {
      const existingComponent = form.components.find(
        (c) => c.token.toLowerCase() === editingToken.toLowerCase()
      )
      if (!existingComponent) {
        toast.error("Token not found")
        return
      }

      const weightDifference = weight - existingComponent.weight
      if (currentTotal + weightDifference > 100) {
        toast.error("Total weight cannot exceed 100%")
        return
      }

      setForm((prev) => ({
        ...prev,
        components: prev.components.map((c) =>
          c.token.toLowerCase() === editingToken.toLowerCase()
            ? { token: form.currentTokenAddress, weight: weight }
            : c
        ),
        currentTokenAddress: "",
        currentTokenWeight: ""
      }))

      setEditingToken(null)
      setShowAddTokenModal(false)
      toast.success("Token updated")
    } else {
      if (currentTotal + weight > 100) {
        toast.error("Total weight cannot exceed 100%")
        return
      }

      if (
        form.components.some(
          (c) =>
            c.token.toLowerCase() === form.currentTokenAddress.toLowerCase()
        )
      ) {
        toast.error("Token already added to basket")
        return
      }

      const newComponent: TokenComponent = {
        token: form.currentTokenAddress,
        weight: weight
      }

      setForm((prev) => ({
        ...prev,
        components: [...prev.components, newComponent],
        currentTokenAddress: "",
        currentTokenWeight: ""
      }))

      setShowAddTokenModal(false)
      toast.success("Token added to basket")
    }

    setVerifyState({
      status: "idle",
      errorMessage: null,
      backendResult: null
    })
  }

  const handleEditToken = (tokenAddress: string) => {
    const component = form.components.find(
      (c) => c.token.toLowerCase() === tokenAddress.toLowerCase()
    )
    if (component) {
      setEditingToken(tokenAddress)
      setForm((prev) => ({
        ...prev,
        currentTokenAddress: component.token,
        currentTokenWeight: component.weight.toString()
      }))
      setShowAddTokenModal(true)
    }
  }

  const handleCloseAddTokenModal = () => {
    setShowAddTokenModal(false)
    setEditingToken(null)
    setForm((prev) => ({
      ...prev,
      currentTokenAddress: "",
      currentTokenWeight: ""
    }))
  }

  const handleRemoveToken = (token: string) => {
    setForm((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.token !== token)
    }))
    // Reset verification when components change
    setVerifyState({
      status: "idle",
      errorMessage: null,
      backendResult: null
    })
    toast.info("Token removed from basket")
  }

  const getTotalWeight = () => {
    return form.components.reduce((sum, c) => sum + c.weight, 0)
  }

  const handleVerify = async () => {
    setVerifyState({
      status: "loading",
      errorMessage: null,
      backendResult: null
    })

    try {
      console.log(chainId, (ASSETS_ADDRS as any)[chainId]?.USDC)
      const data = await verifyETF({
        chainId: chainId, // Ethereum mainnet
        depositToken: (ASSETS_ADDRS as any)[chainId]?.USDC || "",
        components: form.components
      })

      if (data.status === "ERROR") {
        if (data.reason == "INSUFFICIENT_LIQUIDITY") {
          toast.error(`Insufficient liquidity for ${data.details?.token}. Required: $${data.details?.requiredUSD.toLocaleString()}. Please add more liquidity to the token.`, {
            duration: 10000,
            closeButton: true
          })
          setVerifyState({
            status: "error",
            errorMessage: data.reason || "Verification failed",
            backendResult: data
          })
          return
        }
        setVerifyState({
          status: "error",
          errorMessage: data.reason || "Verification failed",
          backendResult: data
        })
        toast.error(JSON.stringify(data), {
          duration: 10000,
          closeButton: true
        })
      } else if (data.status === "OK" && data.readyForCreation) {
        setVerifyState({
          status: "success",
          errorMessage: null,
          backendResult: data
        })
        toast.success("Verification successful! Ready to create ETF.")
      } else {
        setVerifyState({
          status: "error",
          errorMessage: "Backend returned unexpected status",
          backendResult: data
        })
        toast.error("Backend returned unexpected status")
      }
    } catch (error: any) {
      console.error("Error verifying ETF:", error)
      setVerifyState({
        status: "error",
        errorMessage: error?.message || "Failed to verify with backend",
        backendResult: null
      })
      toast.error(error?.message || "Failed to verify with backend")
    }
  }

  const handleDeploy = async () => {
    if (!verifyState.backendResult || verifyState.status !== "success") {
      toast.error("Please verify liquidity & paths first")
      return
    }

    setIsLoading(true)

    try {
      const backendData = verifyState.backendResult

      // Extract data from backend response
      const assetTokens = backendData.components!.map((c) => c.tokenAddress)
      const priceFeeds = backendData.components!.map((c) => c.feed)
      const targetWeightsBps = form.components.map((c) => Math.round(c.weight * 100))
      // For deposit token in composition, depositPath.encoded may contain zero addresses (no swap needed)
      const swapPathsData = backendData.components!.map((c) => c.depositPath.encoded)

      // Determine pricing mode from first component
      const pricingModeMap: { [key: string]: number } = {
        "V2_PLUS_FEED": 0,
        "V3_PLUS_FEED": 1,
        "V2_PLUS_V2": 2,
        "V3_PLUS_V3": 3
      }
      const pricingMode = pricingModeMap[backendData.components![0].pricingMode] ?? 0


      let router = ""
      let quoter = ""
      let depositFeed = "";

      switch (chainId) {
        case 42161:
          depositFeed = "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3" // USDC/USD feed

          if (pricingMode === 0 || pricingMode === 2) { // V2_PLUS_FEED | V2_PLUS_V2
            router = "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24" // Uniswap V2 Router
            quoter = "0x0000000000000000000000000000000000000000" // None
          } else if (pricingMode === 1 || pricingMode === 3) { // V3_PLUS_FEED | V3_PLUS_V3
            router = "0xE592427A0AEce92De3Edee1F18E0157C05861564" // Uniswap V3 Router
            quoter = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6" // Uniswap V3 Quoter
          }
          break
        case 1:
          depositFeed = "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6" // USDC/USD feed

          if (pricingMode === 0 || pricingMode === 2) { // V2_PLUS_FEED | V2_PLUS_V2
            router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" // Uniswap V2 Router
            quoter = "0x0000000000000000000000000000000000000000" // None
          } else if (pricingMode === 1 || pricingMode === 3) { // V3_PLUS_FEED | V3_PLUS_V3
            router = "0xE592427A0AEce92De3Edee1F18E0157C05861564" // Uniswap V3 Router
            quoter = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6" // Uniswap V3 Quoter
          }
          break
      }

      // Convert initial share price to wei (18 decimals)
      const sharePriceDecimals = 18
      const sharePriceMultiplier = BigInt(10) ** BigInt(sharePriceDecimals)
      const [priceInteger = "0", priceFractional = ""] = form.initialSharePrice.split(".")
      const paddedPriceFractional = priceFractional
        .padEnd(sharePriceDecimals, "0")
        .slice(0, sharePriceDecimals)
      const initialSharePriceWei = (
        BigInt(priceInteger) * sharePriceMultiplier +
        BigInt(paddedPriceFractional)
      ).toString()

      // Call the createETF function with new parameters
      const result = await createETF({
        factoryAddress: backendData.factoryAddress,
        depositToken: (ASSETS_ADDRS as any)[chainId]?.USDC || "", // USDC
        depositFeed: depositFeed, // USDC/USD feed
        router: router,
        quoter: quoter,
        assetTokens,
        priceFeeds: priceFeeds.map((feed) => (feed == null || feed == undefined) ? "0x0000000000000000000000000000000000000000" : feed),
        targetWeightsBps,
        swapPathsData,
        name: form.name,
        symbol: form.symbol.toUpperCase(),
        pricingMode,
        initialSharePrice: initialSharePriceWei
      })

      // Transform components to TokenInBasket format with symbols from backend
      const tokensWithSymbols = form.components.map((comp, idx) => ({
        address: comp.token,
        symbol: verifyState.backendResult!.components![idx].symbol,
        percentage: comp.weight
      }))

      const newETF = {
        name: form.name,
        symbol: form.symbol.toUpperCase(),
        tokens: tokensWithSymbols,
        address: result.vault,
        shareToken: result.shareToken,
        txHash: result.txHash,
        timestamp: Date.now(),
        chainId
      }

      setDeployedETF(newETF)
      addETF(newETF)
      setShowPreview(false)
      setShowSuccess(true)
      toast.success("ETF basket created successfully!")
    } catch (error: any) {
      toast.error(error?.message || "ETF creation failed. Please try again.")
      console.error("ETF creation failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      name: "",
      symbol: "",
      components: [],
      currentTokenAddress: "",
      currentTokenWeight: "",
      rebalancingMode: null,
      initialSharePrice: "1.00"
    })
    setVerifyState({
      status: "idle",
      errorMessage: null,
      backendResult: null
    })
    setDeployedETF(null)
    setShowSuccess(false)
    setShowPreview(false)
    setShowAddTokenModal(false)
  }

  const isFormValid =
    form.name &&
    form.symbol &&
    form.components.length > 0 &&
    getTotalWeight() === 100 &&
    form.rebalancingMode !== null &&
    form.initialSharePrice &&
    parseFloat(form.initialSharePrice) > 0

  const isWalletConnected = !!address
  const canVerify = isFormValid && (!verifyState.backendResult || verifyState.status === "error")
  const canDeploy = isFormValid && verifyState.status === "success"

  return (
    <>
      <Card className={s.interface}>
        <Heading
          icon="hugeicons:package"
          title="ETF Basket Creator"
          description="Create a basket of tokens with custom allocations."
        />

        <div className={s.content}>
          <div className={s.form}>
            {/* ETF Symbol */}
            <Input
              label="ETF Symbol"
              icon="hugeicons:tag-01"
              type="text"
              value={form.symbol}
              placeholder="e.g., DEFI"
              onChange={handleInputChange("symbol")}
              maxLength={20}
              style={{ textTransform: "uppercase" }}
            />

            {/* ETF Name */}
            <Input
              label="ETF Basket Name"
              icon="hugeicons:text"
              type="text"
              value={form.name}
              placeholder="e.g., DeFi Blue Chip Basket"
              onChange={handleInputChange("name")}
              maxLength={50}
            />

            {/* Initial Share Price */}
            <div className={s.inputWithHelp}>
              <div className={s.labelWithHelp}>
                <label className={s.label}>Initial Share Price</label>
                <button
                  className={s.helpButton}
                  onClick={() => setShowInitialPriceModal(true)}
                  type="button"
                  title="Learn more about Initial Share Price"
                >
                  <Icon icon="hugeicons:help-circle" />
                </button>
              </div>
              <Input
                icon="hugeicons:currency-dollar"
                type="number"
                value={form.initialSharePrice}
                placeholder="e.g., 1.0"
                onChange={handleInputChange("initialSharePrice")}
                min="0"
                step="0.000000000000000001"
              />
            </div>

            {/* Rebalancing Mode Selection */}
            <div className={s.modeSection}>
              <div className={s.modeHeader}>
                <h3>Rebalancing Mode</h3>
                <p>Choose how your ETF will be managed</p>
              </div>

              <div className={s.modeGrid}>
                <div
                  className={`${s.modeButton} ${form.rebalancingMode === "automatic" ? s.selected : ""
                    }`}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      rebalancingMode: "automatic"
                    }))
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setForm((prev) => ({
                        ...prev,
                        rebalancingMode: "automatic"
                      }))
                    }
                  }}
                >
                  <div className={s.modeButtonContent}>
                    <h4>Automatic Rebalancing</h4>
                    <p>Automatically maintains target allocations</p>
                    <button
                      className={s.infoButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowAutomaticModal(true)
                      }}
                      type="button"
                      title="Learn more about Automatic Rebalancing"
                    >
                      <Icon icon="hugeicons:help-circle" />
                    </button>
                  </div>
                </div>

                <div
                  className={`${s.modeButton} ${form.rebalancingMode === "manual" ? s.selected : ""
                    } ${s.disabled}`}
                  onClick={() => {
                    // Disabled
                  }}
                  role="button"
                  tabIndex={-1}
                  aria-disabled="true"
                >
                  <div className={s.modeButtonContent}>
                    <h4>Manual Rebalancing</h4>
                    <p>Full control over reserves and allocations</p>
                    <button
                      className={s.infoButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowManualModal(true)
                      }}
                      type="button"
                      title="Learn more about Manual Rebalancing"
                    >
                      <Icon icon="hugeicons:help-circle" />
                    </button>
                  </div>
                </div>

                <div
                  className={`${s.modeButton} ${form.rebalancingMode === "no-rebalancing" ? s.selected : ""
                    } ${s.disabled}`}
                  onClick={() => {
                    // Disabled
                  }}
                  role="button"
                  tabIndex={-1}
                  aria-disabled="true"
                >
                  <div className={s.modeButtonContent}>
                    <h4>No Rebalancing</h4>
                    <p>Fixed composition, no automatic adjustments</p>
                    <button
                      className={s.infoButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowNoRebalancingModal(true)
                      }}
                      type="button"
                      title="Learn more about No Rebalancing"
                    >
                      <Icon icon="hugeicons:help-circle" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Token Composition Section */}
            <div className={s.tokenSection}>
              <div className={s.sectionHeader}>
                <h3>Token Composition</h3>
                <div className={s.headerActions}>
                  <span className={s.totalPercentage}>
                    Total: {getTotalWeight()}%
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => setShowAddTokenModal(true)}
                    iconLeft="hugeicons:add-01"
                    size="small"
                    className={s.addTokenBtn}
                  >
                    Add Token
                  </Button>
                </div>
              </div>

              {/* Component List */}
              {form.components.length > 0 ? (
                <div className={s.tokenList}>
                  {form.components.map((component) => (
                    <div key={component.token} className={s.tokenItem}>
                      <div className={s.tokenInfo}>
                        <span className={s.tokenAddress}>
                          {component.token.slice(0, 6)}...
                          {component.token.slice(-4)}
                        </span>
                      </div>
                      <div className={s.tokenPercentage}>
                        {component.weight}%
                      </div>
                      <div className={s.tokenActions}>
                        <Button
                          variant="secondary"
                          size="xsmall"
                          onClick={() => handleEditToken(component.token)}
                          iconLeft="hugeicons:edit-01"
                          className={s.editBtn}
                          title="Edit token"
                        />
                        <Button
                          variant="secondary"
                          size="xsmall"
                          onClick={() => handleRemoveToken(component.token)}
                          iconLeft="hugeicons:delete-02"
                          className={s.removeBtn}
                          title="Remove token"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={s.emptyTokenList}>
                  <p>No tokens added yet. Click &quot;Add Token&quot; to get started.</p>
                </div>
              )}

              {getTotalWeight() !== 100 && form.components.length > 0 && (
                <div className={s.percentageWarning}>
                  <Icon icon="hugeicons:alert-02" />
                  Total weight must equal 100% (currently{" "}
                  {getTotalWeight()}%)
                </div>
              )}
            </div>

            {/* Verification Results */}
            {verifyState.status === "success" && verifyState.backendResult && (
              <div className={s.verificationResults}>
                <h3>
                  <Icon icon="hugeicons:check-circle" />
                  Verification Successful
                </h3>
                {verifyState.backendResult.components?.map((comp, idx) => (
                  <div key={idx} className={s.verifiedComponent}>
                    <div className={s.compHeader}>
                      <span className={s.compSymbol}>{comp.symbol}</span>
                      <span className={s.compMode}>{comp.pricingMode}</span>
                    </div>
                    <div className={s.compDetails}>
                      {comp.liquidityUSD >= 0 ? <span>Liquidity: ${comp.liquidityUSD.toLocaleString()}</span> : <span>Liquidity: Oracle Price</span>}
                      <span>Decimals: {comp.decimals}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {verifyState.status === "error" && (
              <div className={s.verificationError}>
                <Icon icon="hugeicons:alert-02" />
                {verifyState.errorMessage}
              </div>
            )}

            {/* Wallet Connection Warning */}
            {!isWalletConnected && (
              <div className={s.walletWarning}>
                <Icon icon="hugeicons:alert-02" />
                Please connect your wallet to create ETF baskets
              </div>
            )}

            {/* Action Buttons */}
            <div className={s.actions}>
              <Button
                variant="secondary"
                onClick={handleVerify}
                disabled={
                  !canVerify ||
                  !isWalletConnected ||
                  verifyState.status === "loading" ||
                  isLoadingDeploy
                }
                className={s.verifyBtn}
              >
                {verifyState.status === "loading"
                  ? "Verifying..."
                  : "Verify Liquidity & Paths"}
              </Button>
              <Button
                onClick={handleDeploy}
                disabled={
                  !canDeploy ||
                  !isWalletConnected ||
                  isLoadingDeploy
                }
                className={s.deployBtn}
              >
                {isLoadingDeploy
                  ? "Creating..."
                  : `Confirm Create ${form.symbol.toUpperCase() || "ETF"}`}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Preview Modal */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Review ETF Basket"
        className={s.modal}
      >
        <Card className={s.previewCard}>
          <div className={s.preview}>
            <div className={s.previewItem}>
              <span className={s.previewLabel}>Name:</span>
              <span className={s.previewValue}>{form.name}</span>
            </div>
            <div className={s.previewItem}>
              <span className={s.previewLabel}>Symbol:</span>
              <span className={s.previewValue}>
                {form.symbol.toUpperCase()}
              </span>
            </div>
            <div className={s.previewItem}>
              <span className={s.previewLabel}>Total Tokens:</span>
              <span className={s.previewValue}>{form.components.length}</span>
            </div>

            <div className={s.previewTokens}>
              <h4>Token Allocation:</h4>
              {form.components.map((component) => (
                <div key={component.token} className={s.previewTokenItem}>
                  <span className={s.previewTokenSymbol}>
                    {component.token.slice(0, 6)}...{component.token.slice(-4)}
                  </span>
                  <span className={s.previewTokenPercentage}>
                    {component.weight}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={() => setShowPreview(false)}
              className={s.editButton}
            >
              Edit
            </Button>
            <Button onClick={handleDeploy} disabled={isLoadingDeploy}>
              {isLoadingDeploy ? "Creating..." : "Confirm & Create"}
            </Button>
          </div>
        </Card>
      </Modal>

      {/* Success Modal */}
      <Modal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="ETF Basket Created!"
        className={s.modal}
      >
        <Card className={s.successCard}>
          <div className={s.success}>
            <div className={s.successItem}>
              <span className={s.successLabel}>Basket Address:</span>
              <div className={s.addressContainer}>
                <span className={s.address}>{deployedETF?.address}</span>
                <Button
                  variant="secondary"
                  size="xsmall"
                  onClick={() => {
                    navigator.clipboard.writeText(deployedETF?.address || "")
                    toast.success("Address copied!")
                  }}
                  iconLeft="hugeicons:copy-01"
                />
              </div>
            </div>

            <div className={s.successItem}>
              <span className={s.successLabel}>Share Token Address:</span>
              <div className={s.addressContainer}>
                <span className={s.address}>{deployedETF?.shareToken}</span>
                <Button
                  variant="secondary"
                  size="xsmall"
                  onClick={() => {
                    navigator.clipboard.writeText(deployedETF?.shareToken || "")
                    toast.success("Share token address copied!")
                  }}
                  iconLeft="hugeicons:copy-01"
                />
              </div>
            </div>

            <div className={s.successItem}>
              <span className={s.successLabel}>Transaction Hash:</span>
              <div className={s.addressContainer}>
                <span className={s.txHash}>{deployedETF?.txHash}</span>
                <Button
                  variant="secondary"
                  size="xsmall"
                  onClick={() => {
                    window.open(
                      `https://explorer.helioschainlabs.org/tx/${deployedETF?.txHash}`,
                      "_blank"
                    )
                  }}
                  iconLeft="hugeicons:search-02"
                />
              </div>
            </div>
          </div>

          <div className={s.successActions}>
            <Button variant="secondary" onClick={resetForm}>
              Create Another
            </Button>
            <Button
              onClick={() => {
                window.open(
                  `${getChainConfig(chainId)?.explorerUrl}/address/${deployedETF?.address}`,
                  "_blank"
                )
              }}
            >
              View on Explorer
            </Button>
          </div>
        </Card>
      </Modal>

      {/* Automatic Rebalancing Modal */}
      <Modal
        open={showAutomaticModal}
        onClose={() => setShowAutomaticModal(false)}
        title="Automatic Rebalancing Mode"
        className={s.modal}
      >
        <Card className={s.infoCard}>
          <div className={s.infoContent}>
            <div className={s.infoSection}>
              <h4>How it works:</h4>
              <p>
                The smart contract automatically rebalances the basket to
                maintain your target token allocations. When the price of tokens
                changes and allocations drift from their targets, the contract
                executes rebalancing transactions to restore the desired
                percentages.
              </p>
            </div>
            <div className={s.infoSection}>
              <h4>Key Features:</h4>
              <ul>
                <li>Automatically maintains target allocations</li>
                <li>Rebalances when allocations drift beyond threshold</li>
                <li>Minimal manual intervention required</li>
                <li>Smart contract handles all operations</li>
                <li>Best for passive management strategies</li>
              </ul>
            </div>
            <div className={s.infoSection}>
              <h4>Best For:</h4>
              <p>
                Passive investors who want a set-it-and-forget-it approach with
                consistent portfolio allocations over time.
              </p>
            </div>
          </div>
        </Card>
      </Modal>

      {/* Manual Rebalancing Modal */}
      <Modal
        open={showManualModal}
        onClose={() => setShowManualModal(false)}
        title="Manual Rebalancing Mode"
        className={s.modal}
      >
        <Card className={s.infoCard}>
          <div className={s.infoContent}>
            <div className={s.infoSection}>
              <h4>How it works:</h4>
              <p>
                You have complete control over the ETF reserve and basket
                composition. You can manually deposit tokens, withdraw tokens,
                and adjust the quantities of each token in the basket. No
                automatic rebalancing occurs.
              </p>
            </div>
            <div className={s.infoSection}>
              <h4>Key Features:</h4>
              <ul>
                <li>Full control over all reserve operations</li>
                <li>Can deposit and withdraw tokens at will</li>
                <li>Adjust token quantities independently</li>
                <li>Rebalance only when you decide</li>
                <li>Active management required</li>
              </ul>
            </div>
            <div className={s.infoSection}>
              <h4>Best For:</h4>
              <p>
                Active fund managers who want precise control over their ETF
                composition and are willing to manage rebalancing decisions
                manually.
              </p>
            </div>
          </div>
        </Card>
      </Modal>

      {/* No Rebalancing Modal */}
      <Modal
        open={showNoRebalancingModal}
        onClose={() => setShowNoRebalancingModal(false)}
        title="No Rebalancing Mode"
        className={s.modal}
      >
        <Card className={s.infoCard}>
          <div className={s.infoContent}>
            <div className={s.infoSection}>
              <h4>How it works:</h4>
              <p>
                The basket maintains a fixed composition with no automatic or
                manual rebalancing. This is useful for creating specialized
                baskets like a multi-origin token collection (e.g., WETH from
                Ethereum, WETH from BSC, etc.) where the exact token sources
                matter.
              </p>
            </div>
            <div className={s.infoSection}>
              <h4>Key Features:</h4>
              <ul>
                <li>Fixed basket composition</li>
                <li>No automatic rebalancing</li>
                <li>No manual rebalancing possible</li>
                <li>Ideal for multi-origin token baskets</li>
                <li>Tracks different versions of the same token</li>
              </ul>
            </div>
            <div className={s.infoSection}>
              <h4>Best For:</h4>
              <p>
                Creating specialized indices or baskets that require multiple
                versions of the same token from different blockchain sources or
                maintaining exact token composition over time.
              </p>
            </div>
          </div>
        </Card>
      </Modal>

      {/* Add Token Modal */}
      <Modal
        open={showAddTokenModal}
        onClose={handleCloseAddTokenModal}
        title={editingToken ? "Edit Token" : "Add Token to Basket"}
        className={s.modal}
      >
        <div className={s.addTokenForm}>
          <Input
            label="Token Address"
            icon="hugeicons:link-01"
            type="text"
            value={form.currentTokenAddress}
            placeholder="0x..."
            onChange={handleInputChange("currentTokenAddress")}
          />

          <Input
            label="Weight (%)"
            icon="hugeicons:percent"
            type="number"
            value={form.currentTokenWeight}
            placeholder="e.g., 25"
            onChange={handleInputChange("currentTokenWeight")}
            min={0}
            max={100}
          />
        </div>
        <div className={s.modalActions}>
          <Button
            variant="secondary"
            onClick={handleCloseAddTokenModal}
            className={s.cancelButton}
          >
            Cancel
          </Button>
          <Button onClick={handleAddToken} disabled={isLoading}>
            {isLoading ? (editingToken ? "Updating..." : "Adding...") : (editingToken ? "Update Token" : "Add Token")}
          </Button>
        </div>
      </Modal>

      {/* Initial Share Price Modal */}
      <Modal
        open={showInitialPriceModal}
        onClose={() => setShowInitialPriceModal(false)}
        title="Initial Share Price"
        className={s.modal}
      >
        <Card className={s.infoCard}>
          <div className={s.infoContent}>
            <div className={s.infoSection}>
              <h4>What is it?</h4>
              <p>
                The initial share price defines the starting price at which your ETF shares will be displayed. This value helps establish a baseline for the basket&apos;s valuation at creation.
              </p>
            </div>
            <div className={s.infoSection}>
              <h4>Why is it important?</h4>
              <p>
                Setting an appropriate initial share price based on the values of your assets at the start helps provide a good reference point for understanding the basket&apos;s composition and value. It serves as the foundation for calculating share prices as the ETF evolves.
              </p>
            </div>
            <div className={s.infoSection}>
              <h4>How to choose:</h4>
              <ul>
                <li>Consider the total value of assets in your basket</li>
                <li>Set a price that reflects the initial asset composition</li>
                <li>Use a value that makes sense for your target market (e.g., 1.00 for a $1 basket)</li>
                <li>This price will be used as the starting point for share calculations</li>
              </ul>
            </div>
          </div>
        </Card>
      </Modal>
    </>
  )
}
