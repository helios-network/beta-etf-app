"use client"

import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import s from "./points-button.module.scss"

interface PointsButtonProps {
  points: number
  onClick: () => void
}

export const PointsButton = ({ points, onClick }: PointsButtonProps) => {
  return (
    <Button
      className={s.button}
      onClick={onClick}
      variant="primary"
    >
      <div className={s.content}>
        <Icon icon="hugeicons:trophy-01" className={s.icon} />
        <span className={s.text}>
          {points.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })}
        </span>
      </div>
    </Button>
  )
}
