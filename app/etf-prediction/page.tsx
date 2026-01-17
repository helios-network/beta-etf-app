"use client"

import { BorderAnimate } from "@/components/border-animate"
import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { DataState } from "@/components/data-state"
import { Icon } from "@/components/icon"
import { Input } from "@/components/input"
import { Select } from "@/components/input/select"
import { Link } from "@/components/link"
import { routes } from "@/config/routes"
import clsx from "clsx"
import { useState, useMemo, useEffect } from "react"
import s from "./page.module.scss"

interface ExtendedPrediction {
  id: string
  token: string
  symbol: string
  question: string
  options: { label: string; value: string; percentage?: number }[]
  winningPercentage: number
  winningOption: string
  isLive: boolean
  volume: string
  icon: string
  questionType: "binary" | "multiple" | "range"
  expiryDate?: Date
}

function generateExtendedPredictions(): ExtendedPrediction[] {
  const now = new Date()
  
  return [
    {
      id: "eth-jan-15",
      token: "ETH",
      symbol: "Ethereum",
      question: "Ethereum Up or Down on January 15?",
      options: [
        { label: "Up", value: "up" },
        { label: "Down", value: "down" }
      ],
      winningPercentage: 21,
      winningOption: "Up",
      isLive: true,
      volume: "$28k",
      icon: "cryptocurrency:eth",
      questionType: "binary",
      expiryDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: "microstrategy-bitcoin",
      token: "MSTR",
      symbol: "MicroStrategy",
      question: "Will Microstrategy announce a Bitcoin purchase?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" }
      ],
      winningPercentage: 63,
      winningOption: "Yes",
      isLive: true,
      volume: "$42k",
      icon: "cryptocurrency:btc",
      questionType: "binary"
    },
    {
      id: "seeker-fdv",
      token: "SEEKER",
      symbol: "Seeker",
      question: "Seeker FDV above ___ one day after launch?",
      options: [
        { label: "$100M", value: "100m", percentage: 76 },
        { label: "$200M", value: "200m", percentage: 38 }
      ],
      winningPercentage: 76,
      winningOption: "$100M",
      isLive: false,
      volume: "$28k",
      icon: "hugeicons:chart-average",
      questionType: "multiple"
    },
    {
      id: "metamask-fdv",
      token: "METAMASK",
      symbol: "Metamask",
      question: "Metamask FDV above ___ one day after launch?",
      options: [
        { label: "$700M", value: "700m", percentage: 79 },
        { label: "$1B", value: "1b", percentage: 55 }
      ],
      winningPercentage: 79,
      winningOption: "$700M",
      isLive: false,
      volume: "$783k",
      icon: "logos:metamask-icon",
      questionType: "multiple"
    },
    {
      id: "eth-ath",
      token: "ETH",
      symbol: "Ethereum",
      question: "Ethereum all time high by ___?",
      options: [
        { label: "March 31, 2026", value: "march", percentage: 9 },
        { label: "June 30, 2026", value: "june", percentage: 30 }
      ],
      winningPercentage: 30,
      winningOption: "June 30, 2026",
      isLive: false,
      volume: "$331k",
      icon: "cryptocurrency:eth",
      questionType: "multiple"
    },
    {
      id: "btc-price",
      token: "BTC",
      symbol: "Bitcoin",
      question: "Will Bitcoin hit $80k or $150k first?",
      options: [
        { label: "80k", value: "80k" },
        { label: "150k", value: "150k" }
      ],
      winningPercentage: 77,
      winningOption: "80k",
      isLive: false,
      volume: "$902k",
      icon: "cryptocurrency:btc",
      questionType: "binary"
    },
    {
      id: "gold-eth",
      token: "GOLD",
      symbol: "Gold",
      question: "First to 5k: Gold or ETH?",
      options: [
        { label: "Gold", value: "gold" },
        { label: "ETH", value: "eth" }
      ],
      winningPercentage: 79,
      winningOption: "Gold",
      isLive: false,
      volume: "$942k",
      icon: "twemoji:coin",
      questionType: "binary"
    },
    {
      id: "paradex-fdv",
      token: "PARADEX",
      symbol: "Paradex",
      question: "Paradex FDV above ___ one day after launch?",
      options: [
        { label: "$300M", value: "300m", percentage: 73 },
        { label: "$500M", value: "500m", percentage: 42 }
      ],
      winningPercentage: 73,
      winningOption: "$300M",
      isLive: false,
      volume: "$186k",
      icon: "hugeicons:chart-medium",
      questionType: "multiple"
    },
    {
      id: "ethgas-token",
      token: "ETHGAS",
      symbol: "ETHGAS",
      question: "Will ETHGAS launch a token by ___?",
      options: [
        { label: "March 31, 2026", value: "march", percentage: 86 },
        { label: "June 30, 2026", value: "june", percentage: 95 }
      ],
      winningPercentage: 95,
      winningOption: "June 30, 2026",
      isLive: false,
      volume: "$221k",
      icon: "cryptocurrency:eth",
      questionType: "multiple"
    },
    {
      id: "btc-price-2",
      token: "BTC",
      symbol: "Bitcoin",
      question: "Will Bitcoin hit $80k or $100k first?",
      options: [
        { label: "80k", value: "80k" },
        { label: "100k", value: "100k" }
      ],
      winningPercentage: 22,
      winningOption: "80k",
      isLive: false,
      volume: "$86k",
      icon: "cryptocurrency:btc",
      questionType: "binary"
    },
    {
      id: "tempo-token",
      token: "TEMPO",
      symbol: "Tempo",
      question: "Will Tempo launch a token by ___ ?",
      options: [
        { label: "March 31, 2026", value: "march", percentage: 12 },
        { label: "June 30, 2026", value: "june", percentage: 33 }
      ],
      winningPercentage: 33,
      winningOption: "June 30, 2026",
      isLive: false,
      volume: "$603k",
      icon: "hugeicons:clock-01",
      questionType: "multiple"
    },
    {
      id: "satoshi-move",
      token: "BTC",
      symbol: "Bitcoin",
      question: "Will Satoshi move any Bitcoin in 2026?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" }
      ],
      winningPercentage: 6,
      winningOption: "Yes",
      isLive: false,
      volume: "$54k",
      icon: "cryptocurrency:btc",
      questionType: "binary"
    }
  ]
}

