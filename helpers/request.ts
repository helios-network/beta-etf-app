import { RPC_URL_DEFAULT } from "@/config/app"
import { getRpcUrl } from "@/config/rpc"
import { env } from "@/env"
import { LeaderboardEntry, TransactionCounts, PointsByType } from "@/types/points"

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
  pricer: string
  chain: number
  shareToken: string
  depositToken: string
  depositSymbol?: string
  depositDecimals?: number
  name: string
  symbol: string
  totalSupply?: string
  volumeTradedUSD?: number
  dailyVolumeUSD?: number
  tvl: number
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
  depositCount?: number
  redeemCount?: number
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

async function fetchDepositTokens(chainId: number): Promise<DepositTokensApiResponse> {
  const apiUrl = env.NEXT_PUBLIC_BASE_API_URL
  
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_BASE_API_URL is not configured. Please set it in your .env file.")
  }

  // Remove trailing slash if present to avoid double slashes
  const baseUrl = apiUrl.replace(/\/+$/, "")
  const url = `${baseUrl}/api/etfs/deposit-tokens?chainId=${chainId}`
  
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
  details?: {
    details: string
    message: string
    requiredUSD: number
    token: string
  }
  reason?: string
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

    if (data?.details?.details != undefined) {
      console.log("sssss", data)
      return data.details as VerifyETFResponse;
    }

    if (data?.details?.message) {
      throw new Error(`Failed to verify ETF: ${data?.details?.message}`)
    }

    throw new Error(`Failed to verify ETF: ${response.statusText}`)
  }

  const data: VerifyETFResponse = await response.json()

  return data
}

interface PortfolioAsset {
  chain: number
  symbol: string
  etfVaultAddress: string
  etfTokenAddress: string
  etfName: string
  amount: string
  amountFormatted: string
  amountUSD: number
  sharePriceUSD: number
  decimals: number
}

interface PortfolioAllocation {
  symbol: string
  etfVaultAddress: string
  amountUSD: number
  percentage: number
  chain: number
}

interface PortfolioResponse {
  address: string
  totalValueUSD: number
  totalAssets: number
  chains: number[]
  updatedAt: string
}

interface PortfolioSummary {
  address: string
  totalValueUSD: number
  totalAssets: number
  allocation: PortfolioAllocation[]
  byChain: {
    [chainId: string]: number
  }
}

interface PortfolioApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

async function fetchPortfolio(
  address: string
): Promise<PortfolioApiResponse<PortfolioResponse> | null> {
  const apiUrl = env.NEXT_PUBLIC_BASE_API_URL

  if (!apiUrl) {
    throw new Error(
      "NEXT_PUBLIC_BASE_API_URL is not configured. Please set it in your .env file."
    )
  }

  const baseUrl = apiUrl.replace(/\/+$/, "")
  const url = `${baseUrl}/api/portfolio/${address}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  })

  // 404 means no portfolio found (empty portfolio)
  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch portfolio: ${response.statusText}`)
  }

  const data: PortfolioApiResponse<PortfolioResponse> = await response.json()

  if (!data.success) {
    throw new Error(data.message || "API returned unsuccessful response")
  }

  return data
}

async function fetchPortfolioAssets(
  address: string
): Promise<PortfolioApiResponse<PortfolioAsset[]> | null> {
  const apiUrl = env.NEXT_PUBLIC_BASE_API_URL

  if (!apiUrl) {
    throw new Error(
      "NEXT_PUBLIC_BASE_API_URL is not configured. Please set it in your .env file."
    )
  }

  const baseUrl = apiUrl.replace(/\/+$/, "")
  const url = `${baseUrl}/api/portfolio/${address}/assets`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  })

  // 404 means no assets found (empty portfolio)
  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch portfolio assets: ${response.statusText}`)
  }

  const data: PortfolioApiResponse<PortfolioAsset[]> = await response.json()

  if (!data.success) {
    throw new Error(data.message || "API returned unsuccessful response")
  }

  return data
}

async function fetchPortfolioSummary(
  address: string
): Promise<PortfolioApiResponse<PortfolioSummary> | null> {
  const apiUrl = env.NEXT_PUBLIC_BASE_API_URL

  if (!apiUrl) {
    throw new Error(
      "NEXT_PUBLIC_BASE_API_URL is not configured. Please set it in your .env file."
    )
  }

  const baseUrl = apiUrl.replace(/\/+$/, "")
  const url = `${baseUrl}/api/portfolio/${address}/summary`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  })

  // 404 means no summary found (empty portfolio)
  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch portfolio summary: ${response.statusText}`)
  }

  const data: PortfolioApiResponse<PortfolioSummary> = await response.json()

  if (!data.success) {
    throw new Error(data.message || "API returned unsuccessful response")
  }

  return data
}

interface UserTotalPointsData {
  address: string
  totalPoints: number
  pointsByType: PointsByType
  transactionCounts: TransactionCounts
}

interface UserTotalPointsResponse {
  success: boolean
  data: UserTotalPointsData
  message?: string
}

async function fetchUserTotalPoints(
  address: string
): Promise<UserTotalPointsResponse> {
  const apiUrl = env.NEXT_PUBLIC_BASE_API_URL

  if (!apiUrl) {
    throw new Error(
      "NEXT_PUBLIC_BASE_API_URL is not configured. Please set it in your .env file."
    )
  }

  const baseUrl = apiUrl.replace(/\/+$/, "")
  const url = `${baseUrl}/api/rewards/${address}/total-points`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch user total points: ${response.statusText}`)
  }

  const data: UserTotalPointsResponse = await response.json()

  if (!data.success) {
    throw new Error(data.message || "API returned unsuccessful response")
  }

  return data
}

export { request, requestWithRpcUrl, fetchETFs, fetchDepositTokens, fetchLeaderboard, verifyETF, fetchPortfolio, fetchPortfolioAssets, fetchPortfolioSummary, fetchUserTotalPoints }
export type { ETFResponse, ETFsApiResponse, ETFAsset, DepositToken, DepositTokensApiResponse, LeaderboardApiResponse, VerifyETFRequest, VerifyETFResponse, VerifyETFComponent, PortfolioAsset, PortfolioSummary, PortfolioResponse, PortfolioApiResponse, PortfolioAllocation, UserTotalPointsResponse, UserTotalPointsData }
