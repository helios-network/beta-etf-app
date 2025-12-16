"use client"

import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import { useAppStore } from "@/stores/app"
import { fetchUserTotalPoints } from "@/helpers/request"
import { useAccount } from "wagmi"
import { useQuery } from "@tanstack/react-query"
import { BorderAnimate } from "../border-animate"
import s from "./points-button.module.scss"

export const PointsButton = () => {
  const { setPointsModalOpen } = useAppStore()
  const { address, isConnected } = useAccount()
  const multiplier = 1.1

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
          {isLoading
            ? "..."
            : points.toLocaleString("en-US", {
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
