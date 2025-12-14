"use client"

import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import { useAppStore } from "@/stores/app"
import { BorderAnimate } from "../border-animate"
import s from "./points-button.module.scss"

export const PointsButton = () => {
  const { setPointsModalOpen, points } = useAppStore()
  const multiplier = 1.1

  const handleOpenPointsModal = () => {
    setPointsModalOpen(true)
  }

  return (
    <Button
      className={s.button}
      onClick={handleOpenPointsModal}
      variant="secondary"
      data-button-points
    >
      <div className={s.content}>
        <Icon icon="hugeicons:trophy" className={s.icon} />
        <span className={s.text}>
          {points.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })}
        </span>
        <span className={s.multiplier}>{multiplier.toFixed(1)}x</span>
      </div>
      <BorderAnimate />
    </Button>
  )
}
