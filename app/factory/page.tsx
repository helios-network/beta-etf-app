"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useChainId, useAccount } from "wagmi"
import { useState, useEffect } from "react"
import { useETFContract } from "@/hooks/useETFContract"
import { fetchFactoryAddress, fetchBestSwapConfig } from "@/helpers/request"
import { Card } from "@/components/card"
import { Input } from "@/components/input"
import { Button } from "@/components/button"
import { DataState } from "@/components/data-state"
import { Heading } from "@/components/heading"
import { Message } from "@/components/message"
import s from "./page.module.scss"

export default function FactoryAdminPage() {
  const chainId = useChainId()
  const { address } = useAccount()
  const queryClient = useQueryClient()
  const {
    getOwner,
    getHLSAddress,
    setHLSAddress,
    getTreasury,
    setTreasury,
    getDepositFeeBps,
    setDepositFee,
    getFeeSwapConfig,
    setFeeSwapConfig
  } = useETFContract()

  // Fetch factory address
  const {
    data: factoryData,
    isLoading: isLoadingFactory,
    error: factoryError
  } = useQuery({
    queryKey: ["factoryAddress", chainId],
    queryFn: () => fetchFactoryAddress(chainId),
    enabled: !!chainId
  })

  const factoryAddress = factoryData?.address

  // Fetch current values
  const {
    data: owner,
  } = useQuery({
    queryKey: ["owner", factoryAddress],
    queryFn: () => getOwner(factoryAddress!),
    enabled: !!factoryAddress
  })

  const {
    data: hlsAddress,
    isLoading: isLoadingHLS,
    refetch: refetchHLS
  } = useQuery({
    queryKey: ["hlsAddress", factoryAddress],
    queryFn: () => getHLSAddress(factoryAddress!),
    enabled: !!factoryAddress
  })

  const {
    data: treasury,
    isLoading: isLoadingTreasury,
    refetch: refetchTreasury
  } = useQuery({
    queryKey: ["treasury", factoryAddress],
    queryFn: () => getTreasury(factoryAddress!),
    enabled: !!factoryAddress
  })

  const {
    data: depositFeeBps,
    isLoading: isLoadingFee,
    refetch: refetchFee
  } = useQuery({
    queryKey: ["depositFeeBps", factoryAddress],
    queryFn: () => getDepositFeeBps(factoryAddress!),
    enabled: !!factoryAddress
  })

  // Form states
  const [hlsAddressInput, setHlsAddressInput] = useState("")
  const [treasuryInput, setTreasuryInput] = useState("")
  const [feeBpsInput, setFeeBpsInput] = useState("")
  const [depositTokenInput, setDepositTokenInput] = useState("")
  const [feeSwapEnabled, setFeeSwapEnabled] = useState(false)
  const [feeSwapIsV2, setFeeSwapIsV2] = useState(true)
  const [feeSwapRouter, setFeeSwapRouter] = useState("")
  const [feeSwapQuoter, setFeeSwapQuoter] = useState("")
  const [feeSwapPathV2, setFeeSwapPathV2] = useState("")
  const [feeSwapPathV3, setFeeSwapPathV3] = useState("")
  const [feeSwapTokenOut, setFeeSwapTokenOut] = useState("")
  const [feeSwapSlippageBps, setFeeSwapSlippageBps] = useState("")
  const [targetTokenInput, setTargetTokenInput] = useState("")

  // Mutations
  const setHLSMutation = useMutation({
    mutationFn: (address: string) =>
      setHLSAddress({ factory: factoryAddress!, hlsAddress: address }),
    onSuccess: () => {
      refetchHLS()
      queryClient.invalidateQueries({ queryKey: ["hlsAddress"] })
    }
  })

  const setTreasuryMutation = useMutation({
    mutationFn: (address: string) =>
      setTreasury({ factory: factoryAddress!, treasury: address }),
    onSuccess: () => {
      refetchTreasury()
      queryClient.invalidateQueries({ queryKey: ["treasury"] })
    }
  })

  const setFeeMutation = useMutation({
    mutationFn: (feeBps: number) =>
      setDepositFee({ factory: factoryAddress!, feeBps }),
    onSuccess: () => {
      refetchFee()
      queryClient.invalidateQueries({ queryKey: ["depositFeeBps"] })
    }
  })

  const setFeeSwapMutation = useMutation({
    mutationFn: () =>
      setFeeSwapConfig({
        factory: factoryAddress!,
        depositToken: depositTokenInput,
        enabled: feeSwapEnabled,
        isV2: feeSwapIsV2,
        router: feeSwapRouter,
        quoter: feeSwapQuoter,
        pathV2: feeSwapPathV2
          .split(",")
          .map((addr) => addr.trim())
          .filter((addr) => addr.length > 0),
        pathV3: feeSwapPathV3,
        tokenOut: feeSwapTokenOut,
        slippageBps: feeSwapSlippageBps
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeSwapConfig"] })
      setDepositTokenInput("")
      setFeeSwapEnabled(false)
      setFeeSwapIsV2(true)
      setFeeSwapRouter("")
      setFeeSwapQuoter("")
      setFeeSwapPathV2("")
      setFeeSwapPathV3("")
      setFeeSwapTokenOut("")
      setFeeSwapSlippageBps("")
    }
  })

  // Load fee swap config when deposit token is entered
  const {
    data: feeSwapConfig,
    isLoading: isLoadingFeeSwapConfig,
    error: feeSwapConfigError,
  } = useQuery({
    queryKey: ["feeSwapConfig", factoryAddress, depositTokenInput],
    queryFn: () => getFeeSwapConfig(factoryAddress!, depositTokenInput),
    enabled: !!factoryAddress && !!depositTokenInput && depositTokenInput.length === 42,
    retry: false // Don't retry if config doesn't exist
  })

  // Update form when config is loaded or reset if no config/error
  useEffect(() => {
    const isValidAddress = depositTokenInput.length === 42
    
    if (!isValidAddress) {
      // Reset all fields if address is not valid
      setFeeSwapEnabled(false)
      setFeeSwapIsV2(true)
      setFeeSwapRouter("")
      setFeeSwapQuoter("")
      setFeeSwapPathV2("")
      setFeeSwapPathV3("")
      setFeeSwapTokenOut("")
      setFeeSwapSlippageBps("")
      return
    }

    if (isLoadingFeeSwapConfig) {
      // Keep current values while loading
      return
    }

    if (feeSwapConfigError || !feeSwapConfig) {
      // No config exists or error - reset to empty/default values
      setFeeSwapEnabled(false)
      setFeeSwapIsV2(true)
      setFeeSwapRouter("")
      setFeeSwapQuoter("")
      setFeeSwapPathV2("")
      setFeeSwapPathV3("")
      setFeeSwapTokenOut("")
      setFeeSwapSlippageBps("")
      return
    }

    // Config exists - fill all fields
    if (feeSwapConfig) {
      setFeeSwapEnabled(feeSwapConfig.enabled)
      setFeeSwapIsV2(feeSwapConfig.isV2)
      setFeeSwapRouter(feeSwapConfig.router || "")
      setFeeSwapQuoter(feeSwapConfig.quoter || "")
      setFeeSwapTokenOut(feeSwapConfig.tokenOut || "")
      setFeeSwapSlippageBps(feeSwapConfig.slippageBps || "")
      // Note: pathV2 and pathV3 are not available from mapping, so we leave them empty
      // User will need to enter them manually
    }
  }, [feeSwapConfig, feeSwapConfigError, isLoadingFeeSwapConfig, depositTokenInput])

  if (isLoadingFactory) {
    return <DataState type="loading" message="Loading factory address..." />
  }

  if (factoryError || !factoryAddress) {
    return (
      <DataState
        type="error"
        message={
          factoryError instanceof Error
            ? factoryError.message
            : "Failed to load factory address"
        }
      />
    )
  }

  if (!address) {
    return <DataState type="error" message="Please connect your wallet" />
  }

  return (
    <div className={s.page}>
      <Heading title="Factory Admin" />
      <p className={s.subtitle}>
        Manage factory contract parameters for chain {chainId}
      </p>
      <div className={s.info}>
        <p className={s.factoryAddress}>
          Factory Address: <code>{factoryAddress}</code>
        </p>
        {owner && (
          <p className={s.owner}>
            Owner: <code>{owner}</code>
            {address && address.toLowerCase() === owner.toLowerCase() && (
              <span className={s.ownerBadge}> (You)</span>
            )}
          </p>
        )}
      </div>

      <div className={s.grid}>
        {/* HLS Address */}
        <Card className={s.card}>
          <Heading title="HLS Address" />
          <div className={s.currentValue}>
            Current: <code>{hlsAddress || (isLoadingHLS ? "Loading..." : "N/A")}</code>
          </div>
          <Input
            label="New HLS Address"
            value={hlsAddressInput}
            onChange={(e) => setHlsAddressInput(e.target.value)}
            placeholder="0x..."
            className={s.input}
          />
          <Button
            onClick={() => {
              if (hlsAddressInput) {
                setHLSMutation.mutate(hlsAddressInput)
              }
            }}
            disabled={!hlsAddressInput || setHLSMutation.isPending}
            className={s.button}
          >
            {setHLSMutation.isPending ? "Updating..." : "Update HLS Address"}
          </Button>
          {setHLSMutation.isError && (
            <Message variant="danger" title="Error">
              {setHLSMutation.error instanceof Error
                ? setHLSMutation.error.message
                : "Failed to update HLS address"}
            </Message>
          )}
          {setHLSMutation.isSuccess && (
            <Message variant="success" title="Success">HLS address updated successfully</Message>
          )}
        </Card>

        {/* Treasury */}
        <Card className={s.card}>
          <Heading title="Treasury" />
          <div className={s.currentValue}>
            Current: <code>{treasury || (isLoadingTreasury ? "Loading..." : "N/A")}</code>
          </div>
          <Input
            label="New Treasury Address"
            value={treasuryInput}
            onChange={(e) => setTreasuryInput(e.target.value)}
            placeholder="0x..."
            className={s.input}
          />
          <Button
            onClick={() => {
              if (treasuryInput) {
                setTreasuryMutation.mutate(treasuryInput)
              }
            }}
            disabled={!treasuryInput || setTreasuryMutation.isPending}
            className={s.button}
          >
            {setTreasuryMutation.isPending ? "Updating..." : "Update Treasury"}
          </Button>
          {setTreasuryMutation.isError && (
            <Message variant="danger" title="Error">
              {setTreasuryMutation.error instanceof Error
                ? setTreasuryMutation.error.message
                : "Failed to update treasury"}
            </Message>
          )}
          {setTreasuryMutation.isSuccess && (
            <Message variant="success" title="Success">Treasury updated successfully</Message>
          )}
        </Card>

        {/* Deposit Fee */}
        <Card className={s.card}>
          <Heading title="Deposit Fee" />
          <div className={s.currentValue}>
            Current:{" "}
            <code>
              {depositFeeBps !== undefined
                ? `${depositFeeBps} bps (${(depositFeeBps / 100).toFixed(2)}%)`
                : isLoadingFee
                  ? "Loading..."
                  : "N/A"}
            </code>
          </div>
          <Input
            label="New Fee (basis points, max 10000 = 100%)"
            type="number"
            value={feeBpsInput}
            onChange={(e) => setFeeBpsInput(e.target.value)}
            placeholder="30"
            className={s.input}
          />
          <Button
            onClick={() => {
              const fee = parseInt(feeBpsInput)
              if (!isNaN(fee) && fee >= 0 && fee <= 10000) {
                setFeeMutation.mutate(fee)
              }
            }}
            disabled={
              !feeBpsInput ||
              isNaN(parseInt(feeBpsInput)) ||
              parseInt(feeBpsInput) < 0 ||
              parseInt(feeBpsInput) > 10000 ||
              setFeeMutation.isPending
            }
            className={s.button}
          >
            {setFeeMutation.isPending ? "Updating..." : "Update Deposit Fee"}
          </Button>
          {setFeeMutation.isError && (
            <Message variant="danger" title="Error">
              {setFeeMutation.error instanceof Error
                ? setFeeMutation.error.message
                : "Failed to update deposit fee"}
            </Message>
          )}
          {setFeeMutation.isSuccess && (
            <Message variant="success" title="Success">Deposit fee updated successfully</Message>
          )}
        </Card>

        {/* Fee Swap Config */}
        <Card className={s.card}>
          <Heading title="Fee Swap Config" />
          <Input
            label="Deposit Token Address"
            value={depositTokenInput}
            onChange={(e) => {
              setDepositTokenInput(e.target.value)
            }}
            placeholder="0x..."
            className={s.input}
          />
          <div className={s.swapHelper}>
            <Input
              label="Target Token Address (for best swap finder)"
              value={targetTokenInput}
              onChange={(e) => {
                setTargetTokenInput(e.target.value)
              }}
              placeholder="0x..."
              className={s.input}
            />
            <Button
              onClick={async () => {
                if (!depositTokenInput || !targetTokenInput || depositTokenInput.length !== 42 || targetTokenInput.length !== 42) {
                  return
                }
                try {
                  const result = await fetchBestSwapConfig(
                    chainId,
                    depositTokenInput,
                    targetTokenInput,
                    feeSwapSlippageBps ? parseInt(feeSwapSlippageBps) : 20
                  )
                  if (result.data) {
                    setFeeSwapEnabled(result.data.enabled)
                    setFeeSwapIsV2(result.data.isV2)
                    setFeeSwapRouter(result.data.router)
                    setFeeSwapQuoter(result.data.quoter)
                    setFeeSwapPathV2(result.data.pathV2.join(","))
                    setFeeSwapPathV3(result.data.pathV3)
                    setFeeSwapTokenOut(result.data.tokenOut)
                    setFeeSwapSlippageBps(result.data.slippageBps.toString())
                  }
                } catch (error) {
                  console.error("Error fetching best swap config:", error)
                }
              }}
              disabled={
                !depositTokenInput ||
                !targetTokenInput ||
                depositTokenInput.length !== 42 ||
                targetTokenInput.length !== 42
              }
              className={s.button}
            >
              Find Best Swap
            </Button>
          </div>
          {depositTokenInput.length === 42 && (
            <div className={s.currentValue}>
              {isLoadingFeeSwapConfig ? (
                <div>Loading config...</div>
              ) : feeSwapConfigError || !feeSwapConfig ? (
                <div>
                  <strong>No config found for this token.</strong>
                  <div className={s.note}>
                    All fields are empty. Fill them to create a new config.
                  </div>
                </div>
              ) : (
                <>
                  <strong>Config loaded for this token:</strong>
                  <div>Enabled: {feeSwapConfig.enabled ? "Yes" : "No"}</div>
                  <div>Type: {feeSwapConfig.isV2 ? "V2" : "V3"}</div>
                  <div>Router: <code>{feeSwapConfig.router}</code></div>
                  {!feeSwapConfig.isV2 && (
                    <div>Quoter: <code>{feeSwapConfig.quoter}</code></div>
                  )}
                  <div>Token Out: <code>{feeSwapConfig.tokenOut}</code></div>
                  <div>Slippage: {feeSwapConfig.slippageBps} bps</div>
                  <div className={s.note}>
                    Note: Path V2/V3 not available from mapping. Update will overwrite existing config.
                  </div>
                </>
              )}
            </div>
          )}
          <div className={s.checkboxGroup}>
            <label className={s.checkbox}>
              <input
                type="checkbox"
                checked={feeSwapEnabled}
                onChange={(e) => setFeeSwapEnabled(e.target.checked)}
              />
              <span>Enabled</span>
            </label>
            <label className={s.checkbox}>
              <input
                type="checkbox"
                checked={feeSwapIsV2}
                onChange={(e) => setFeeSwapIsV2(e.target.checked)}
              />
              <span>Is V2 (true = V2, false = V3)</span>
            </label>
          </div>
          <Input
            label="Router Address"
            value={feeSwapRouter}
            onChange={(e) => setFeeSwapRouter(e.target.value)}
            placeholder="0x..."
            className={s.input}
          />
          {!feeSwapIsV2 && (
            <Input
              label="Quoter Address (V3 only)"
              value={feeSwapQuoter}
              onChange={(e) => setFeeSwapQuoter(e.target.value)}
              placeholder="0x..."
              className={s.input}
            />
          )}
          {feeSwapIsV2 ? (
            <Input
              label="Path V2 (comma-separated addresses)"
              value={feeSwapPathV2}
              onChange={(e) => setFeeSwapPathV2(e.target.value)}
              placeholder="0x...,0x...,0x..."
              className={s.input}
            />
          ) : (
            <Input
              label="Path V3 (encoded bytes)"
              value={feeSwapPathV3}
              onChange={(e) => setFeeSwapPathV3(e.target.value)}
              placeholder="0x..."
              className={s.input}
            />
          )}
          <Input
            label="Token Out Address"
            value={feeSwapTokenOut}
            onChange={(e) => setFeeSwapTokenOut(e.target.value)}
            placeholder="0x..."
            className={s.input}
          />
          <Input
            label="Slippage BPS (max 1000 = 10%)"
            type="number"
            value={feeSwapSlippageBps}
            onChange={(e) => setFeeSwapSlippageBps(e.target.value)}
            placeholder="100"
            className={s.input}
          />
          <Button
            onClick={() => setFeeSwapMutation.mutate()}
            disabled={
              !depositTokenInput ||
              !feeSwapRouter ||
              !feeSwapTokenOut ||
              (feeSwapIsV2 && !feeSwapPathV2) ||
              (!feeSwapIsV2 && (!feeSwapPathV3 || !feeSwapQuoter)) ||
              setFeeSwapMutation.isPending
            }
            className={s.button}
          >
            {setFeeSwapMutation.isPending ? "Updating..." : "Update Fee Swap Config"}
          </Button>
          {setFeeSwapMutation.isError && (
            <Message variant="danger" title="Error">
              {setFeeSwapMutation.error instanceof Error
                ? setFeeSwapMutation.error.message
                : "Failed to update fee swap config"}
            </Message>
          )}
          {setFeeSwapMutation.isSuccess && (
            <Message variant="success" title="Success">
              Fee swap config updated successfully. Previous config (if any) has been overwritten.
            </Message>
          )}
        </Card>
      </div>
    </div>
  )
}

