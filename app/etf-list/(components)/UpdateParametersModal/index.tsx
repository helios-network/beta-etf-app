"use client"

import { Modal } from "@/components/modal"
import { ETF } from "@/types/etf"
import { Input } from "@/components/input"
import { Button } from "@/components/button"
import { useEffect, useState } from "react"
import { useWeb3Provider } from "@/hooks/useWeb3Provider"
import { useETFContract } from "@/hooks/useETFContract"
import { toast } from "sonner"
import { ABIs } from "@/constant"
import { format } from "date-fns"
import clsx from "clsx"

import s from "./index.module.scss"

const MaxCapacityMultiplier = BigInt(10) ** BigInt(18)

enum ETab {
  UpdateParameters = "Update Parameters",
  CreatePredictionMarket = "Create Prediction Market"
}

interface IProps {
  onClose: () => void
  selectedETF: ETF | null
  open: boolean
}

export const UpdateParametersModal = (props: IProps) => {
  const { onClose, selectedETF, open } = props
  const web3Provider = useWeb3Provider()
  const {
    updateParams,
    estimateUpdateParams,
    isLoading: isContractLoading
  } = useETFContract()
  const [tab, setTab] = useState<ETab>(ETab.UpdateParameters)

  const [imbalanceThresholdBps, setImbalanceThresholdBps] = useState("")
  const [maxPriceStaleness, setMaxPriceStaleness] = useState("")
  const [rebalanceCooldown, setRebalanceCooldown] = useState("")
  const [maxCapacityUSD, setMaxCapacityUSD] = useState("")
  const [currentImbalanceThresholdBps, setCurrentImbalanceThresholdBps] =
    useState<string | null>(null)
  const [currentMaxPriceStaleness, setCurrentMaxPriceStaleness] = useState<
    string | null
  >(null)
  const [currentRebalanceCooldown, setCurrentRebalanceCooldown] = useState<
    string | null
  >(null)
  const [currentMaxCapacityUSD, setCurrentMaxCapacityUSD] = useState<
    string | null
  >(null)
  const [isLoadingCurrentParams, setIsLoadingCurrentParams] = useState(false)
  const [updateParamsError, setUpdateParamsError] = useState<string | null>(
    null
  )

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

      const [integerPart = "0", fractionalPart = ""] = maxCapacityUSD.split(".")
      const paddedFractional = fractionalPart.padEnd(18, "0").slice(0, 18)
      const maxCapacityUSDWei = (
        BigInt(integerPart) * MaxCapacityMultiplier +
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
      const [integerPart = "0", fractionalPart = ""] = maxCapacityUSD.split(".")
      const paddedFractional = fractionalPart.padEnd(18, "0").slice(0, 18)
      const maxCapacityUSDWei = (
        BigInt(integerPart) * MaxCapacityMultiplier +
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

      setImbalanceThresholdBps("")
      setMaxPriceStaleness("")
      setRebalanceCooldown("")
      setMaxCapacityUSD("")
      onClose()
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

  const handleCreatePredictionMarket = async () => { }

  useEffect(() => {
    const loadInfo = async () => {
      if (selectedETF) {
        setImbalanceThresholdBps("")
        setMaxPriceStaleness("")
        setRebalanceCooldown("")
        setMaxCapacityUSD("")
        setCurrentImbalanceThresholdBps(null)
        setCurrentMaxPriceStaleness(null)
        setCurrentRebalanceCooldown(null)
        setCurrentMaxCapacityUSD(null)
        setUpdateParamsError(null)

        // Fetch current params
        await fetchCurrentParams(selectedETF)
      } else {
        onClose()
        setTab(ETab.UpdateParameters)
      }
    }

    loadInfo()
  }, [selectedETF])

  const fetchCurrentParams = async (etf: ETF) => {
    if (!web3Provider) return

    setIsLoadingCurrentParams(true)
    setUpdateParamsError(null)

    try {
      // Fetch imbalanceThresholdBps from vault
      const vaultContract = new web3Provider.eth.Contract(
        ABIs.vaultViewAbi as any,
        etf.vault
      )
      const imbalanceThresholdBpsValue = await vaultContract.methods
        .imbalanceThresholdBps()
        .call()

      // Fetch vaultConfig from vault (contains rebalanceCooldown and maxCapacityUSD)
      const vaultConfig: any = await vaultContract.methods.vaultConfig().call()

      // Fetch maxPriceStaleness from pricer
      const pricerContract = new web3Provider.eth.Contract(
        ABIs.pricerViewAbi as any,
        etf.pricer
      )
      const maxPriceStalenessValue = await pricerContract.methods
        .maxPriceStaleness()
        .call()

      setCurrentImbalanceThresholdBps(String(imbalanceThresholdBpsValue))
      setCurrentMaxPriceStaleness(String(maxPriceStalenessValue))

      setImbalanceThresholdBps(String(imbalanceThresholdBpsValue))
      setMaxPriceStaleness(String(maxPriceStalenessValue))

      // Extract vaultConfig values (Web3.js returns structs as objects with property names)
      // The struct has: lastRebalanceTimestamp, rebalanceCooldown, maxCapacityUSD
      const config =
        vaultConfig.rebalanceCooldown !== undefined
          ? vaultConfig
          : {
            rebalanceCooldown: vaultConfig[1] || "0",
            maxCapacityUSD: vaultConfig[2] || "0"
          }

      setCurrentRebalanceCooldown(String(config.rebalanceCooldown || "0"))
      setCurrentMaxCapacityUSD(String(config.maxCapacityUSD || "0"))

      setRebalanceCooldown(String(config.rebalanceCooldown || "0"))
      setMaxCapacityUSD(
        (Number(String(config.maxCapacityUSD || "0")) / 1e18).toFixed(2)
      )
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch current parameters"
      setUpdateParamsError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoadingCurrentParams(false)
    }
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

  const renderUpdateParameters = () => {
    return (
      <>
        <p className={s.modalDescription}>
          Update vault parameters for this ETF. Only the owner can modify these
          settings.
        </p>

        {isLoadingCurrentParams ? (
          <div style={{ padding: "1rem", textAlign: "center" }}>
            Loading current parameters...
          </div>
        ) : (
          <>
            {currentImbalanceThresholdBps !== null &&
              currentMaxPriceStaleness !== null && (
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    background: "var(--background-low)",
                    borderRadius: "var(--radius-s)",
                    border: "1px solid var(--border-light)",
                    marginBottom: "1rem"
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--text-secondary)",
                      marginBottom: "0.5rem"
                    }}
                  >
                    Current Values:
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem"
                    }}
                  >
                    <div style={{ fontSize: "0.85rem" }}>
                      <strong>Imbalance Threshold:</strong>{" "}
                      {currentImbalanceThresholdBps} BPS
                    </div>
                    <div
                      style={{ fontSize: "0.85rem" }}
                      title={`${(
                        parseInt(currentMaxPriceStaleness || "0") / 60
                      ).toFixed(2)} minutes, ${(
                        parseInt(currentMaxPriceStaleness || "0") / 3600
                      ).toFixed(2)} hours, ${(
                        parseInt(currentMaxPriceStaleness || "0") /
                        3600 /
                        24
                      ).toFixed(2)} days`}
                    >
                      <strong>Max Price Staleness:</strong>{" "}
                      {currentMaxPriceStaleness} seconds
                    </div>
                    {currentRebalanceCooldown !== null && (
                      <div
                        style={{ fontSize: "0.85rem" }}
                        title={`${(
                          parseInt(currentRebalanceCooldown || "0") / 60
                        ).toFixed(2)} minutes, ${(
                          parseInt(currentRebalanceCooldown || "0") / 3600
                        ).toFixed(2)} hours, ${(
                          parseInt(currentRebalanceCooldown || "0") /
                          3600 /
                          24
                        ).toFixed(2)} days`}
                      >
                        <strong>Rebalance Cooldown:</strong>{" "}
                        {currentRebalanceCooldown} seconds
                      </div>
                    )}
                    {currentMaxCapacityUSD !== null && (
                      <div style={{ fontSize: "0.85rem" }}>
                        <strong>Max Capacity USD:</strong> $
                        {(Number(currentMaxCapacityUSD) / 1e18).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )}

            {updateParamsError && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: "var(--danger-lowest)",
                  border: "1px solid var(--danger-low)",
                  borderRadius: "var(--radius-s)",
                  color: "var(--danger-high)",
                  marginBottom: "1rem",
                  fontSize: "0.9rem"
                }}
              >
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
                  onClose()
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
                disabled={
                  isContractLoading ||
                  !imbalanceThresholdBps ||
                  !maxPriceStaleness ||
                  !rebalanceCooldown ||
                  !maxCapacityUSD
                }
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
      </>
    )
  }

  const renderCreatePredictionMarket = () => {
    const now = new Date()
    const month = format(now, "MM")
    const day = format(now, "dd")
    return (
      <>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem"
          }}
        >
          <div style={{ fontSize: "0.85rem" }}>
            <strong>Current:</strong>&nbsp;
            {month} / {day}
          </div>
        </div>
        <div className={s.modalActions}>
          <Button
            variant="secondary"
            onClick={() => {
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreatePredictionMarket}
            iconLeft={
              isContractLoading
                ? "hugeicons:loading-01"
                : "hugeicons:checkmark-circle-02"
            }
          >
            Create
          </Button>
        </div>
      </>
    )
  }

  const renderTabs = () => {
    return (
      <div className={s.tabContainer}>
        {[ETab.UpdateParameters, ETab.CreatePredictionMarket].map((ele) => {
          const isActive = ele === tab
          return (
            <div
              key={ele}
              className={clsx(s.tabButton, isActive ? s.tabButtonActive : "")}
              onClick={() => setTab(ele)}
            >
              {ele}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Modal
      open={open && !!selectedETF}
      onClose={onClose}
      title={`Update Parameters - ${selectedETF?.symbol || ""}`}
    >
      <div className={s.modalContent}>
        {renderTabs()}
        {tab === ETab.UpdateParameters
          ? renderUpdateParameters()
          : renderCreatePredictionMarket()}
      </div>
    </Modal>
  )
}
