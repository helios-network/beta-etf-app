import { RPC_URL_DEFAULT } from "@/config/app"
import { getRpcUrl } from "@/config/rpc"
import { env } from "@/env"
import { LeaderboardEntry } from "@/types/points"

async function requestWithRpcUrl<T>(rpcUrl: string, method: string, params: any[]): Promise<T | null> { 
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: 1
    })
  })

  if (!response.ok) {
    throw new Error(`${method} call failed.`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message)
  }

  return data.result ?? null
}

async function request<T>(method: string, params: any[]): Promise<T | null> {
  // Get the dynamic RPC URL based on debug mode
  const rpcUrl = typeof window !== "undefined" ? getRpcUrl() : RPC_URL_DEFAULT

  return requestWithRpcUrl(rpcUrl, method, params)
}

interface ETFAsset {
  token: string
  feed: string
  targetWeightBps: number
  tvl: string
  depositPath: string[]
  withdrawPath: string[]
  symbol: string
  decimals: number
  _id: string
}

interface ETFResponse {
  _id: string
  vault: string
  chain: number
  shareToken: string
  depositToken: string
  depositSymbol?: string
  depositDecimals?: number
  name: string
  symbol: string
  totalSupply?: string
  tvl: string
  sharePrice?: string
  eventNonce: number
  eventHeight: number
  etfNonce: number
  etfHeight: number
  factory: string
  depositFeed?: string
  router?: string
  assets?: ETFAsset[]
  imbalanceThresholdBps?: number
  maxPriceStaleness?: number
  createdAt: string
  updatedAt: string
  __v: number
}

interface ETFsApiResponse {
  success: boolean
  data: ETFResponse[]
  pagination: {
    page: number
    size: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

async function fetchETFs(page: number = 1, size: number = 10, depositToken?: string): Promise<ETFsApiResponse> {
  const apiUrl = env.NEXT_PUBLIC_BASE_API_URL
  
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_BASE_API_URL is not configured. Please set it in your .env file.")
  }

  // Remove trailing slash if present to avoid double slashes
  const baseUrl = apiUrl.replace(/\/+$/, "")
  const params = new URLSearchParams({
    page: page.toString(),
    size: size.toString()
  })
  
  if (depositToken) {
    params.append("depositToken", depositToken)
  }
  
  const url = `${baseUrl}/api/etfs?${params.toString()}`
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ETFs: ${response.statusText}`)
  }

  const data: ETFsApiResponse = await response.json()

  if (!data.success) {
    throw new Error("API returned unsuccessful response")
  }

  return data
}

interface DepositToken {
  address: string
  symbol: string
  decimals: number
}

interface DepositTokensApiResponse {
  success: boolean
  data: DepositToken[]
}

async function fetchDepositTokens(): Promise<DepositTokensApiResponse> {
  const apiUrl = env.NEXT_PUBLIC_BASE_API_URL
  
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_BASE_API_URL is not configured. Please set it in your .env file.")
  }

  // Remove trailing slash if present to avoid double slashes
  const baseUrl = apiUrl.replace(/\/+$/, "")
  const url = `${baseUrl}/api/etfs/deposit-tokens`
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch deposit tokens: ${response.statusText}`)
  }

  const data: DepositTokensApiResponse = await response.json()

  if (!data.success) {
    throw new Error("API returned unsuccessful response")
  }

  return data
}

interface LeaderboardApiResponse {
  success: boolean
  data: LeaderboardEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

async function fetchLeaderboard(page: number = 1, size: number = 25): Promise<LeaderboardApiResponse> {
  const apiUrl = env.NEXT_PUBLIC_BASE_API_URL
  
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_BASE_API_URL is not configured. Please set it in your .env file.")
  }

  // Remove trailing slash if present to avoid double slashes
  const baseUrl = apiUrl.replace(/\/+$/, "")
  const url = `${baseUrl}/api/leaderBoard?page=${page}&limit=${size}`
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard: ${response.statusText}`)
  }

  const data: LeaderboardApiResponse = await response.json()

  if (!data.success) {
    throw new Error("API returned unsuccessful response")
  }

  return data
}

interface VerifyETFRequest {
  chainId: number
  depositToken: string
  components: Array<{
    token: string
    weight: number
  }>
}

interface VerifyETFComponent {
  token: string
  tokenAddress: string
  symbol: string
  decimals: number
  pricingMode: string
  feed: string
  depositPath: {
    type: string
    encoded: string
    path: string[]
  }
  withdrawPath: {
    type: string
    encoded: string
    path: string[]
  }
  liquidityUSD: number
}

interface VerifyETFResponse {
  status: "OK" | "ERROR"
  readyForCreation?: boolean
  errorMessage?: string
  factoryAddress: string
  components?: VerifyETFComponent[]
}

async function verifyETF(request: VerifyETFRequest): Promise<VerifyETFResponse> {
  const apiUrl = env.NEXT_PUBLIC_BASE_API_URL
  
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_BASE_API_URL is not configured. Please set it in your .env file.")
  }

  // Remove trailing slash if present to avoid double slashes
  const baseUrl = apiUrl.replace(/\/+$/, "")
  const url = `${baseUrl}/api/etfs/verify`
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {

    const data = await response.json()

    if (data?.details?.message) {
      throw new Error(`Failed to verify ETF: ${data?.details?.message}`)
    }

    throw new Error(`Failed to verify ETF: ${response.statusText}`)
  }

  const data: VerifyETFResponse = await response.json()

  return data
}

export { request, requestWithRpcUrl, fetchETFs, fetchDepositTokens, fetchLeaderboard, verifyETF }
export type { ETFResponse, ETFsApiResponse, ETFAsset, DepositToken, DepositTokensApiResponse, LeaderboardApiResponse, VerifyETFRequest, VerifyETFResponse, VerifyETFComponent }
