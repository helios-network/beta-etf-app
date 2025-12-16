import { useMutation } from "@tanstack/react-query"
import { useAccount, useChainId } from "wagmi"
import { useWeb3Provider } from "./useWeb3Provider"
import { ETF_FACTORY_CONTRACT_ADDRESS as ETF_FACTORY_ADDRESS, etfFactoryAbi as factoryAbi } from "@/constant/etf-contracts"
import { erc20Abi } from "@/constant/helios-contracts"
import { getBestGasPrice } from "@/lib/utils/gas"
import { decodeEventLog, TransactionReceipt, Abi } from "viem"
import { getErrorMessage } from "@/utils/string"
import { EventLog } from "web3"

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
}

interface RebalanceResult {
  user: string
  fromIndex: string
  toIndex: string
  moveValue: string
  eventNonce: string
  eventHeight: string
  bought: string
  txHash: string
  blockNumber: number
}

interface ApproveTokenParams {
  tokenAddress: string
  spenderAddress: string
  amount: string
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

        // Simulate the transaction
        const resultOfSimulation = await factoryContract.methods
          .createETF(
            config,
            params.assetTokens,
            params.priceFeeds,
            params.targetWeightsBps,
            params.swapPathsData,
            etfParams
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
            etfParams
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
                  etfParams
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
              topics: log.topics,
            })

            if (evt.eventName === "ETFCreated") {
              etfCreatedEvent = evt
              break
            }
          } catch {}
        }

        if (!etfCreatedEvent) {
          throw new Error("Could not find ETFCreated event in transaction receipt")
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
        throw new Error((error as Error).message || "Error during token approval")
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
          .deposit(params.vault, params.amount, params.minSharesOut, false)
          .call({ from: address })

        // Estimate gas
        const gasEstimate = await factoryContract.methods
          .deposit(params.vault, params.amount, params.minSharesOut, false)
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
                .deposit(params.vault, params.amount, params.minSharesOut, false)
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
              topics: log.topics,
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
        
        const { depositAmount, sharesOut, amountsOut: eventAmountsOut, valuesPerAsset: eventValuesPerAsset, eventNonce, eventHeight } = depositEvent.args
        
        // Use event data if available, fallback to function return values
        return {
          depositAmount,
          sharesOut: String(sharesOut || depositResult.sharesOutRet),
          amountsOut: ((eventAmountsOut || depositResult.amountsOut) || []).map((amt: any) => String(amt)),
          valuesPerAsset: ((eventValuesPerAsset || depositResult.valuesPerAsset) || []).map((val: any) => String(val)),
          eventNonce,
          eventHeight,
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber)
        }
      } catch (error: unknown) {
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
          .redeem(params.vault, params.shares, params.minOut, false)
          .call({ from: address })

        // Estimate gas
        const gasEstimate = await factoryContract.methods
          .redeem(params.vault, params.shares, params.minOut, false)
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
                .redeem(params.vault, params.shares, params.minOut, false)
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
              topics: log.topics,
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

        const { sharesIn, depositOut, soldAmounts: eventSoldAmounts, eventNonce, eventHeight } = redeemEvent.args

        // Use the return values from the function call
        // redeemResult contains: { depositOutRet, soldAmounts }
        const { depositOutRet, soldAmounts } = redeemResult
        
        // Use event data if available, fallback to function return values
        return {
          sharesIn,
          depositOut: String(depositOut || depositOutRet),
          soldAmounts: ((eventSoldAmounts || soldAmounts) || []).map((amt: any) => String(amt)),
          eventNonce,
          eventHeight,
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber)
        }
      } catch (error: unknown) {
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

        // Simulate the transaction
        await factoryContract.methods.rebalance(params.vault).call({ from: address })

        // Estimate gas
        const gasEstimate = await factoryContract.methods
          .rebalance(params.vault)
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
              data: factoryContract.methods.rebalance(params.vault).encodeABI(),
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
              topics: log.topics,
            })

            if (evt.eventName === "Rebalance") {
              rebalanceEvent = evt
              break
            }
          } catch {}
        }

        if (!rebalanceEvent) {
          throw new Error("Could not find Rebalance event in transaction receipt")
        }

        const { user, fromIndex, toIndex, moveValue, eventNonce, eventHeight, bought } = rebalanceEvent.args

        return {
          user,
          fromIndex,
          toIndex,
          moveValue,
          eventNonce,
          eventHeight,
          bought,
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber)
        }
      } catch (error: unknown) {
        throw new Error((error as Error).message || "Error during rebalance")
      }
    }
  })

  const estimateDepositShares = async (params: {
    factory: string
    vault: string
    amount: string,
    allowance: bigint
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
        .deposit(params.vault, params.amount, "0", needEstimateBool)
        .call({ from: address })

      console.log("depositResult", depositResult)
      
      return {
        sharesOut: String(depositResult.sharesOutRet),
        amountsOut: (depositResult.amountsOut || []).map((amt: any) => String(amt)),
        valuesPerAsset: (depositResult.valuesPerAsset || []).map((val: any) => String(val))
      }
    } catch (error: unknown) {
      throw new Error((error as Error).message || "Error estimating deposit shares")
    }
  }

  const estimateRedeemDeposit = async (params: {
    factory: string
    vault: string
    shares: string
    allowance: bigint
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
        .redeem(params.vault, params.shares, "0", needEstimateBool)
        .call({ from: address })
      
      
      return {
        depositOut: String(redeemResult.depositOutRet),
        soldAmounts: (redeemResult.soldAmounts || []).map((amt: any) => String(amt))
      }
    } catch (error: unknown) {
      throw new Error((error as Error).message || "Error estimating redeem deposit")
    }
  }

  return {
    createETF: createETF.mutateAsync,
    deposit: deposit.mutateAsync,
    redeem: redeem.mutateAsync,
    rebalance: rebalance.mutateAsync,
    approveToken: approveToken.mutateAsync,
    estimateDepositShares,
    estimateRedeemDeposit,
    isLoading: createETF.isPending || deposit.isPending || redeem.isPending || rebalance.isPending || approveToken.isPending,
    error: createETF.error || deposit.error || redeem.error || rebalance.error || approveToken.error
  }
}

