import { useMutation } from "@tanstack/react-query"
import { useAccount, useChainId } from "wagmi"
import { useWeb3Provider } from "./useWeb3Provider"
import { erc20Abi, etfFactoryAbi as factoryAbi } from "@/constant/abis"
import { getBestGasPrice } from "@/lib/utils/gas"
import { decodeEventLog, TransactionReceipt, Abi } from "viem"
import { getErrorMessage } from "@/utils/string"
import { EventLog, ResponseError } from "web3"

interface CreateETFParams {
  factoryAddress: string
  depositToken: string
  depositFeed: string
  router: string
  quoter: string
  assetTokens: string[]
  priceFeeds: string[]
  targetWeightsBps: number[]
  swapPathsData: string[]
  name: string
  symbol: string
  pricingMode: number
  initialSharePrice: string
}

interface CreateETFResult {
  vault: string
  shareToken: string
  pricer: string
  txHash: string
  blockNumber: number
}

interface DepositParams {
  factory: string
  vault: string
  depositToken: string
  amount: string
  minSharesOut: string
  slippageBps: string
}

interface DepositResult {
  depositAmount: string
  sharesOut: string
  amountsOut: string[]
  valuesPerAsset: string[]
  eventNonce: string
  eventHeight: string
  txHash: string
  blockNumber: number
}

interface RedeemParams {
  factory: string
  vault: string
  shareToken: string
  shares: string
  minOut: string
  slippageBps: string
}

interface RedeemResult {
  sharesIn: string
  depositOut: string
  soldAmounts: string[]
  eventNonce: string
  eventHeight: string
  txHash: string
  blockNumber: number
}

interface RebalanceParams {
  factory: string
  vault: string
  slippageBps: string
}

interface RebalanceResult {
  user: string
  totalSoldValueUSD: string
  totalBoughtValueUSD: string
  soldAmounts: string[]
  boughtAmounts: string[]
  soldValuesUSD: string[]
  boughtValuesUSD: string[]
  eventNonce: string
  eventHeight: string
  txHash: string
  blockNumber: number
}

interface ApproveTokenParams {
  tokenAddress: string
  spenderAddress: string
  amount: string
}

interface UpdateParamsParams {
  factory: string
  vault: string
  imbalanceThresholdBps: string
  maxPriceStaleness: string
  rebalanceCooldown: string
  maxCapacityUSD: string
}

interface UpdateParamsResult {
  txHash: string
  blockNumber: number
}

interface FeeSwapConfig {
  enabled: boolean
  isV2: boolean
  router: string
  quoter: string
  pathV2: string[]
  pathV3: string
  tokenOut: string
  slippageBps: string
}

interface SetFeeSwapConfigParams {
  factory: string
  depositToken: string
  enabled: boolean
  isV2: boolean
  router: string
  quoter: string
  pathV2: string[]
  pathV3: string
  tokenOut: string
  slippageBps: string
}

interface SetFeeSwapConfigResult {
  txHash: string
  blockNumber: number
}

/**
 * Convert a percentage value to basis points (BPS)
 * @param percentage - Percentage value (e.g., 0.25 for 0.25%, 5 for 5%)
 * @returns Basis points as string (e.g., "25" for 0.25%, "500" for 5%)
 */
export function percentageToBps(percentage: number): string {
  return Math.round(percentage * 100).toString()
}

