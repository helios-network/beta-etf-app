import { useMutation } from "@tanstack/react-query"
import { useAccount, useChainId } from "wagmi"
import { useWeb3Provider } from "./useWeb3Provider"
import { ETF_FACTORY_CONTRACT_ADDRESS as ETF_FACTORY_ADDRESS, etfFactoryAbi as factoryAbi } from "@/constant/etf-contracts"
import { erc20Abi } from "@/constant/helios-contracts"
import { getBestGasPrice } from "@/lib/utils/gas"
import { decodeEventLog, TransactionReceipt } from "viem"
import { getErrorMessage } from "@/utils/string"
import { EventLog } from "web3"

interface CreateETFParams {
  depositToken: string
  depositFeed: string
  router: string
  assetTokens: string[]
  priceFeeds: string[]
  targetWeightsBps: number[]
  depositPaths: string[][]
  withdrawPaths: string[][]
  name: string
  symbol: string
}

interface CreateETFResult {
  vault: string
  shareToken: string
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
  eventNonce: string
  eventHeight: string
  txHash: string
  blockNumber: number
}

interface RebalanceParams {
  vault: string
}

interface RebalanceResult {
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
        const factoryAddress = ETF_FACTORY_ADDRESS[chainId as keyof typeof ETF_FACTORY_ADDRESS]
        if (!factoryAddress) {
          throw new Error("No factory contract found for chain id: " + chainId)
        }
        const factoryContract = new web3Provider.eth.Contract(
          factoryAbi as any,
          factoryAddress
        )

        // Prepare the depositTokenAndDepositFeedAndRouter array
        const depositTokenAndDepositFeedAndRouter = [
          params.depositToken,
          params.depositFeed,
          params.router
        ]

        // Simulate the transaction
        const resultOfSimulation = await factoryContract.methods
          .createETF(
            depositTokenAndDepositFeedAndRouter,
            params.assetTokens,
            params.priceFeeds,
            params.targetWeightsBps,
            params.depositPaths,
            params.withdrawPaths,
            params.name,
            params.symbol
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
            depositTokenAndDepositFeedAndRouter,
            params.assetTokens,
            params.priceFeeds,
            params.targetWeightsBps,
            params.depositPaths,
            params.withdrawPaths,
            params.name,
            params.symbol
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
              to: factoryAddress,
              data: factoryContract.methods
                .createETF(
                  depositTokenAndDepositFeedAndRouter,
                  params.assetTokens,
                  params.priceFeeds,
                  params.targetWeightsBps,
                  params.depositPaths,
                  params.withdrawPaths,
                  params.name,
                  params.symbol
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

        // Parse the ETFCreated event from the receipt using getPastEvents
        const events = await factoryContract.getPastEvents("ETFCreated", {
          fromBlock: receipt.blockNumber,
          toBlock: receipt.blockNumber,
          filter: { transactionHash: receipt.transactionHash }
        })

        if (events.length === 0) {
          throw new Error("Could not find ETFCreated event in transaction receipt")
        }

        const event = events[0]
        const vaultAddress = (event as EventLog).returnValues.vault as string
        const shareTokenAddress = (event as EventLog).returnValues.shareToken as string

        if (!vaultAddress || !shareTokenAddress) {
          throw new Error("Could not find vault or shareToken in ETFCreated event")
        }

        return {
          vault: vaultAddress,
          shareToken: shareTokenAddress,
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber)
        }
      } catch (error: unknown) {
        throw new Error(getErrorMessage(error) || "Error during createETF")
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
        throw new Error(getErrorMessage(error) || "Error during token approval")
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

        // Simulate the transaction
        await factoryContract.methods
          .deposit(params.vault, params.amount, params.minSharesOut)
          .call({ from: address })

        // Estimate gas
        const gasEstimate = await factoryContract.methods
          .deposit(params.vault, params.amount, params.minSharesOut)
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
                .deposit(params.vault, params.amount, params.minSharesOut)
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
        
        // Ici evt = { eventName, args }
        const { depositAmount, sharesOut, eventNonce, eventHeight } = depositEvent.args
        
        console.log({ depositAmount, sharesOut, eventNonce, eventHeight })
        
        return {
          depositAmount,
          sharesOut,
          eventNonce,
          eventHeight,
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber)
        }
      } catch (error: unknown) {
        throw new Error(getErrorMessage(error) || "Error during deposit")
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

        // Simulate the transaction
        await factoryContract.methods
          .redeem(params.vault, params.shares, params.minOut)
          .call({ from: address })

        // Estimate gas
        const gasEstimate = await factoryContract.methods
          .redeem(params.vault, params.shares, params.minOut)
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
                .redeem(params.vault, params.shares, params.minOut)
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

        // Parse the Redeem event
        const events = await factoryContract.getPastEvents("Redeem", {
          fromBlock: receipt.blockNumber,
          toBlock: receipt.blockNumber,
          filter: { transactionHash: receipt.transactionHash, vault: params.vault }
        })

        if (events.length === 0) {
          throw new Error("Could not find Redeem event in transaction receipt")
        }

        const event = events[0] as EventLog
        const sharesIn = event.returnValues.sharesIn as string
        const depositOut = event.returnValues.depositOut as string
        const eventNonce = event.returnValues.eventNonce as string
        const eventHeight = event.returnValues.eventHeight as string

        return {
          sharesIn,
          depositOut,
          eventNonce,
          eventHeight,
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber)
        }
      } catch (error: unknown) {
        throw new Error(getErrorMessage(error) || "Error during redeem")
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
        const factoryAddress = ETF_FACTORY_ADDRESS[chainId as keyof typeof ETF_FACTORY_ADDRESS]
        if (!factoryAddress) {
          throw new Error("No factory contract found for chain id: " + chainId)
        }

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

        // Parse the Rebalance event
        const events = await factoryContract.getPastEvents("Rebalance", {
          fromBlock: receipt.blockNumber,
          toBlock: receipt.blockNumber,
          filter: { transactionHash: receipt.transactionHash, vault: params.vault }
        })

        if (events.length === 0) {
          throw new Error("Could not find Rebalance event in transaction receipt")
        }

        const event = events[0] as EventLog
        const fromIndex = event.returnValues.fromIndex as string
        const toIndex = event.returnValues.toIndex as string
        const moveValue = event.returnValues.moveValue as string
        const eventNonce = event.returnValues.eventNonce as string
        const eventHeight = event.returnValues.eventHeight as string
        const bought = event.returnValues.bought as string

        return {
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
        throw new Error(getErrorMessage(error) || "Error during rebalance")
      }
    }
  })

  return {
    createETF: createETF.mutateAsync,
    deposit: deposit.mutateAsync,
    redeem: redeem.mutateAsync,
    rebalance: rebalance.mutateAsync,
    approveToken: approveToken.mutateAsync,
    isLoading: createETF.isPending || deposit.isPending || redeem.isPending || rebalance.isPending || approveToken.isPending,
    error: createETF.error || deposit.error || redeem.error || rebalance.error || approveToken.error
  }
}

