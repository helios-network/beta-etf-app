"use client"

import { Link } from "@/components/link"
import { Logotype } from "@/components/logotype"
import { Button } from "@/components/button"
import { SettingsModal } from "@/components/settings-modal"
import { PointsButton } from "@/components/points-button"
import { PointsModal } from "@/components/points-modal"
import routes from "@/config/routes"
import { Chains } from "../chains"
import { Nav } from "../nav"
import { Wallet } from "../wallet"
import s from "./header.module.scss"
import { useState } from "react"

export const Header = () => {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pointsModalOpen, setPointsModalOpen] = useState(false)

  const handleSettingsOpen = () => {
    setSettingsOpen(true)
  }

  const handleSettingsClose = () => {
    setSettingsOpen(false)
  }

  const handlePointsModalOpen = () => {
    setPointsModalOpen(true)
  }

  const handlePointsModalClose = () => {
    setPointsModalOpen(false)
  }

  const currentPoints = 2261.01

  return (
    <>
      <header className={s.header}>
        <Link className={s.logotype} href={routes.home}>
          <Logotype />
        </Link>
        <Nav />
        <div className={s.right}>
          <Button
            variant="secondary"
            icon="hugeicons:settings-02"
            border
            onClick={handleSettingsOpen}
            title="Settings"
          />
          <Chains />
          <PointsButton 
            points={currentPoints} 
            onClick={handlePointsModalOpen}
          />
          <Wallet />
        </div>
      </header>

      <SettingsModal open={settingsOpen} onClose={handleSettingsClose} />
      <PointsModal 
        open={pointsModalOpen} 
        onClose={handlePointsModalClose}
        points={currentPoints}
      />
    </>
  )
}