export const useETFContract = () => {
  const { address } = useAccount()
  const chainId = useChainId()
  const web3Provider = useWeb3Provider()

  const createETF = useMutation({
    mutationFn: async (params: CreateETFParams): Promise<CreateETFResult> => {
      if (!web3Provider || !address) {
        throw new Error("No wallet connected")
      }

      if (!chainId) {
        throw new Error("No chain id found")
      }

      try {
        const factoryContract = new web3Provider.eth.Contract(
          factoryAbi as any,
          params.factoryAddress
        )

        // Prepare the config array: [depositToken, depositFeed, router]
        const config = [
          params.depositToken,
          params.depositFeed,
          params.router,
          params.quoter
        ]

        // Prepare ETF params array: [name, symbol, pricingMode as string]
        const etfParams = [
          params.name,
          params.symbol,
          params.pricingMode.toString()
        ]

        console.log("config", config)
        console.log("assetTokens", params.assetTokens)
        console.log("priceFeeds", params.priceFeeds)
        console.log("targetWeightsBps", params.targetWeightsBps)
        console.log("swapPathsData", params.swapPathsData)
        console.log("etfParams", etfParams)
        console.log("initialSharePrice", params.initialSharePrice)

        // Simulate the transaction
        const resultOfSimulation = await factoryContract.methods
          .createETF(
            config,
            params.assetTokens,
            params.priceFeeds,
            params.targetWeightsBps,
            params.swapPathsData,
            etfParams,
            params.initialSharePrice
          )
          .call({
            from: address
          })

        if (!resultOfSimulation) {
          throw new Error("Error during simulation, please try again later")
        }

        // Estimate gas
        const gasEstimate = await factoryContract.methods
          .createETF(
            config,
            params.assetTokens,
            params.priceFeeds,
            params.targetWeightsBps,
            params.swapPathsData,
            etfParams,
            params.initialSharePrice
          )
          .estimateGas({
            from: address
          })

        // Add 20% to the gas estimation to be safe
        const gasLimit = (BigInt(gasEstimate.toString()) * 120n) / 100n

        // Get best gas price
        const bestGasPrice = await getBestGasPrice(web3Provider)

        // Send the transaction
        const receipt = await new Promise<TransactionReceipt>((resolve, reject) => {
          web3Provider.eth
            .sendTransaction({
              from: address,
              to: params.factoryAddress,
              data: factoryContract.methods
                .createETF(
                  config,
                  params.assetTokens,
                  params.priceFeeds,
                  params.targetWeightsBps,
                  params.swapPathsData,
                  etfParams,
                  params.initialSharePrice
                )
                .encodeABI(),
              gas: gasLimit.toString(),
              gasPrice: bestGasPrice.toString()
            })
            .then((tx) => {
              resolve(tx as any)
            })
            .catch((error) => {
              reject(error)
            })
        })

        let etfCreatedEvent: any | null = null

        for (const log of receipt.logs) {
          try {
            const evt = decodeEventLog({
              abi: factoryAbi,
              data: log.data,
              topics: log.topics
            })

            if (evt.eventName === "ETFCreated") {
              etfCreatedEvent = evt
              break
            }
          } catch {}
        }

        if (!etfCreatedEvent) {
          throw new Error(
            "Could not find ETFCreated event in transaction receipt"
          )
        }

        const { vault, shareToken, pricer } = etfCreatedEvent.args

        return {
          vault: vault,
          shareToken: shareToken,
          pricer: pricer,
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber)
        }
      } catch (error: unknown) {
        if (error instanceof ResponseError) {
          throw new Error(error.data.message)
        }
        throw new Error((error as Error).message || "Error during createETF")
      }
    }
  })

  const approveToken = useMutation({
    mutationFn: async (params: ApproveTokenParams): Promise<void> => {
      if (!web3Provider || !address) {
        throw new Error("No wallet connected")
      }

      try {
        const tokenContract = new web3Provider.eth.Contract(
          erc20Abi as any,
          params.tokenAddress
        )

        // Check current allowance
        const currentAllowanceStr: string = await tokenContract.methods
          .allowance(address, params.spenderAddress)
          .call()
        const currentAllowance = BigInt(currentAllowanceStr)
        const requiredAmount = BigInt(params.amount)

        // If allowance is sufficient, no need to approve
        if (currentAllowance >= requiredAmount) {
          return
        }

        // Get best gas price
        const bestGasPrice = await getBestGasPrice(web3Provider)

        // Approve the spender to spend the required amount
        await tokenContract.methods
          .approve(params.spenderAddress, params.amount)
          .send({
            from: address,
            gas: "150000", // Standard approve gas limit
            gasPrice: bestGasPrice.toString()
          })
      } catch (error: unknown) {
        if (error instanceof ResponseError) {
          throw new Error(error.data.message)
        }
        throw new Error(
          (error as Error).message || "Error during token approval"
        )
      }
    }
  })

  const deposit = useMutation({
    mutationFn: async (params: DepositParams): Promise<DepositResult> => {
      if (!web3Provider || !address) {
        throw new Error("No wallet connected")
      }

      if (!chainId) {
        throw new Error("No chain id found")
      }

      try {
        const factoryAddress = params.factory
        const factoryContract = new web3Provider.eth.Contract(
          factoryAbi as any,
          factoryAddress
        )

        console.log("factoryAddress", factoryAddress)

        // Simulate the transaction and get the return value
        const depositResult: any = await factoryContract.methods
          .deposit(params.vault, params.amount, params.minSharesOut, params.slippageBps, false)
          .call({ from: address })

        // Estimate gas
        const gasEstimate = await factoryContract.methods
          .deposit(params.vault, params.amount, params.minSharesOut, params.slippageBps, false)
          .estimateGas({ from: address })

        // Add 20% to the gas estimation
        const gasLimit = (BigInt(gasEstimate.toString()) * 120n) / 100n

        // Get best gas price
        const bestGasPrice = await getBestGasPrice(web3Provider)

        // Send the transaction
        const receipt = await new Promise<TransactionReceipt>((resolve, reject) => {
          web3Provider.eth
            .sendTransaction({
              from: address,
              to: factoryAddress,
              data: factoryContract.methods
                .deposit(params.vault, params.amount, params.minSharesOut, params.slippageBps, false)
                .encodeABI(),
              gas: gasLimit.toString(),
              gasPrice: bestGasPrice.toString()
            })
            .then((tx) => {
              resolve(tx as any)
            })
            .catch((error) => {
              reject(error)
            })
        })
        
        // Parse the Deposit event for additional info (eventNonce, eventHeight)
        let depositEvent: any | null = null

        for (const log of receipt.logs) {
          try {
            const evt = decodeEventLog({
              abi: factoryAbi,
              data: log.data,
              topics: log.topics
            })

            if (evt.eventName === "Deposit") {
              depositEvent = evt
              break
            }
          } catch {}
        }

        if (!depositEvent) {
          throw new Error("Could not find Deposit event in transaction receipt")
        }

        const {
          depositAmount,
          sharesOut,
          amountsOut: eventAmountsOut,
          valuesPerAsset: eventValuesPerAsset,
          eventNonce,
          eventHeight
        } = depositEvent.args

        // Use event data if available, fallback to function return values
        return {
          depositAmount,
          sharesOut: String(sharesOut || depositResult.sharesOutRet),
          amountsOut: (eventAmountsOut || depositResult.amountsOut || []).map(
            (amt: any) => String(amt)
          ),
          valuesPerAsset: (
            eventValuesPerAsset ||
            depositResult.valuesPerAsset ||
            []
          ).map((val: any) => String(val)),
          eventNonce,
          eventHeight,
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber)
        }
      } catch (error: unknown) {
        if (error instanceof ResponseError) {
          throw new Error(error.data.message)
        }
        throw new Error((error as Error).message || "Error during deposit")
      }
    }
  })

  const redeem = useMutation({
    mutationFn: async (params: RedeemParams): Promise<RedeemResult> => {
      if (!web3Provider || !address) {
        throw new Error("No wallet connected")
      }

      if (!chainId) {
        throw new Error("No chain id found")
      }

      try {
        const factoryAddress = params.factory

        const factoryContract = new web3Provider.eth.Contract(
          factoryAbi as any,
          factoryAddress
        )

        // Simulate the transaction and get the return value
        const redeemResult: any = await factoryContract.methods
          .redeem(params.vault, params.shares, params.minOut, params.slippageBps, false)
          .call({ from: address })

        // Estimate gas
        const gasEstimate = await factoryContract.methods
          .redeem(params.vault, params.shares, params.minOut, params.slippageBps, false)
          .estimateGas({ from: address })

        // Add 20% to the gas estimation
        const gasLimit = (BigInt(gasEstimate.toString()) * 120n) / 100n

        // Get best gas price
        const bestGasPrice = await getBestGasPrice(web3Provider)

        // Send the transaction
        const receipt = await new Promise<TransactionReceipt>((resolve, reject) => {
          web3Provider.eth
            .sendTransaction({
              from: address,
              to: factoryAddress,
              data: factoryContract.methods
                .redeem(params.vault, params.shares, params.minOut, params.slippageBps, false)
                .encodeABI(),
              gas: gasLimit.toString(),
              gasPrice: bestGasPrice.toString()
            })
            .then((tx) => {
              resolve(tx as any)
            })
            .catch((error) => {
              reject(error)
            })
        })
        
        // Parse the Redeem event for additional info (eventNonce, eventHeight)
        let redeemEvent: any | null = null

        for (const log of receipt.logs) {
          try {
            const evt = decodeEventLog({
              abi: factoryAbi,
              data: log.data,
              topics: log.topics
            })

            if (evt.eventName === "Redeem") {
              redeemEvent = evt
              break
            }
          } catch {}
        }

        if (!redeemEvent) {
          throw new Error("Could not find Redeem event in transaction receipt")
        }

        const {
          sharesIn,
          depositOut,
          soldAmounts: eventSoldAmounts,
          eventNonce,
          eventHeight
        } = redeemEvent.args

        // Use the return values from the function call
        // redeemResult contains: { depositOutRet, soldAmounts }
        const { depositOutRet, soldAmounts } = redeemResult

        // Use event data if available, fallback to function return values
        return {
          sharesIn,
          depositOut: String(depositOut || depositOutRet),
          soldAmounts: (eventSoldAmounts || soldAmounts || []).map((amt: any) =>
            String(amt)
          ),
          eventNonce,
          eventHeight,
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber)
        }
      } catch (error: unknown) {
        if (error instanceof ResponseError) {
          throw new Error(error.data.message)
        }
        throw new Error((error as Error).message || "Error during redeem")
      }
    }
  })

  const rebalance = useMutation({
    mutationFn: async (params: RebalanceParams): Promise<RebalanceResult> => {
      if (!web3Provider || !address) {
        throw new Error("No wallet connected")
      }

      if (!chainId) {
        throw new Error("No chain id found")
      }

      try {
        const factoryAddress = params.factory

        const factoryContract = new web3Provider.eth.Contract(
          factoryAbi as any,
          factoryAddress
        )

        // Simulate the transaction to get preview data
        const previewResult: any = await factoryContract.methods
          .rebalance(params.vault, params.slippageBps)
          .call({ from: address })

        // Estimate gas
        const gasEstimate = await factoryContract.methods
          .rebalance(params.vault, params.slippageBps)
          .estimateGas({ from: address })

        // Add 20% to the gas estimation
        const gasLimit = (BigInt(gasEstimate.toString()) * 120n) / 100n

        // Get best gas price
        const bestGasPrice = await getBestGasPrice(web3Provider)

        // Send the transaction
        const receipt = await new Promise<TransactionReceipt>((resolve, reject) => {
          web3Provider.eth
            .sendTransaction({
              from: address,
              to: factoryAddress,
              data: factoryContract.methods.rebalance(params.vault, params.slippageBps).encodeABI(),
              gas: gasLimit.toString(),
              gasPrice: bestGasPrice.toString()
            })
            .then((tx) => {
              resolve(tx as any)
            })
            .catch((error) => {
              reject(error)
            })
        })

        let rebalanceEvent: any | null = null

        for (const log of receipt.logs) {
          try {
            const evt = decodeEventLog({
              abi: factoryAbi,
              data: log.data,
              topics: log.topics
            })

            if (evt.eventName === "Rebalance") {
              rebalanceEvent = evt
              break
            }
          } catch {}
        }

        if (!rebalanceEvent) {
          throw new Error(
            "Could not find Rebalance event in transaction receipt"
          )
        }

        const { 
          user, 
          totalSoldValueUSD, 
          totalBoughtValueUSD, 
          soldAmounts, 
          boughtAmounts, 
          soldValuesUSD, 
          boughtValuesUSD, 
          eventNonce, 
          eventHeight 
        } = rebalanceEvent.args

        return {
          user,
          totalSoldValueUSD: String(totalSoldValueUSD),
          totalBoughtValueUSD: String(totalBoughtValueUSD),
          soldAmounts: (soldAmounts || []).map((amt: any) => String(amt)),
          boughtAmounts: (boughtAmounts || []).map((amt: any) => String(amt)),
          soldValuesUSD: (soldValuesUSD || []).map((val: any) => String(val)),
          boughtValuesUSD: (boughtValuesUSD || []).map((val: any) => String(val)),
          eventNonce,
          eventHeight,
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber)
        }
      } catch (error: unknown) {
        if (error instanceof ResponseError) {
          throw new Error(error.data.message)
        }
        throw new Error((error as Error).message || "Error during rebalance")
      }
    }
  })

  const estimateDepositShares = async (params: {
    factory: string
    vault: string
    amount: string
    allowance: bigint
    slippageBps: string
  }): Promise<{
    sharesOut: string
    amountsOut: string[]
    valuesPerAsset: string[]
  }> => {
    if (!web3Provider || !address) {
      throw new Error("No wallet connected")
    }

    try {
      const factoryContract = new web3Provider.eth.Contract(
        factoryAbi as any,
        params.factory
      )

      const needEstimateBool = params.allowance < BigInt(params.amount)
      // permit to calculate impermanent loss impact

      // Call deposit with minSharesOut = 0 and simulate = true to get the estimated shares
      // The function now returns { sharesOutRet, amountsOut, valuesPerAsset }
      const depositResult: any = await factoryContract.methods
        .deposit(params.vault, params.amount, "0", params.slippageBps, needEstimateBool)
        .call({ from: address })

      console.log("depositResult", depositResult)

      return {
        sharesOut: String(depositResult.sharesOutRet),
        amountsOut: (depositResult.amountsOut || []).map((amt: any) =>
          String(amt)
        ),
        valuesPerAsset: (depositResult.valuesPerAsset || []).map((val: any) =>
          String(val)
        )
      }
    } catch (error: unknown) {
      if (error instanceof ResponseError) {
        throw new Error(error.data.message)
      }
      throw new Error(
        (error as Error).message || "Error estimating deposit shares"
      )
    }
  }

  const estimateRedeemDeposit = async (params: {
    factory: string
    vault: string
    shares: string
    allowance: bigint
    slippageBps: string
  }): Promise<{
    depositOut: string
    soldAmounts: string[]
  }> => {
    if (!web3Provider || !address) {
      throw new Error("No wallet connected")
    }

    try {
      const factoryContract = new web3Provider.eth.Contract(
        factoryAbi as any,
        params.factory
      )

      const needEstimateBool = params.allowance < BigInt(params.shares)
      // permit to calculate impermanent loss impact

      // Call redeem with minOut = 0 and simulate = true to get the estimated deposit tokens
      // The function now returns { depositOutRet, soldAmounts }
      const redeemResult: any = await factoryContract.methods
        .redeem(params.vault, params.shares, "0", params.slippageBps, needEstimateBool)
        .call({ from: address })

      return {
        depositOut: String(redeemResult.depositOutRet),
        soldAmounts: (redeemResult.soldAmounts || []).map((amt: any) =>
          String(amt)
        )
      }
    } catch (error: unknown) {
      if (error instanceof ResponseError) {
        throw new Error(error.data.message)
      }
      throw new Error(
        (error as Error).message || "Error estimating redeem deposit"
      )
    }
  }

  const estimateRebalance = async (params: RebalanceParams): Promise<{
    totalSoldValueUSD: string
    totalBoughtValueUSD: string
    soldAmounts: string[]
    boughtAmounts: string[]
    soldValuesUSD: string[]
    boughtValuesUSD: string[]
  }> => {
    if (!web3Provider || !address) {
      throw new Error("No wallet connected")
    }

    try {
      const factoryContract = new web3Provider.eth.Contract(
        factoryAbi as any,
        params.factory
      )

      // Simulate the transaction to get the estimated values
      const result: any = await factoryContract.methods
        .rebalance(params.vault, params.slippageBps)
        .call({ from: address })

      // Extract the RebalanceResult struct from the return value
      // Web3.js returns structs as objects with property names
      const rebalanceResult = result.result || result

      return {
        totalSoldValueUSD: String(rebalanceResult.totalSoldValueUSD || "0"),
        totalBoughtValueUSD: String(rebalanceResult.totalBoughtValueUSD || "0"),
        soldAmounts: (rebalanceResult.soldAmounts || []).map((amt: any) => String(amt)),
        boughtAmounts: (rebalanceResult.boughtAmounts || []).map((amt: any) => String(amt)),
        soldValuesUSD: (rebalanceResult.soldValuesUSD || []).map((val: any) => String(val)),
        boughtValuesUSD: (rebalanceResult.boughtValuesUSD || []).map((val: any) => String(val))
      }
    } catch (error: unknown) {
      console.error("Error estimating rebalance", error)
      if (error instanceof ResponseError) {
        console.error("Error estimating rebalance", error.data)
        throw new Error(error.data.message)
      }
      console.error("Error estimating rebalance 2", (error as Error).message)
      throw new Error((error as Error).message || "Error estimating rebalance")
    }
  }

  const estimateUpdateParams = async (params: UpdateParamsParams): Promise<void> => {
    if (!web3Provider || !address) {
      throw new Error("No wallet connected")
    }

    try {
      const factoryContract = new web3Provider.eth.Contract(
        factoryAbi as any,
        params.factory
      )

      // Simulate the transaction to validate it will succeed
      await factoryContract.methods
        .updateParams(
          params.vault,
          params.imbalanceThresholdBps,
          params.maxPriceStaleness,
          params.rebalanceCooldown,
          params.maxCapacityUSD
        )
        .call({ from: address })
    } catch (error: unknown) {
      if (error instanceof ResponseError) {
        throw new Error(error.data.message)
      }
      throw new Error(
        (error as Error).message || "Error estimating update params"
      )
    }
  }

  const updateParams = useMutation({
    mutationFn: async (
      params: UpdateParamsParams
    ): Promise<UpdateParamsResult> => {
      if (!web3Provider || !address) {
        throw new Error("No wallet connected")
      }

      if (!chainId) {
        throw new Error("No chain id found")
      }

      try {
        const factoryAddress = params.factory

        const factoryContract = new web3Provider.eth.Contract(
          factoryAbi as any,
          factoryAddress
        )

        // Simulate the transaction
        await factoryContract.methods
          .updateParams(
            params.vault,
            params.imbalanceThresholdBps,
            params.maxPriceStaleness,
            params.rebalanceCooldown,
            params.maxCapacityUSD
          )
          .call({ from: address })

        // Estimate gas
        const gasEstimate = await factoryContract.methods
          .updateParams(
            params.vault,
            params.imbalanceThresholdBps,
            params.maxPriceStaleness,
            params.rebalanceCooldown,
            params.maxCapacityUSD
          )
          .estimateGas({ from: address })

        // Add 20% to the gas estimation
        const gasLimit = (BigInt(gasEstimate.toString()) * 120n) / 100n

        // Get best gas price
        const bestGasPrice = await getBestGasPrice(web3Provider)

        // Send the transaction
        const receipt = await new Promise<TransactionReceipt>((resolve, reject) => {
          web3Provider.eth
            .sendTransaction({
              from: address,
              to: factoryAddress,
              data: factoryContract.methods
                .updateParams(
                  params.vault,
                  params.imbalanceThresholdBps,
                  params.maxPriceStaleness,
                  params.rebalanceCooldown,
                  params.maxCapacityUSD
                )
                .encodeABI(),
              gas: gasLimit.toString(),
              gasPrice: bestGasPrice.toString()
            })
            .then((tx) => {
              resolve(tx as any)
            })
            .catch((error) => {
              reject(error)
            })
        })

        // Parse the ParamsUpdated event
        let paramsUpdatedEvent: any | null = null

        for (const log of receipt.logs) {
          try {
            const evt = decodeEventLog({
              abi: factoryAbi,
              data: log.data,
              topics: log.topics
            })

            if (evt.eventName === "ParamsUpdated") {
              paramsUpdatedEvent = evt
              break
            }
          } catch {}
        }

        if (!paramsUpdatedEvent) {
          throw new Error(
            "Could not find ParamsUpdated event in transaction receipt"
          )
        }

        return {
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber)
        }
      } catch (error: unknown) {
        if (error instanceof ResponseError) {
          throw new Error(error.data.message)
        }
        throw new Error((error as Error).message || "Error during updateParams")
      }
    }
  })

  // Admin functions
  const getOwner = async (factoryAddress: string): Promise<string> => {
    if (!web3Provider) {
      throw new Error("No wallet connected")
    }

    try {
      const factoryContract = new web3Provider.eth.Contract(
        factoryAbi as any,
        factoryAddress
      )

      const owner = await factoryContract.methods.owner().call()
      return String(owner)
    } catch (error: unknown) {
      if (error instanceof ResponseError) {
        throw new Error(error.data.message)
      }
      throw new Error((error as Error).message || "Error getting owner")
    }
  }

  const getHLSAddress = async (factoryAddress: string): Promise<string> => {
    if (!web3Provider) {
      throw new Error("No wallet connected")
    }

    try {
      const factoryContract = new web3Provider.eth.Contract(
        factoryAbi as any,
        factoryAddress
      )

      const address = await factoryContract.methods.hlsAddress().call()
      return String(address)
    } catch (error: unknown) {
      if (error instanceof ResponseError) {
        throw new Error(error.data.message)
      }
      throw new Error((error as Error).message || "Error getting HLS address")
    }
  }

  const setHLSAddress = useMutation({
    mutationFn: async (params: {
      factory: string
      hlsAddress: string
    }): Promise<UpdateParamsResult> => {
      if (!web3Provider || !address) {
        throw new Error("No wallet connected")
      }

      if (!chainId) {
        throw new Error("No chain id found")
      }

      try {
        const factoryContract = new web3Provider.eth.Contract(
          factoryAbi as any,
          params.factory
        )

        // Simulate the transaction
        await factoryContract.methods
          .setHLSAddress(params.hlsAddress)
          .call({ from: address })

        // Estimate gas
        const gasEstimate = await factoryContract.methods
          .setHLSAddress(params.hlsAddress)
          .estimateGas({ from: address })

        // Add 20% to the gas estimation
        const gasLimit = (BigInt(gasEstimate.toString()) * 120n) / 100n

        // Get best gas price
        const bestGasPrice = await getBestGasPrice(web3Provider)

        // Send the transaction
        const receipt = await new Promise<TransactionReceipt>((resolve, reject) => {
          web3Provider.eth
            .sendTransaction({
              from: address,
              to: params.factory,
              data: factoryContract.methods.setHLSAddress(params.hlsAddress).encodeABI(),
              gas: gasLimit.toString(),
              gasPrice: bestGasPrice.toString()
            })
            .then((tx) => {
              resolve(tx as any)
            })
            .catch((error) => {
              reject(error)
            })
        })

        return {
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber)
        }
      } catch (error: unknown) {
        if (error instanceof ResponseError) {
          throw new Error(error.data.message)
        }
        throw new Error((error as Error).message || "Error setting HLS address")
      }
    }
  })

  const getTreasury = async (factoryAddress: string): Promise<string> => {
    if (!web3Provider) {
      throw new Error("No wallet connected")
    }

    try {
      const factoryContract = new web3Provider.eth.Contract(
        factoryAbi as any,
        factoryAddress
      )

      const address = await factoryContract.methods.treasury().call()
      return String(address)
    } catch (error: unknown) {
      if (error instanceof ResponseError) {
        throw new Error(error.data.message)
      }
      throw new Error((error as Error).message || "Error getting treasury address")
    }
  }

  const setTreasury = useMutation({
    mutationFn: async (params: {
      factory: string
      treasury: string
    }): Promise<UpdateParamsResult> => {
      if (!web3Provider || !address) {
        throw new Error("No wallet connected")
      }

      if (!chainId) {
        throw new Error("No chain id found")
      }

      try {
        const factoryContract = new web3Provider.eth.Contract(
          factoryAbi as any,
          params.factory
        )

        // Simulate the transaction
        await factoryContract.methods
          .setTreasury(params.treasury)
          .call({ from: address })

        // Estimate gas
        const gasEstimate = await factoryContract.methods
          .setTreasury(params.treasury)
          .estimateGas({ from: address })

        // Add 20% to the gas estimation
        const gasLimit = (BigInt(gasEstimate.toString()) * 120n) / 100n

        // Get best gas price
        const bestGasPrice = await getBestGasPrice(web3Provider)

        // Send the transaction
        const receipt = await new Promise<TransactionReceipt>((resolve, reject) => {
          web3Provider.eth
            .sendTransaction({
              from: address,
              to: params.factory,
              data: factoryContract.methods.setTreasury(params.treasury).encodeABI(),
              gas: gasLimit.toString(),
              gasPrice: bestGasPrice.toString()
            })
            .then((tx) => {
              resolve(tx as any)
            })
            .catch((error) => {
              reject(error)
            })
        })

        return {
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber)
        }
      } catch (error: unknown) {
        if (error instanceof ResponseError) {
          throw new Error(error.data.message)
        }
        throw new Error((error as Error).message || "Error setting treasury address")
      }
    }
  })

  const getDepositFeeBps = async (factoryAddress: string): Promise<number> => {
    if (!web3Provider) {
      throw new Error("No wallet connected")
    }

    try {
      const factoryContract = new web3Provider.eth.Contract(
        factoryAbi as any,
        factoryAddress
      )

      const feeBps = await factoryContract.methods.depositFeeBps().call()
      return Number(feeBps)
    } catch (error: unknown) {
      if (error instanceof ResponseError) {
        throw new Error(error.data.message)
      }
      throw new Error((error as Error).message || "Error getting deposit fee")
    }
  }

  const setDepositFee = useMutation({
    mutationFn: async (params: {
      factory: string
      feeBps: number
    }): Promise<UpdateParamsResult> => {
      if (!web3Provider || !address) {
        throw new Error("No wallet connected")
      }

      if (!chainId) {
        throw new Error("No chain id found")
      }

      if (params.feeBps > 10000) {
        throw new Error("Fee too high (max 100%)")
      }

      try {
        const factoryContract = new web3Provider.eth.Contract(
          factoryAbi as any,
          params.factory
        )

        // Simulate the transaction
        await factoryContract.methods
          .setDepositFee(params.feeBps)
          .call({ from: address })

        // Estimate gas
        const gasEstimate = await factoryContract.methods
          .setDepositFee(params.feeBps)
          .estimateGas({ from: address })

        // Add 20% to the gas estimation
        const gasLimit = (BigInt(gasEstimate.toString()) * 120n) / 100n

        // Get best gas price
        const bestGasPrice = await getBestGasPrice(web3Provider)

        // Send the transaction
        const receipt = await new Promise<TransactionReceipt>((resolve, reject) => {
          web3Provider.eth
            .sendTransaction({
              from: address,
              to: params.factory,
              data: factoryContract.methods.setDepositFee(params.feeBps).encodeABI(),
              gas: gasLimit.toString(),
              gasPrice: bestGasPrice.toString()
            })
            .then((tx) => {
              resolve(tx as any)
            })
            .catch((error) => {
              reject(error)
            })
        })

        return {
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber)
        }
      } catch (error: unknown) {
        if (error instanceof ResponseError) {
          throw new Error(error.data.message)
        }
        throw new Error((error as Error).message || "Error setting deposit fee")
      }
    }
  })

  const getFeeSwapConfig = async (
    factoryAddress: string,
    depositToken: string
  ): Promise<FeeSwapConfig> => {
    if (!web3Provider) {
      throw new Error("No wallet connected")
    }

    try {
      const factoryContract = new web3Provider.eth.Contract(
        factoryAbi as any,
        factoryAddress
      )

      const config: any = await factoryContract.methods
        .feeSwapConfigs(depositToken)
        .call()

      // Note: pathV2 and pathV3 are not directly accessible from the mapping
      // They would need to be stored separately or retrieved via events
      return {
        enabled: Boolean(config.enabled),
        isV2: Boolean(config.isV2),
        router: String(config.router || ""),
        quoter: String(config.quoter || ""),
        pathV2: [], // Not available from mapping
        pathV3: "", // Not available from mapping
        tokenOut: String(config.tokenOut || ""),
        slippageBps: String(config.slippageBps || "0")
      }
    } catch (error: unknown) {
      if (error instanceof ResponseError) {
        throw new Error(error.data.message)
      }
      throw new Error((error as Error).message || "Error getting fee swap config")
    }
  }

  const setFeeSwapConfig = useMutation({
    mutationFn: async (
      params: SetFeeSwapConfigParams
    ): Promise<SetFeeSwapConfigResult> => {
      if (!web3Provider || !address) {
        throw new Error("No wallet connected")
      }

      if (!chainId) {
        throw new Error("No chain id found")
      }

      if (params.slippageBps && Number(params.slippageBps) > 1000) {
        throw new Error("Slippage too high (max 10%)")
      }

      try {
        const factoryContract = new web3Provider.eth.Contract(
          factoryAbi as any,
          params.factory
        )

        // Simulate the transaction
        await factoryContract.methods
          .setFeeSwapConfig(
            params.depositToken,
            params.enabled,
            params.isV2,
            params.router,
            params.quoter,
            params.pathV2,
            params.pathV3,
            params.tokenOut,
            params.slippageBps
          )
          .call({ from: address })

        // Estimate gas
        const gasEstimate = await factoryContract.methods
          .setFeeSwapConfig(
            params.depositToken,
            params.enabled,
            params.isV2,
            params.router,
            params.quoter,
            params.pathV2,
            params.pathV3,
            params.tokenOut,
            params.slippageBps
          )
          .estimateGas({ from: address })

        // Add 20% to the gas estimation
        const gasLimit = (BigInt(gasEstimate.toString()) * 120n) / 100n

        // Get best gas price
        const bestGasPrice = await getBestGasPrice(web3Provider)

        // Send the transaction
        const receipt = await new Promise<TransactionReceipt>((resolve, reject) => {
          web3Provider.eth
            .sendTransaction({
              from: address,
              to: params.factory,
              data: factoryContract.methods
                .setFeeSwapConfig(
                  params.depositToken,
                  params.enabled,
                  params.isV2,
                  params.router,
                  params.quoter,
                  params.pathV2,
                  params.pathV3,
                  params.tokenOut,
                  params.slippageBps
                )
                .encodeABI(),
              gas: gasLimit.toString(),
              gasPrice: bestGasPrice.toString()
            })
            .then((tx) => {
              resolve(tx as any)
            })
            .catch((error) => {
              reject(error)
            })
        })

        return {
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber)
        }
      } catch (error: unknown) {
        if (error instanceof ResponseError) {
          throw new Error(error.data.message)
        }
        throw new Error((error as Error).message || "Error setting fee swap config")
      }
    }
  })

  return {
    createETF: createETF.mutateAsync,
    deposit: deposit.mutateAsync,
    redeem: redeem.mutateAsync,
    rebalance: rebalance.mutateAsync,
    approveToken: approveToken.mutateAsync,
    updateParams: updateParams.mutateAsync,
    estimateDepositShares,
    estimateRedeemDeposit,
    estimateRebalance,
    estimateUpdateParams,
    // Admin functions
    getOwner,
    getHLSAddress,
    setHLSAddress: setHLSAddress.mutateAsync,
    getTreasury,
    setTreasury: setTreasury.mutateAsync,
    getDepositFeeBps,
    setDepositFee: setDepositFee.mutateAsync,
    getFeeSwapConfig,
    setFeeSwapConfig: setFeeSwapConfig.mutateAsync,
    isLoading:
      createETF.isPending ||
      deposit.isPending ||
      redeem.isPending ||
      rebalance.isPending ||
      approveToken.isPending ||
      updateParams.isPending ||
      setHLSAddress.isPending ||
      setTreasury.isPending ||
      setDepositFee.isPending ||
      setFeeSwapConfig.isPending,
    error:
      createETF.error ||
      deposit.error ||
      redeem.error ||
      rebalance.error ||
      approveToken.error ||
      updateParams.error ||
      setHLSAddress.error ||
      setTreasury.error ||
      setDepositFee.error ||
      setFeeSwapConfig.error
  }
}
