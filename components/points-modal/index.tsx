"use client"

import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import { Modal } from "@/components/modal"
// import { SeasonTabs } from "@/components/season-tabs"
import { useAppStore } from "@/stores/app"
import { fetchUserTotalPoints } from "@/helpers/request"
import { useAccount } from "wagmi"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"
import { BorderAnimate } from "../border-animate"
import s from "./points-modal.module.scss"

export const PointsModal = () => {
  const [activeTab/*, setActiveTab*/] = useState<"season1" | "season2" | "season3">(
    "season1"
  )

  const { setPointsModalOpen, pointsModalOpen } = useAppStore()
  const { address, isConnected } = useAccount()

  const { data: pointsData, isLoading } = useQuery({
    queryKey: ["userTotalPoints", address],
    queryFn: () => {
      if (!address) throw new Error("No address provided")
      return fetchUserTotalPoints(address)
    },
    enabled: !!address && isConnected,
    refetchInterval: 30000,
    staleTime: 10000
  })

  const points = pointsData?.data?.totalPoints ?? 0

  const seasonData = {
    season1: {
      label: "Season 1",
      status: "Active",
      points: points,
      description:
        "Season 1 is now complete. View the leaderboard to see final rankings."
    },
    season2: {
      label: "Season 2",
      status: "Not Started",
      points: 0,
      description: "Season 2 has concluded."
    },
    season3: {
      label: "Season 3",
      status: "Not Started",
      points: 0,
      description: "Season 3 is currently in progress."
    }
  }

  // const seasonLabels = {
  //   season1: { label: "Season 1", status: "Active" },
  //   season2: { label: "Season 2", status: "Not Started" },
  //   season3: { label: "Season 3", status: "Not Started" }
  // }

  const currentSeason = seasonData[activeTab]

  const handleClose = () => {
    setPointsModalOpen(false)
  }

  return (
    <Modal open={pointsModalOpen} onClose={handleClose} title="Helios points">
      <div className={s.content}>
        {/* <SeasonTabs
          seasons={seasonLabels}
          activeSeason={activeTab}
          onSeasonChange={(season) => setActiveTab(season as typeof activeTab)}
          disabledSeasons={["season2", "season3"]}
          className={s.seasonTabs}
        /> */}

        <div className={s.seasonContent}>
          <div className={s.pointsSection}>
            <h3 className={s.sectionTitle}>Points</h3>
            <div className={s.pointsValue}>
              {isLoading
                ? "..."
                : currentSeason.points.toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  })}
            </div>
            <BorderAnimate />
          </div>
          <div className={s.descriptionSection}>
            <p className={s.description}>{currentSeason.description}</p>
          </div>
        </div>

        <div className={s.footer}>
          <Link
            href="/leaderboard"
            className={s.leaderboardLink}
            onClick={handleClose}
          >
            <Button variant="primary" className={s.leaderboardButton}>
              <Icon icon="hugeicons:ranking" />
              <span>Leaderboard</span>
            </Button>
          </Link>
        </div>

        <div className={s.termsSection}>
          <Button variant="secondary" border isNav={true}>
            <span>Terms and Service ↗</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
