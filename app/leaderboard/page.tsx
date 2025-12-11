"use client"

import { useState, useEffect } from "react"
import { Icon } from "@/components/icon"
import { Input } from "@/components/input"
import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import { fetchLeaderboard } from "@/helpers/request"
import type { LeaderboardEntry } from "@/types/points"
import { truncateAddress } from "@/lib/utils"
import s from "./leaderboard.module.scss"

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"season1" | "season2" | "season3">("season1")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pageSize = 25

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetchLeaderboard(currentPage, pageSize)
        setLeaderboardData(response.data)
        setTotalPages(response.pagination.totalPages)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leaderboard")
        setLeaderboardData([])
      } finally {
        setIsLoading(false)
      }
    }

    loadLeaderboard()
  }, [currentPage])

  const filteredData = leaderboardData.filter(entry =>
    entry.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const seasonLabels = {
    season1: { label: "Season 1", status: "Active" },
    season2: { label: "Season 2", status: "Not Started" },
    season3: { label: "Season 3", status: "Not Started" }
  }

  return (
    <div className={s.leaderboard}>
      <div className={s.container}>
        <Card className={s.mainCard}>
          <div className={s.headingWrapper}>
            <Heading
              icon="hugeicons:star"
              title="Points Leaderboard"
              description="Top performers in deBridge points accumulation"
            />
          </div>

          <div className={s.tabsContainer}>
            <div className={s.tabs}>
              {(["season1", "season2", "season3"] as const).map((season) => {
                const isDisabled = season !== "season1"
                return (
                  <button
                    key={season}
                    className={`${s.tab} ${activeTab === season ? s.active : ""} ${isDisabled ? s.disabled : ""}`}
                    onClick={() => {
                      if (!isDisabled) {
                        setActiveTab(season)
                        setCurrentPage(1)
                      }
                    }}
                    disabled={isDisabled}
                  >
                    <span className={s.seasonLabel}>{seasonLabels[season].label}</span>
                    {seasonLabels[season].status && (
                      <span className={`${s.status} ${seasonLabels[season].status === "Active" ? s.active : ""}`}>
                        {seasonLabels[season].status}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={s.content}>
            <div className={s.filterCardContent}>
              <div className={s.filterGrid}>
                <div className={s.searchWrapper}>
                  <Input
                    icon="hugeicons:search-01"
                    placeholder="Search leaderboard by address..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className={s.searchInput}
                  />
                </div>
              </div>
            </div>

            <div className={s.tableWrapper}>
              {isLoading ? (
                <div className={s.loadingState}>
                  <Icon icon="hugeicons:loading-01" />
                  <p>Loading leaderboard...</p>
                </div>
              ) : error ? (
                <div className={s.errorState}>
                  <Icon icon="hugeicons:alert-circle" />
                  <p>{error}</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className={s.emptyState}>
                  <Icon icon="hugeicons:search-01" />
                  <p>No results found</p>
                </div>
              ) : (
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th className={s.rankCol}>Rank</th>
                      <th className={s.addressCol}>Address</th>
                      <th className={s.pointsCol}>Total Points accrued</th>
                      <th className={s.volumeCol}>Volume traded</th>
                      <th className={s.transactionsCol}>Transactions performed</th>
                      <th className={s.tvlCol}>TVL</th>
                      <th className={s.lastActivityCol}>Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((entry) => (
                      <tr key={entry.address} className={s.row}>
                        <td className={s.rankCol}>
                          <span className={s.rankBadge}>{entry.rank}</span>
                        </td>
                        <td className={s.addressCol}>
                          <span className={s.address}>{truncateAddress(entry.address)}</span>
                        </td>
                        <td className={s.pointsCol}>
                          <span className={s.points}>
                            {Number(entry.totalPointsAccrued).toLocaleString("en-US", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2
                            })}
                          </span>
                        </td>
                        <td className={s.volumeCol}>
                          {parseFloat(entry.volumeTraded).toLocaleString("en-US", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          })}
                        </td>
                        <td className={s.transactionsCol}>{entry.transactionsPerformed}</td>
                        <td className={s.tvlCol}>
                          {entry.tvl ? `$${entry.tvl.toLocaleString("en-US", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          })}` : "-"}
                        </td>
                        <td className={s.lastActivityCol}>
                          {entry.lastActivity 
                            ? new Date(entry.lastActivity).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

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
                  const pageNum = i + 1
                  return (
                    <button
                      key={pageNum}
                      className={`${s.pageButton} ${currentPage === pageNum ? s.active : ""}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                {totalPages > 5 && <span className={s.ellipsis}>...</span>}
                {totalPages > 5 && (
                  <button
                    className={`${s.pageButton} ${currentPage === totalPages ? s.active : ""}`}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </button>
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
          </div>
        </Card>
      </div>
    </div>
  )
}
