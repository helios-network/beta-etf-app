import { formatUnits } from "viem"

interface FormatCurrencyOptions {
  currency?: string
  small?: boolean
  tspan?: boolean
}

export const formatCurrency = (
  amount: number,
  options: FormatCurrencyOptions = {
    currency: "USD",
    small: true,
    tspan: false
  }
) => {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)

  const [wholePart, decimalPart] = formatted.split(".")
  const currencySymbol = options.currency === "USD" ? "$" : options.currency

  return (
    <>
      {currencySymbol}
      {wholePart}
      {options.small ? (
        <small>.{decimalPart}</small>
      ) : options.tspan ? (
        <tspan>.{decimalPart}</tspan>
      ) : (
        `.${decimalPart}`
      )}
    </>
  )
}

export function formatNumber(number: number, decimals?: number): string {
  if (decimals === 0) {
    return number.toLocaleString("en-US", {
      useGrouping: true
    })
  }

  const safeDecimals = Math.min(Math.max(decimals ?? 2, 0), 20)

  return number.toLocaleString("en-US", {
    maximumFractionDigits: safeDecimals,
    minimumFractionDigits: 2,
    useGrouping: true
  })
}

export const formatBigNumber = (number: number, toFixed = 2): string => {
  if (number < 1000) {
    return number.toFixed(toFixed)
  } else if (number < 1000000) {
    return `${(number / 1000).toFixed(1)}k`
  } else if (number < 1000000000) {
    return `${(number / 1000000).toFixed(1)}M`
  } else {
    return `${(number / 1000000000).toFixed(1)}B`
  }
}

export const formatTotalMarketCap = (
  totalSupply: string,
  sharePrice: string,
  shareDecimals: number
): string => {
  // Handle decimal strings and invalid values
  if (!totalSupply || totalSupply === "0" || totalSupply === "0.000") {
    return "0"
  }

  // Convert decimal string to integer string for BigInt conversion
  // Extract integer part (before decimal point)
  const integerPart = totalSupply.includes(".")
    ? totalSupply.split(".")[0]
    : totalSupply

  // If integer part is empty or invalid, return 0
  if (!integerPart || integerPart === "0") {
    return "0"
  }

  try {
    const supply = formatUnits(BigInt(integerPart), shareDecimals)
    const price = parseFloat(sharePrice)

    const marketCap = parseFloat(supply) * price

    return formatTokenAmount(marketCap)
  } catch (error) {
    console.error("Error formatting total market cap:", error, {
      totalSupply,
      sharePrice,
      shareDecimals
    })
    return "0"
  }
}

export const formatTokenAmount = (amount: number | string): string => {
  const amountNumber = typeof amount === "string" ? parseFloat(amount) : amount

  if (isNaN(amountNumber) || amountNumber === 0) return "0"

  // Handle very large numbers with abbreviations (K, M, B, T)
  if (amountNumber >= 1_000_000_000_000) {
    const trillions = amountNumber / 1_000_000_000_000
    const formatted = trillions.toFixed(2).replace(/\.?0+$/, "")
    return `${formatted}T`
  }
  if (amountNumber >= 1_000_000_000) {
    const billions = amountNumber / 1_000_000_000
    const formatted = billions.toFixed(2).replace(/\.?0+$/, "")
    return `${formatted}B`
  }
  if (amountNumber >= 1_000_000) {
    const millions = amountNumber / 1_000_000
    const formatted = millions.toFixed(2).replace(/\.?0+$/, "")
    return `${formatted}M`
  }
  if (amountNumber >= 1_000) {
    const thousands = amountNumber / 1_000
    const formatted = thousands.toFixed(2).replace(/\.?0+$/, "")
    return `${formatted}K`
  }

  // For numbers less than 1000, format with appropriate decimal places
  // Use point (.) as decimal separator and commas for thousands
  let formatted: string
  if (amountNumber >= 1) {
    formatted = amountNumber.toLocaleString("en-US", {
      maximumFractionDigits: 3,
      minimumFractionDigits: 0,
      useGrouping: true
    })
  } else if (amountNumber >= 0.001) {
    formatted = amountNumber.toLocaleString("en-US", {
      maximumFractionDigits: 4,
      minimumFractionDigits: 0,
      useGrouping: false
    })
  } else if (amountNumber >= 0.0001) {
    formatted = amountNumber.toLocaleString("en-US", {
      maximumFractionDigits: 5,
      minimumFractionDigits: 0,
      useGrouping: false
    })
  } else if (amountNumber >= 0.00001) {
    formatted = amountNumber.toLocaleString("en-US", {
      maximumFractionDigits: 6,
      minimumFractionDigits: 0,
      useGrouping: false
    })
  } else if (amountNumber >= 0.000001) {
    formatted = amountNumber.toLocaleString("en-US", {
      maximumFractionDigits: 7,
      minimumFractionDigits: 0,
      useGrouping: false
    })
  } else if (amountNumber >= 0.0000001) {
    formatted = amountNumber.toLocaleString("en-US", {
      maximumFractionDigits: 8,
      minimumFractionDigits: 0,
      useGrouping: false
    })
  } else if (amountNumber >= 0.00000001) {
    formatted = amountNumber.toLocaleString("en-US", {
      maximumFractionDigits: 9,
      minimumFractionDigits: 0,
      useGrouping: false
    })
  } else if (amountNumber >= 0.000000001) {
    formatted = amountNumber.toLocaleString("en-US", {
      maximumFractionDigits: 10,
      minimumFractionDigits: 0,
      useGrouping: false
    })
  } else if (amountNumber >= 0.0000000001) {
    formatted = amountNumber.toLocaleString("en-US", {
      maximumFractionDigits: 11,
      minimumFractionDigits: 0,
      useGrouping: false
    })
  } else {
    formatted = amountNumber.toLocaleString("en-US", {
      maximumFractionDigits: 6,
      minimumFractionDigits: 0,
      useGrouping: false
    })
  }

  // toLocaleString("en-US") already uses point (.) for decimals and commas for thousands
  // This is exactly what we want, so we return it as is
  return formatted
}
