import { CDN_URL, HELIOS_TOKEN_ADDRESS } from "@/config/app"

interface CGToken {
  symbol: string
  current_price: number
  image: string
}

interface TokenData {
  price: number
  logo: string
}

const tempHLS: Record<string, TokenData> = {
  hls: {
    price: 0.05,
    logo: `${CDN_URL}/token/${HELIOS_TOKEN_ADDRESS}`
  }
}

const cgCache = new Map<string, TokenData>()
const inFlightCGRequests = new Map<string, Promise<Record<string, TokenData>>>()

const normalizeSymbol = (symbol: string): string => {
  return symbol
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u200c-\u200d\ufe00-\ufe0f]/g, "")
    .replace(/[^\w]/g, "")
}

const getSymbolVariants = (symbol: string): string[] => {
  const lower = symbol.toLowerCase()
  const variants = new Set<string>([lower])
  
  const normalized = normalizeSymbol(symbol)
  if (normalized && normalized !== lower) {
    variants.add(normalized)
  }
  
  const withoutBrackets = lower.replace(/\[.*?\]/g, "").trim()
  if (withoutBrackets && withoutBrackets !== lower) {
    variants.add(withoutBrackets)
    const normalizedNoBrackets = normalizeSymbol(withoutBrackets)
    if (normalizedNoBrackets && normalizedNoBrackets !== withoutBrackets) {
      variants.add(normalizedNoBrackets)
    }
  }
  
  const withoutDots = lower.replace(/\./g, "")
  if (withoutDots && withoutDots !== lower) {
    variants.add(withoutDots)
  }
  
  const baseSymbol = lower.split(/[.\[\]]/)[0]
  if (baseSymbol && baseSymbol !== lower) {
    variants.add(baseSymbol)
  }
  
  return Array.from(variants).filter(v => v.length > 0)
}

const createSymbolMap = (symbols: string[]): Map<string, string> => {
  const map = new Map<string, string>()
  for (const symbol of symbols) {
    const variants = getSymbolVariants(symbol)
    const originalLower = symbol.toLowerCase()
    for (const variant of variants) {
      if (!map.has(variant)) {
        map.set(variant, originalLower)
      }
    }
  }
  return map
}

export const fetchCGTokenData = async (
  symbols: string[]
): Promise<Record<string, TokenData>> => {
  if (symbols.length === 0) return {}

  const result: Record<string, TokenData> = {}
  const toFetch: string[] = []
  const symbolMap = createSymbolMap(symbols)

  for (const symbol of symbols) {
    const variants = getSymbolVariants(symbol)
    const originalLower = symbol.toLowerCase()
    
    if (originalLower === "hls" || variants.includes("hls")) {
      result[originalLower] = tempHLS.hls
    } else if (cgCache.has(originalLower)) {
      result[originalLower] = cgCache.get(originalLower)!
    } else {
      let found = false
      for (const variant of variants) {
        if (cgCache.has(variant)) {
          result[originalLower] = cgCache.get(variant)!
          found = true
          break
        }
      }
      if (!found) {
        const uniqueVariants = new Set<string>()
        for (const variant of variants) {
          if (variant && variant.length >= 2) {
            uniqueVariants.add(variant)
          }
        }
        for (const variant of uniqueVariants) {
          if (!toFetch.includes(variant)) {
            toFetch.push(variant)
          }
        }
      }
    }
  }

  if (toFetch.length === 0) return result

  const key = toFetch.sort().join(",")

  if (inFlightCGRequests.has(key)) {
    const pending = await inFlightCGRequests.get(key)!
    return { ...result, ...pending }
  }

  const promise = (async () => {
    try {
      const encodedSymbols = toFetch.map(s => encodeURIComponent(s)).join(",")
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&symbols=${encodedSymbols}&order=market_cap_desc&per_page=100&page=1&sparkline=false`
      )

      if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`)

      const data: CGToken[] = await res.json()

      const fetched: Record<string, TokenData> = {}
      const variantToOriginal = new Map<string, string>()

      for (const symbol of symbols) {
        const variants = getSymbolVariants(symbol)
        const originalLower = symbol.toLowerCase()
        for (const variant of variants) {
          if (toFetch.includes(variant) && !variantToOriginal.has(variant)) {
            variantToOriginal.set(variant, originalLower)
          }
        }
      }

      for (const token of data) {
        const tokenSymbol = token.symbol.toLowerCase()
        const tokenVariants = getSymbolVariants(token.symbol)
        const tokenData = {
          price: token.current_price,
          logo: token.image
        }

        const matchedOriginals = new Set<string>()

        for (const [variant, original] of variantToOriginal.entries()) {
          if (
            variant === tokenSymbol ||
            tokenVariants.includes(variant) ||
            variant === tokenSymbol ||
            (variant.length >= 2 && tokenSymbol.length >= 2 && (
              variant === tokenSymbol ||
              variant.startsWith(tokenSymbol) ||
              tokenSymbol.startsWith(variant)
            ))
          ) {
            matchedOriginals.add(original)
            fetched[original] = tokenData
            cgCache.set(original, tokenData)
            cgCache.set(variant, tokenData)
          }
        }

        for (const tokenVariant of tokenVariants) {
          for (const [variant, original] of variantToOriginal.entries()) {
            if (
              tokenVariant === variant ||
              (variant.length >= 2 && tokenVariant.length >= 2 && (
                variant === tokenVariant ||
                variant.startsWith(tokenVariant) ||
                tokenVariant.startsWith(variant)
              ))
            ) {
              if (!matchedOriginals.has(original)) {
                matchedOriginals.add(original)
                fetched[original] = tokenData
                cgCache.set(original, tokenData)
                cgCache.set(variant, tokenData)
              }
            }
          }
        }

        if (!fetched[tokenSymbol]) {
          fetched[tokenSymbol] = tokenData
          cgCache.set(tokenSymbol, tokenData)
        }
      }

      return fetched
    } catch (err) {
      console.error("Error while fetching CG token data:", err)
      return {}
    } finally {
      inFlightCGRequests.delete(key)
    }
  })()

  inFlightCGRequests.set(key, promise)

  const fetched = await promise
  return { ...result, ...fetched }
}
