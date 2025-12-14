"use client"

import { Button } from "@/components/button"
import { DataState } from "@/components/data-state"
import { Heading } from "@/components/heading"
import { Input } from "@/components/input"
import { SeasonTabs } from "@/components/season-tabs"
import { fetchLeaderboard } from "@/helpers/request"
import { truncateAddress } from "@/lib/utils"
import type { LeaderboardEntry } from "@/types/points"
import { useEffect, useState } from "react"
import s from "./leaderboard.module.scss"

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"season1" | "season2" | "season3">(
    "season1"
  )
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
        setError(
          err instanceof Error ? err.message : "Failed to load leaderboard"
        )
        setLeaderboardData([])
      } finally {
        setIsLoading(false)
      }
    }

    loadLeaderboard()
  }, [currentPage])

  const filteredData = leaderboardData.filter((entry) =>
    entry.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const seasonLabels = {
    season1: { label: "Season 1", status: "Active" },
    season2: { label: "Season 2", status: "Not Started" },
    season3: { label: "Season 3", status: "Not Started" }
  }

  return (
    <>
      <div className={s.headingWrapper}>
        <Heading
          icon="hugeicons:star"
          title="Points Leaderboard"
          description="Top performers in deBridge points accumulation"
        />
      </div>

      <SeasonTabs
        seasons={seasonLabels}
        activeSeason={activeTab}
        onSeasonChange={(season) => {
          setActiveTab(season as typeof activeTab)
          setCurrentPage(1)
        }}
        disabledSeasons={["season2", "season3"]}
      />

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
            <DataState
              type="loading"
              message="Loading leaderboard..."
              background={false}
            />
          ) : error ? (
            <DataState type="error" message={error} background={false} />
          ) : filteredData.length === 0 ? (
            <DataState
              type="empty"
              message="No results found"
              background={false}
            />
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
                    <td className={s.rankCol} data-th="Rank">
                      <span className={s.rankBadge}>{entry.rank}</span>
                    </td>
                    <td className={s.addressCol} data-th="Address">
                      <span className={s.address}>
                        {truncateAddress(entry.address)}
                      </span>
                    </td>
                    <td className={s.pointsCol} data-th="Total Points accrued">
                      <span className={s.points}>
                        {Number(entry.totalPointsAccrued).toLocaleString(
                          "en-US",
                          {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          }
                        )}
                      </span>
                    </td>
                    <td className={s.volumeCol} data-th="Volume traded">
                      {parseFloat(entry.volumeTraded).toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td
                      className={s.transactionsCol}
                      data-th="Transactions performed"
                    >
                      {entry.transactionsPerformed}
                    </td>
                    <td className={s.tvlCol} data-th="TVL">
                      {entry.tvl
                        ? `$${entry.tvl.toLocaleString("en-US", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          })}`
                        : "-"}
                    </td>
                    <td className={s.lastActivityCol} data-th="Last Activity">
                      {entry.lastActivity
                        ? new Date(entry.lastActivity).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            }
                          )
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
                  className={`${s.pageButton} ${
                    currentPage === pageNum ? s.active : ""
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              )
            })}
            {totalPages > 5 && <span className={s.ellipsis}>...</span>}
            {totalPages > 5 && (
              <button
                className={`${s.pageButton} ${
                  currentPage === totalPages ? s.active : ""
                }`}
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
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
          />
        </div>
      </div>
    </>
  )
}
