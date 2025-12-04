"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import { Badge } from "@/components/badge"
import { Input } from "@/components/input"
import { Select } from "@/components/input/select"
import { useAccount, useChainId } from "wagmi"
import { ETHEREUM_NETWORK_ID } from "@/config/app"
import { useRouter } from "next/navigation"
import { useState, useMemo } from "react"
import { toast } from "sonner"
import s from "./page.module.scss"

interface ETF {
  id: string
  name: string
  symbol: string
  description: string
  tvl: string
  apy: string
  change24h: number
  riskLevel: "low" | "medium" | "high"
  category: string
  tokens: Array<{
    symbol: string
    percentage: number
  }>
  price: string
}

const HARDCODED_ETFS: ETF[] = [
  {
    id: "1",
    name: "Blue Chip DeFi",
    symbol: "DEFI",
    description: "Top 5 DeFi protocol tokens",
    tvl: "$2.5M",
    apy: "8.5%",
    change24h: 2.34,
    riskLevel: "medium",
    category: "DeFi",
    tokens: [
      { symbol: "AAVE", percentage: 25 },
      { symbol: "UNI", percentage: 25 },
      { symbol: "CURVE", percentage: 20 },
      { symbol: "MKR", percentage: 20 },
      { symbol: "COMP", percentage: 10 }
    ],
    price: "$1,234.50"
  },
  {
    id: "2",
    name: "Layer 2 Leaders",
    symbol: "L2LDR",
    description: "Layer 2 scaling solution tokens",
    tvl: "$1.8M",
    apy: "12.3%",
    change24h: 5.67,
    riskLevel: "high",
    category: "L2 Solutions",
    tokens: [
      { symbol: "ARB", percentage: 35 },
      { symbol: "OP", percentage: 35 },
      { symbol: "STRK", percentage: 20 },
      { symbol: "ZK", percentage: 10 }
    ],
    price: "$856.25"
  },
  {
    id: "3",
    name: "Stablecoin Mix",
    symbol: "STABLE",
    description: "Diversified stablecoin portfolio",
    tvl: "$5.2M",
    apy: "4.2%",
    change24h: 0.05,
    riskLevel: "low",
    category: "Stablecoins",
    tokens: [
      { symbol: "USDC", percentage: 40 },
      { symbol: "USDT", percentage: 40 },
      { symbol: "DAI", percentage: 20 }
    ],
    price: "$1.02"
  },
  {
    id: "4",
    name: "Emerging Assets",
    symbol: "EMRG",
    description: "Up-and-coming blockchain projects",
    tvl: "$900K",
    apy: "18.7%",
    change24h: 8.92,
    riskLevel: "high",
    category: "Emerging",
    tokens: [
      { symbol: "OP", percentage: 25 },
      { symbol: "DYDX", percentage: 25 },
      { symbol: "GRT", percentage: 25 },
      { symbol: "ENS", percentage: 25 }
    ],
    price: "$456.78"
  },
  {
    id: "5",
    name: "NFT & Metaverse",
    symbol: "NFTMV",
    description: "Leading NFT and metaverse tokens",
    tvl: "$1.2M",
    apy: "6.8%",
    change24h: 3.21,
    riskLevel: "high",
    category: "NFT",
    tokens: [
      { symbol: "ENJ", percentage: 30 },
      { symbol: "SAND", percentage: 25 },
      { symbol: "MANA", percentage: 25 },
      { symbol: "FLOW", percentage: 20 }
    ],
    price: "$234.56"
  },
  {
    id: "6",
    name: "CEX & Trading",
    symbol: "CEX",
    description: "Centralized exchange and trading tokens",
    tvl: "$3.1M",
    apy: "7.2%",
    change24h: 1.45,
    riskLevel: "medium",
    category: "Exchange",
    tokens: [
      { symbol: "BNB", percentage: 35 },
      { symbol: "FTT", percentage: 30 },
      { symbol: "OKB", percentage: 20 },
      { symbol: "KCS", percentage: 15 }
    ],
    price: "$890.12"
  },
  {
    id: "7",
    name: "Infrastructure Stack",
    symbol: "INFRA",
    description: "Blockchain infrastructure and tooling",
    tvl: "$2.0M",
    apy: "9.5%",
    change24h: 4.56,
    riskLevel: "medium",
    category: "Infrastructure",
    tokens: [
      { symbol: "THE", percentage: 25 },
      { symbol: "ICP", percentage: 25 },
      { symbol: "LINK", percentage: 25 },
      { symbol: "ARK", percentage: 25 }
    ],
    price: "$567.89"
  },
  {
    id: "8",
    name: "Yield Farming",
    symbol: "YIELD",
    description: "High-yield farming protocol tokens",
    tvl: "$1.5M",
    apy: "22.3%",
    change24h: 6.78,
    riskLevel: "high",
    category: "Yield",
    tokens: [
      { symbol: "AAVE", percentage: 30 },
      { symbol: "COMP", percentage: 25 },
      { symbol: "YGG", percentage: 25 },
      { symbol: "SUSHI", percentage: 20 }
    ],
    price: "$345.67"
  },
  {
    id: "9",
    name: "Privacy & Security",
    symbol: "PRIV",
    description: "Privacy-focused and security tokens",
    tvl: "$800K",
    apy: "11.2%",
    change24h: 2.89,
    riskLevel: "medium",
    category: "Privacy",
    tokens: [
      { symbol: "ZEC", percentage: 30 },
      { symbol: "MONERO", percentage: 30 },
      { symbol: "SECRET", percentage: 20 },
      { symbol: "MASK", percentage: 20 }
    ],
    price: "$123.45"
  },
  {
    id: "10",
    name: "Governance Basket",
    symbol: "GOV",
    description: "DAO and governance tokens portfolio",
    tvl: "$2.3M",
    apy: "5.9%",
    change24h: 1.23,
    riskLevel: "low",
    category: "Governance",
    tokens: [
      { symbol: "MKR", percentage: 25 },
      { symbol: "AAVE", percentage: 25 },
      { symbol: "UNI", percentage: 25 },
      { symbol: "COMP", percentage: 25 }
    ],
    price: "$678.90"
  }
]