const PAGE_SIZE = 12

export default function PredictionListPage() {
  const [searchInput, setSearchInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [sortBy, setSortBy] = useState("percentage")
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)

  const predictions = useMemo(() => generateExtendedPredictions(), [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput)
      setCurrentPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, sortBy])

  const filteredPredictions = useMemo(() => {
    let filtered = predictions.filter((prediction) => {
      const matchesSearch =
        prediction.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prediction.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prediction.token.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = 
        filterStatus === "all" || 
        (filterStatus === "live" && prediction.isLive) ||
        (filterStatus === "upcoming" && !prediction.isLive) ||
        (filterStatus === "favorites" && favorites.has(prediction.id))

      return matchesSearch && matchesStatus
    })

    if (sortBy === "percentage") {
      filtered = filtered.sort((a, b) => b.winningPercentage - a.winningPercentage)
    } else if (sortBy === "volume") {
      filtered = filtered.sort((a, b) => {
        const volumeA = parseFloat(a.volume.replace(/[^0-9.]/g, ""))
        const volumeB = parseFloat(b.volume.replace(/[^0-9.]/g, ""))
        return volumeB - volumeA
      })
    }

    return filtered
  }, [predictions, searchTerm, filterStatus, sortBy, favorites])

  const totalPages = Math.ceil(filteredPredictions.length / PAGE_SIZE)
  const paginatedPredictions = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredPredictions.slice(startIndex, startIndex + PAGE_SIZE)
  }, [filteredPredictions, currentPage])

  function toggleFavorite(predictionId: string) {
    setFavorites((prev) => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(predictionId)) {
        newFavorites.delete(predictionId)
      } else {
        newFavorites.add(predictionId)
      }
      return newFavorites
    })
  }

  const liveCount = predictions.filter(p => p.isLive).length
  const upcomingCount = predictions.filter(p => !p.isLive).length

  return (
    <div className={s.page}>
      <div className={s.statsHeader}>
        <div className={s.stat}>
          <span className={s.label}>Total Markets</span>
          <span className={s.statValue}>{predictions.length}</span>
        </div>
        <div className={s.stat}>
          <span className={s.label}>Live Markets</span>
          <span className={s.statValue}>{liveCount}</span>
        </div>
        <div className={s.stat}>
          <span className={s.label}>Upcoming Markets</span>
          <span className={s.statValue}>{upcomingCount}</span>
        </div>
      </div>

      <div className={s.filterCardContent}>
        <div className={s.filterGrid}>
          <div className={s.searchWrapper}>
            <Input
              icon="hugeicons:search-01"
              placeholder="Search predictions by name or token..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={s.searchInput}
            />
          </div>

          <Select
            options={[
              { value: "all", label: "All Markets" },
              { value: "live", label: "Live Markets" },
              { value: "upcoming", label: "Upcoming Markets" },
              { value: "favorites", label: "Favorites" }
            ]}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          />

          <Select
            options={[
              { value: "percentage", label: "Sort by Percentage" },
              { value: "volume", label: "Sort by Volume" }
            ]}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          />
        </div>
      </div>

      {filteredPredictions.length === 0 ? (
        <DataState
          type="empty"
          message="No predictions found"
          icon="hugeicons:inbox-01"
        />
      ) : (
        <>
          <div className={s.predictionsGrid}>
            {paginatedPredictions.map((prediction) => {
              const isFavorite = favorites.has(prediction.id)
              const gaugePercentage = prediction.winningPercentage
              
              const getGaugeColorClass = (percentage: number) => {
                if (percentage >= 66) return s.gaugeGreen
                if (percentage >= 33) return s.gaugeOrange
                return s.gaugeRed
              }
              
              return (
                <Card key={prediction.id} className={s.predictionCard}>
                  <BorderAnimate className={s.hover} />
                  
                  <div className={s.cardHeader}>
                    <div className={s.titleRow}>
                      <div className={s.tokenIconWrapper}>
                        <Icon icon={prediction.icon} className={s.tokenIcon} />
                      </div>
                      <div className={s.titleContent}>
                        <Link href={routes.etfPrediction(prediction.token)} className={s.questionLink}>
                          <h3 className={s.question}>{prediction.question}</h3>
                        </Link>
                      </div>
                    </div>
                    
                    <div className={clsx(s.percentageWrapper, getGaugeColorClass(gaugePercentage))}>
                      <span className={s.percentageValue}>{prediction.winningPercentage}%</span>
                      <span className={s.percentageLabel}>{prediction.winningOption}</span>
                    </div>
                  </div>

                  <div className={s.optionsWrapper}>
                    <div className={s.binaryOptions}>
                      <button className={clsx(s.binaryButton, s.upButton)}>
                        Up
                      </button>
                      <button className={clsx(s.binaryButton, s.downButton)}>
                        Down
                      </button>
                    </div>
                  </div>

                  <div className={s.cardFooter}>
                    <div className={s.statusWrapper}>
                      {prediction.isLive ? (
                        <div className={s.liveIndicator}>
                          <span className={s.liveDot} />
                          <span>Live</span>
                        </div>
                      ) : (
                        <Link href={routes.etfPrediction(prediction.token)} className={s.viewMarketLink}>
                          View Market
                        </Link>
                      )}
                    </div>
                    
                    <button
                      className={clsx(s.bookmarkButton, isFavorite && s.isBookmarked)}
                      onClick={(e) => {
                        e.preventDefault()
                        toggleFavorite(prediction.id)
                      }}
                      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Icon icon={isFavorite ? "hugeicons:bookmark-check-02" : "hugeicons:bookmark-02"} />
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className={s.pagination}>
              <Button
                variant="secondary"
                icon="hugeicons:arrow-left-01"
                border
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              />

              <div className={s.pageNumbers}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      className={clsx(s.pageButton, currentPage === pageNum && s.active)}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className={s.ellipsis}>...</span>
                    <button
                      className={clsx(s.pageButton, currentPage === totalPages && s.active)}
                      onClick={() => setCurrentPage(totalPages)}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <Button
                variant="secondary"
                iconRight="hugeicons:arrow-right-01"
                border
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
