"use client"

import { useState, useMemo } from "react"
import { Icon } from "@/components/icon"
import { Input } from "@/components/input"
import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import { generateLeaderboardData } from "@/lib/faker"
import { truncateAddress } from "@/lib/utils"
import s from "./leaderboard.module.scss"

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"season1" | "season2" | "season3">("season1")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  const allLeaderboardData = useMemo(() => generateLeaderboardData(100), [])

  const filteredData = useMemo(() => {
    return allLeaderboardData.filter(entry =>
      entry.address.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm, allLeaderboardData])

  const totalPages = Math.ceil(filteredData.length / pageSize)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
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
              <table className={s.table}>
                <thead>
                  <tr>
                    <th className={s.rankCol}>Rank</th>
                    <th className={s.addressCol}>Address</th>
                    <th className={s.pointsCol}>Total Points accrued</th>
                    <th className={s.feesCol}>Fees generated</th>
                    <th className={s.volumeCol}>Volume traded</th>
                    <th className={s.transactionsCol}>Transactions performed</th>
                    <th className={s.referralCol}>Referral points</th>
                    <th className={s.iaaStCol}>IaaS points</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((entry) => (
                    <tr key={entry.address} className={s.row}>
                      <td className={s.rankCol}>
                        <span className={s.rankBadge}>{entry.rank}</span>
                      </td>
                      <td className={s.addressCol}>
                        <span className={s.address}>{truncateAddress(entry.address)}</span>
                      </td>
                      <td className={s.pointsCol}>
                        <span className={s.points}>
                          {entry.totalPointsAccrued.toLocaleString("en-US", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </td>
                      <td className={s.feesCol}>{entry.feesGenerated}</td>
                      <td className={s.volumeCol}>{entry.volumeTraded}</td>
                      <td className={s.transactionsCol}>{entry.transactionsPerformed}</td>
                      <td className={s.referralCol}>{entry.referralPoints}</td>
                      <td className={s.iaaStCol}>{entry.iaaStPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