export default function ETFList() {
  const chainId = useChainId()
  const { address } = useAccount()
  const router = useRouter()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedRisk, setSelectedRisk] = useState("all")
  const [sortBy, setSortBy] = useState("tvl")

  const isEthereumNetwork = chainId === ETHEREUM_NETWORK_ID
  const isWalletConnected = !!address

  const categories = ["all", ...new Set(HARDCODED_ETFS.map(etf => etf.category))]
  const riskLevels = ["all", "low", "medium", "high"]

  const filteredAndSortedETFs = useMemo(() => {
    const filtered = HARDCODED_ETFS.filter(etf => {
      const matchesSearch = etf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          etf.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          etf.description.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = selectedCategory === "all" || etf.category === selectedCategory
      const matchesRisk = selectedRisk === "all" || etf.riskLevel === selectedRisk
      
      return matchesSearch && matchesCategory && matchesRisk
    })

    return filtered.sort((a, b) => {
      if (sortBy === "apy") {
        return parseFloat(b.apy) - parseFloat(a.apy)
      } else if (sortBy === "change24h") {
        return b.change24h - a.change24h
      } else if (sortBy === "tvl") {
        const tvlA = parseFloat(a.tvl.replace(/[^0-9.]/g, ''))
        const tvlB = parseFloat(b.tvl.replace(/[^0-9.]/g, ''))
        return tvlB - tvlA
      }
      return 0
    })
  }, [searchTerm, selectedCategory, selectedRisk, sortBy])

  const handleBuy = (etf: ETF) => {
    if (!isWalletConnected) {
      toast.error("Please connect your wallet first")
      return
    }
    if (!isEthereumNetwork) {
      toast.error("Please switch to Ethereum network")
      return
    }
    toast.success(`Buy ${etf.symbol} - Smart contract integration coming soon`)
  }

  const handleSell = (etf: ETF) => {
    if (!isWalletConnected) {
      toast.error("Please connect your wallet first")
      return
    }
    if (!isEthereumNetwork) {
      toast.error("Please switch to Ethereum network")
      return
    }
    toast.success(`Sell ${etf.symbol} - Smart contract integration coming soon`)
  }

  const handleMint = (etf: ETF) => {
    if (!isWalletConnected) {
      toast.error("Please connect your wallet first")
      return
    }
    if (!isEthereumNetwork) {
      toast.error("Please switch to Ethereum network")
      return
    }
    router.push(`/etf-mint?etfId=${etf.id}&symbol=${etf.symbol}`)
  }

  const handleWithdraw = (etf: ETF) => {
    if (!isWalletConnected) {
      toast.error("Please connect your wallet first")
      return
    }
    if (!isEthereumNetwork) {
      toast.error("Please switch to Ethereum network")
      return
    }
    router.push(`/etf-withdraw?etfId=${etf.id}&symbol=${etf.symbol}`)
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "success"
      case "medium":
        return "primary"
      case "high":
        return "danger"
      default:
        return "primary"
    }
  }

  return (
    <div className={s.etfList}>
      <div className={s.container}>
        <div className={s.statsHeader}>
          <div className={s.stat}>
            <span className={s.label}>Total ETFs</span>
            <span className={s.statValue}>{filteredAndSortedETFs.length}</span>
          </div>
          <div className={s.stat}>
            <span className={s.label}>Total TVL</span>
            <span className={s.statValue}>${(filteredAndSortedETFs.reduce((sum, etf) => sum + parseFloat(etf.tvl.replace(/[^0-9.]/g, '')), 0)).toFixed(2)}M</span>
          </div>
          <div className={s.stat}>
            <span className={s.label}>Avg APY</span>
            <span className={s.statValue}>{(filteredAndSortedETFs.reduce((sum, etf) => sum + parseFloat(etf.apy), 0) / filteredAndSortedETFs.length || 0).toFixed(2)}%</span>
          </div>
        </div>

        <Card className={s.mainCard}>
          <div className={s.headingWrapper}>
            <Heading
              icon="hugeicons:store-01"
              title="ETF Marketplace"
              description="Browse and trade available ETF baskets. Buy, sell, mint, or withdraw your positions."
            />
          </div>

          {!isEthereumNetwork && isWalletConnected && (
            <div className={s.networkWarning}>
              <Icon icon="hugeicons:alert-circle" />
              <span>Please switch to Ethereum network to trade ETFs</span>
            </div>
          )}

          <div className={s.filterCardContent}>
            <div className={s.filterGrid}>
              <div className={s.searchWrapper}>
                <Input
                  icon="hugeicons:search-01"
                  placeholder="Search ETFs by name, symbol or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={s.searchInput}
                />
              </div>

              <Select
                options={categories.map(cat => ({
                  value: cat,
                  label: cat.charAt(0).toUpperCase() + cat.slice(1)
                }))}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              />

              <Select
                options={riskLevels.map(risk => ({
                  value: risk,
                  label: risk.charAt(0).toUpperCase() + risk.slice(1)
                }))}
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
              />

              <Select
                options={[
                  { value: "tvl", label: "Sort by TVL" },
                  { value: "apy", label: "Sort by APY" },
                  { value: "change24h", label: "Sort by 24h Change" }
                ]}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              />
            </div>
          </div>

          {filteredAndSortedETFs.length === 0 ? (
            <div className={s.emptyState}>
              <Icon icon="hugeicons:inbox-01" className={s.emptyIcon} />
              <h3>No ETFs Found</h3>
              <p>Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className={s.etfsGrid}>
              {filteredAndSortedETFs.map((etf) => (
                <Card key={etf.id} className={s.etfCard}>
                <div className={s.cardHeader}>
                  <div className={s.etfTitle}>
                    <h3>{etf.name}</h3>
                    <span className={s.symbol}>{etf.symbol}</span>
                  </div>
                  <div className={s.badges}>
                    <Badge status={getRiskColor(etf.riskLevel)}>
                      {etf.riskLevel.toUpperCase()}
                    </Badge>
                    <Badge status="primary">
                      {etf.category}
                    </Badge>
                  </div>
                </div>

                <p className={s.description}>{etf.description}</p>

                <div className={s.metricsGrid}>
                  <div className={s.metric}>
                    <span className={s.metricLabel}>TVL</span>
                    <span className={s.metricValue}>{etf.tvl}</span>
                  </div>
                  <div className={s.metric}>
                    <span className={s.metricLabel}>APY</span>
                    <span className={`${s.metricValue} ${s.positive}`}>{etf.apy}</span>
                  </div>
                  <div className={s.metric}>
                    <span className={s.metricLabel}>24h Change</span>
                    <span className={`${s.metricValue} ${etf.change24h >= 0 ? s.positive : s.negative}`}>
                      {etf.change24h >= 0 ? "+" : ""}{etf.change24h.toFixed(2)}%
                    </span>
                  </div>
                  <div className={s.metric}>
                    <span className={s.metricLabel}>Price</span>
                    <span className={s.metricValue}>{etf.price}</span>
                  </div>
                </div>

                <div className={s.composition}>
                  <h4>Composition ({etf.tokens.length} tokens)</h4>
                  <div className={s.tokens}>
                    {etf.tokens.map((token) => (
                      <div key={token.symbol} className={s.token}>
                        <span className={s.tokenSymbol}>{token.symbol}</span>
                        <div className={s.percentageBar}>
                          <div
                            className={s.percentageFill}
                            style={{ width: `${token.percentage}%` }}
                          />
                        </div>
                        <span className={s.percentage}>{token.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={s.actions}>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => handleBuy(etf)}
                    disabled={!isWalletConnected || !isEthereumNetwork}
                    iconLeft="hugeicons:download-01"
                  >
                    Buy
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleSell(etf)}
                    disabled={!isWalletConnected || !isEthereumNetwork}
                    iconLeft="hugeicons:upload-01"
                  >
                    Sell
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleMint(etf)}
                    disabled={!isWalletConnected || !isEthereumNetwork}
                    iconLeft="hugeicons:plus-circle"
                  >
                    Mint
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleWithdraw(etf)}
                    disabled={!isWalletConnected || !isEthereumNetwork}
                    iconLeft="hugeicons:minus-circle"
                  >
                    Withdraw
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
        </Card>
      </div>
    </div>
  )
}
