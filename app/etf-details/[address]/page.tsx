"use client"

import { useParams } from "next/navigation"
import { AboutSection } from "./(components)/about-section"
import { BasketGovernance } from "./(components)/basket-governance"
import { Disclosures } from "./(components)/disclosures"
import { PriceChart } from "./(components)/price-chart"
import { TokenComposition } from "./(components)/token-composition"
import { BuySellSidebar } from "./(components)/buy-sell-sidebar"
import { CHAIN_CONFIG } from "@/config/chain-config"
import s from "./page.module.scss"

const fakeETFData = {
  id: "helios-defi-basket",
  name: "Helios DeFi Basket",
  symbol: "HDEFI",
  description: "The Helios DeFi Basket (HDEFI) provides diversified exposure to leading decentralized finance protocols. This ETF focuses on blue-chip DeFi tokens with strong fundamentals, active development, and proven track records in lending, DEXs, and yield optimization.",
  tvl: 2847320,
  totalSupply: "18420",
  sharePrice: "154.58",
  volumeTradedUSD: 892000,
  dailyVolumeUSD: 67500,
  depositCount: 234,
  redeemCount: 112,
  createdAt: "2024-08-15T00:00:00.000Z",
  updatedAt: "2024-12-17T00:00:00.000Z",
  chain: 42161,
  vault: "0x7a3c5e8b2d1f9a4c6e8b0d2f4a6c8e0b2d4f6a8c",
  pricer: "0x3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c",
  shareToken: "0x9c1e3a5b7d2f4e6a8c0b2d4f6e8a0c2e4b6d8f0a",
  depositToken: "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3",
  depositSymbol: "USDC",
  depositDecimals: 6,
  website: "https://helios.finance",
  tags: ["DeFi", "Yield", "Blue Chip", "Lending"],
  latestRebalanceDate: "2024-12-10T14:45:00.000Z",
  tokens: [
    { symbol: "UNI", percentage: 22.5, tvl: "640500" },
    { symbol: "AAVE", percentage: 18.3, tvl: "521000" },
    { symbol: "MKR", percentage: 15.7, tvl: "447000" },
    { symbol: "CRV", percentage: 12.4, tvl: "353000" },
    { symbol: "LINK", percentage: 10.8, tvl: "307500" },
    { symbol: "SNX", percentage: 8.2, tvl: "233500" },
    { symbol: "COMP", percentage: 6.5, tvl: "185000" },
    { symbol: "SUSHI", percentage: 5.6, tvl: "159320" }
  ]
}

export default function ETFDetailsPage() {
  const params = useParams()
  const etf = fakeETFData
  const chainConfig = CHAIN_CONFIG[etf.chain]
  const isCreator = true // TODO: Replace with actual creator check based on wallet address

  return (
    <div className={s.page}>
      <div className={s.container}>
        <div className={s.mainContent}>
          <div className={s.header}>
            <div className={s.titleSection}>
              <h1 className={s.title}>{etf.name}</h1>
              <div className={s.priceInfo}>
                <span className={s.price}>${etf.sharePrice}</span>
                <span className={s.priceChange}>-9.38% (7d)</span>
              </div>
            </div>
          </div>

          <PriceChart etf={etf} />

          <TokenComposition etf={etf} />

          <AboutSection 
            etf={etf}
            isCreator={isCreator}
            chainConfig={chainConfig}
          />
          
          <BasketGovernance 
            etf={etf}
            chainConfig={chainConfig}
          />
          
          <Disclosures />
        </div>

        <aside className={s.sidebar}>
          <BuySellSidebar etf={etf} />
        </aside>
      </div>
    </div>
  )
}
