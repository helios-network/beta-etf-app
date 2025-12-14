"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Sub } from "@/components/sub"
import { Symbol } from "@/components/symbol"
import { Tunnel } from "@/components/tunnel"
import { getAssetColor, getAssetIcon } from "@/utils/assets"
import { fetchCGTokenData } from "@/utils/price"
import { useQuery } from "@tanstack/react-query"
import Image from "next/image"
import { useMemo, useState } from "react"
import { ETFSelectModal } from "./(components)/etf-select-modal"
import { SlippageModal } from "./(components)/slippage-modal"
import { TokenSelectModal } from "./(components)/token-select-modal"
import s from "./page.module.scss"

interface Token {
  symbol: string
  name: string
}

interface ETF {
  id: string
  name: string
  symbol: string
  tokens: Array<{
    symbol: string
    percentage: number
  }>
}

// Données mock pour les tokens
const MOCK_TOKENS: Token[] = [
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "USDC", name: "USD Coin" },
  { symbol: "USDT", name: "Tether USD" },
  { symbol: "WBTC", name: "Wrapped Bitcoin" },
  { symbol: "DAI", name: "Dai Stablecoin" },
  { symbol: "UNI", name: "Uniswap" },
  { symbol: "AAVE", name: "Aave" },
  { symbol: "LINK", name: "Chainlink" },
  { symbol: "MATIC", name: "Polygon" },
  { symbol: "SUSHI", name: "SushiSwap" },
  { symbol: "COMP", name: "Compound" },
  { symbol: "MKR", name: "Maker" }
]

// Données mock pour les ETFs (comme dans etf-list)
const MOCK_ETFS: ETF[] = [
  {
    id: "mock-etf-1",
    name: "DeFi Blue Chip ETF",
    symbol: "DEFI-BC",
    tokens: [
      { symbol: "ETH", percentage: 40 },
      { symbol: "USDC", percentage: 30 },
      { symbol: "WBTC", percentage: 20 },
      { symbol: "UNI", percentage: 10 }
    ]
  },
  {
    id: "mock-etf-2",
    name: "Stablecoin Yield ETF",
    symbol: "STABLE-Y",
    tokens: [
      { symbol: "USDC", percentage: 50 },
      { symbol: "USDT", percentage: 30 },
      { symbol: "DAI", percentage: 20 }
    ]
  },
  {
    id: "mock-etf-3",
    name: "High Risk DeFi ETF",
    symbol: "HR-DEFI",
    tokens: [
      { symbol: "SUSHI", percentage: 35 },
      { symbol: "AAVE", percentage: 30 },
      { symbol: "ETH", percentage: 20 },
      { symbol: "COMP", percentage: 15 },
      { symbol: "MKR", percentage: 10 }
    ]
  }
]

export default function Home() {
  const [tokenModalOpen, setTokenModalOpen] = useState(false)
  const [etfModalOpen, setEtfModalOpen] = useState(false)
  const [slippageModalOpen, setSlippageModalOpen] = useState(false)
  const [slippage, setSlippage] = useState(0.25)
  const [selectedToken, setSelectedToken] = useState<Token | null>({
    symbol: "ETH",
    name: "Ethereum"
  })
  const [selectedETF, setSelectedETF] = useState<ETF | null>(null)

  // Récupérer les logos des tokens
  const allTokenSymbols = useMemo(() => {
    const symbols = new Set<string>()
    MOCK_TOKENS.forEach((token) => {
      symbols.add(token.symbol.toLowerCase())
    })
    MOCK_ETFS.forEach((etf) => {
      etf.tokens.forEach((token) => {
        symbols.add(token.symbol.toLowerCase())
      })
    })
    return Array.from(symbols)
  }, [])

  const { data: tokenData = {} } = useQuery({
    queryKey: ["tokenData", allTokenSymbols],
    queryFn: () => fetchCGTokenData(allTokenSymbols),
    enabled: allTokenSymbols.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000
  })

  const etfs: ETF[] = MOCK_ETFS

  const handleTokenSelect = (token: Token) => {
    setSelectedToken(token)
  }

  const handleETFSelect = (etf: ETF) => {
    setSelectedETF(etf)
  }

  return (
    <div className={s.home}>
      <div className={s.header}>
        <Sub className={s.sub}>
          Welcome to Helios <strong>Forge</strong>
        </Sub>
        <h1>Create, Mint, and Evolve ETFs.</h1>
        <p>
          Experience the future of ETF token trading Ethereum. Create, Mint and
          Manage diversified token baskets.
        </p>
      </div>
      <Card className={s.form}>
        <div className={s.field}>
          <label htmlFor="sell">Sell</label>
          <div className={s.middle}>
            <input id="sell" type="number" placeholder="0.00" />
            <Button
              icon="hugeicons:arrow-down-01"
              variant="secondary"
              onClick={() => setTokenModalOpen(true)}
            >
              {selectedToken && (
                <span className={s.tokenButtonContent}>
                  {(() => {
                    const logo =
                      tokenData[selectedToken.symbol.toLowerCase()]?.logo
                    return logo ? (
                      <Image
                        src={logo}
                        alt={selectedToken.symbol}
                        width={20}
                        height={20}
                        className={s.tokenButtonIcon}
                      />
                    ) : (
                      <Symbol
                        icon={getAssetIcon(selectedToken.symbol)}
                        color={getAssetColor(selectedToken.symbol)}
                        className={s.tokenButtonIcon}
                      />
                    )
                  })()}
                  <span>{selectedToken.symbol}</span>
                </span>
              )}
              {!selectedToken && "Select Token"}
            </Button>
          </div>
          <div className={s.bottom}>$0.00</div>
        </div>
        <div className={s.actions}>
          <Button
            icon="hugeicons:arrow-data-transfer-vertical"
            variant="secondary"
          />
          <Button
            icon="hugeicons:settings-02"
            variant="secondary"
            onClick={() => setSlippageModalOpen(true)}
          />
          <Tunnel className={s.tunnel} />
        </div>
        <div className={s.field}>
          <label htmlFor="buy">Buy</label>
          <div className={s.middle}>
            <input type="number" placeholder="0.00" id="buy" />
            <Button
              icon="hugeicons:arrow-down-01"
              variant="secondary"
              onClick={() => setEtfModalOpen(true)}
            >
              {selectedETF?.symbol || "Select ETF"}
            </Button>
          </div>
          <div className={s.bottom}>$0.00</div>
        </div>
        <Button className={s.start}>Start now</Button>
      </Card>
      <TokenSelectModal
        open={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
        onSelect={handleTokenSelect}
        tokens={MOCK_TOKENS}
        tokenData={tokenData}
      />
      <ETFSelectModal
        open={etfModalOpen}
        onClose={() => setEtfModalOpen(false)}
        onSelect={handleETFSelect}
        etfs={etfs}
        tokenData={tokenData}
      />

      <SlippageModal
        open={slippageModalOpen}
        onClose={() => setSlippageModalOpen(false)}
        onConfirm={setSlippage}
        initialSlippage={slippage}
      />
    </div>
  )
}
