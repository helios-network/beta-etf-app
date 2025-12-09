import { RPC_URL_DEFAULT } from "@/config/app"
import { getRpcUrl } from "@/config/rpc"
import { env } from "@/env"

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

async function fetchETFs(page: number = 1, size: number = 10): Promise<ETFsApiResponse> {
  const apiUrl = env.NEXT_PUBLIC_BASE_API_URL
  
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_BASE_API_URL is not configured. Please set it in your .env file.")
  }

  // Remove trailing slash if present to avoid double slashes
  const baseUrl = apiUrl.replace(/\/+$/, "")
  const url = `${baseUrl}/api/etfs?page=${page}&size=${size}`
  
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

export { request, requestWithRpcUrl, fetchETFs }
export type { ETFResponse, ETFsApiResponse, ETFAsset }
