"use client"

import { Modal } from "@/components/modal"
import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import Link from "next/link"
import { useState } from "react"
import s from "./points-modal.module.scss"

interface PointsModalProps {
  open: boolean
  onClose: () => void
  points: number
}

export const PointsModal = ({ open, onClose, points }: PointsModalProps) => {
  const [activeTab, setActiveTab] = useState<"season1" | "season2" | "season3">("season1")

  const seasonData = {
    season1: {
      label: "Season 1",
      status: "Ended",
      points: points,
      description: "Season 1 is now complete. View the leaderboard to see final rankings."
    },
    season2: {
      label: "Season 2",
      status: "Ended",
      points: 0,
      description: "Season 2 has concluded."
    },
    season3: {
      label: "Season 3",
      status: "Active",
      points: 0,
      description: "Season 3 is currently in progress."
    }
  }

  const currentSeason = seasonData[activeTab]

  return (
    <Modal open={open} onClose={onClose} title="deBridge points">
      <div className={s.content}>
        <div className={s.tabsContainer}>
          <div className={s.tabs}>
            {(["season1", "season2", "season3"] as const).map((season) => (
              <button
                key={season}
                className={`${s.tab} ${activeTab === season ? s.active : ""}`}
                onClick={() => setActiveTab(season)}
              >
                <span className={s.seasonLabel}>{seasonData[season].label}</span>
                {seasonData[season].status && (
                  <span className={s.status}>{seasonData[season].status}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className={s.seasonContent}>
          <div className={s.pointsSection}>
            <h3 className={s.sectionTitle}>Points</h3>
            <div className={s.pointsValue}>
              {currentSeason.points.toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
              })}
            </div>
          </div>

          <div className={s.descriptionSection}>
            <p className={s.description}>{currentSeason.description}</p>
          </div>
        </div>

        <div className={s.footer}>
          <Link href="/leaderboard" className={s.leaderboardLink} onClick={onClose}>
            <Button variant="primary" className={s.leaderboardButton}>
              <Icon icon="hugeicons:trophy-01" />
              <span>Leaderboard</span>
            </Button>
          </Link>
        </div>

        <div className={s.termsSection}>
          <Button variant="secondary" border isNav={true}>
            <Icon icon="hugeicons:arrow-up-right-01" />
            <span>Terms and Service</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
