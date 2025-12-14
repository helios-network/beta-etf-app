"use client"

import clsx from "clsx"
import s from "./season-tabs.module.scss"

export interface SeasonData {
  label: string
  status: string | null
}

interface SeasonTabsProps {
  seasons: Record<string, SeasonData>
  activeSeason: string
  onSeasonChange: (season: string) => void
  disabledSeasons?: string[]
  className?: string
}

export function SeasonTabs({
  seasons,
  activeSeason,
  onSeasonChange,
  disabledSeasons = [],
  className
}: SeasonTabsProps) {
  return (
    <div className={clsx(s.tabsContainer, className && "seasonTabs")}>
      <div className={s.tabs}>
        {Object.entries(seasons).map(([key, data]) => {
          const isDisabled = disabledSeasons.includes(key)
          const isActive = activeSeason === key
          const isStatusActive = data.status === "Active"

          return (
            <button
              key={key}
              className={clsx(
                s.tab,
                isActive && s.active,
                isDisabled && s.disabled
              )}
              onClick={() => !isDisabled && onSeasonChange(key)}
              disabled={isDisabled}
            >
              <span className={s.seasonLabel}>{data.label}</span>
              {data.status && (
                <span
                  className={clsx(s.status, isStatusActive && s.active)}
                >
                  {data.status}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

