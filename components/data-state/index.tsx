"use client"

import clsx from "clsx"
import { Icon } from "../icon"
import s from "./data-state.module.scss"

interface DataStateProps {
  type: "loading" | "error" | "empty"
  message?: string
  icon?: string
  className?: string
  background?: boolean
}

const defaultIcons = {
  loading: "hugeicons:loading-01",
  error: "hugeicons:alert-circle",
  empty: "hugeicons:search-01"
}

const defaultMessages = {
  loading: "Loading...",
  error: "An error occurred",
  empty: "No results found"
}

export const DataState = ({
  type,
  message,
  icon,
  className,
  background = true
}: DataStateProps) => {
  const displayIcon = icon || defaultIcons[type]
  const displayMessage = message || defaultMessages[type]

  return (
    <div
      className={clsx(
        s.state,
        type === "loading" && s.loading,
        type === "error" && s.error,
        type === "empty" && s.empty,
        className,
        background && s.background
      )}
    >
      <Icon icon={displayIcon} />
      <p>{displayMessage}</p>
    </div>
  )
}
