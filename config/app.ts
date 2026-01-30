import { env } from "@/env"

export const APP_NAME = "Beta ETF - Helios Chain"

export const APP_COLOR_PRIMARY = "#002dcb"
export const APP_COLOR_SECONDARY = "rgba(255, 113, 11, 1)"
export const APP_COLOR_DEFAULT = "#ddd"
export const APP_THEME_COLOR = APP_COLOR_PRIMARY

export const APP_BASE_URL =
  env.NEXT_PUBLIC_NODE_ENV === "production"
    ? new URL("https://beta-etf.helioschain.network")
    : new URL("http://localhost:3000")

export const ETHEREUM_NETWORK_ID = 1
export const ARBITRUM_NETWORK_ID = 42161
export const HELIOS_NETWORK_ID = 42000
export const BETA_NETWORK_ID = ETHEREUM_NETWORK_ID

export const ALLOWED_CHAIN_IDS = [ETHEREUM_NETWORK_ID, ARBITRUM_NETWORK_ID]

// Import the getRpcUrl function from the rpc.ts file when using RPC_URL
// This is a placeholder for static imports
export const RPC_URL = "RPC_URL" // This will be replaced dynamically at runtime
export const RPC_URL_DEFAULT = "https://testnet1.helioschainlabs.org"
export const RPC_URL_OLD = "https://helios.ethereum.rpc.sotatek.works"
export const CDN_URL = "https://testnet1-cdn.helioschainlabs.org"
export const EXPLORER_URL = "https://explorer.helioschainlabs.org"

export const HELIOS_TOKEN_ADDRESS = "0xD4949664cD82660AaE99bEdc034a0deA8A0bd517"
