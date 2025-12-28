"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import { Input } from "@/components/input"
import { Modal } from "@/components/modal"
import { ChainConfig } from "@/config/chain-config"
import { formatTokenAmount } from "@/lib/utils/number"
import { formatTokenSupply } from "@/helpers/format"
import { fetchETFChart } from "@/helpers/request"
import { useQuery } from "@tanstack/react-query"
import clsx from "clsx"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import s from "./about-section.module.scss"

interface ETF {
  id: string
  name: string
  symbol: string
  description: string
  tvl: number
  totalSupply: string
  sharePrice: string
  volumeTradedUSD: number
  dailyVolumeUSD: number
  depositCount?: number
  redeemCount?: number
  createdAt: string
  chain: number
  vault: string
  website?: string
  tags?: string[]
}

interface AboutSectionProps {
  etf: ETF
  isCreator: boolean
  chainConfig?: ChainConfig
}

export function AboutSection({
  etf,
  isCreator,
  chainConfig
}: AboutSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [website, setWebsite] = useState(etf.website || "")
  const [description, setDescription] = useState(etf.description)
  const [tags, setTags] = useState<string[]>(etf.tags || [])
  const [isSaving, setIsSaving] = useState(false)

  const { data: chartResponse } = useQuery({
    queryKey: ["etfChart24h", etf.vault],
    queryFn: () => fetchETFChart(etf.vault, "7d"),
    staleTime: 30 * 1000,
    enabled: !!etf.vault
  })
  const dailyVolume = useMemo(() => {
    if (!chartResponse?.data || chartResponse.data.length === 0) {
      return etf.dailyVolumeUSD
    }
    const firstPrice = chartResponse.data[0].price?.average || 0
    const lastPrice = chartResponse.data[chartResponse.data.length - 1].price?.average || 0

    return Math.abs(lastPrice - firstPrice)
  }, [chartResponse, etf.dailyVolumeUSD])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success("Information updated successfully")
      setIsEditing(false)
    } catch (error: any) {
      console.error(error)
      toast.error("Error updating information")
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const dateStr = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
    return `${dateStr} ${timeStr}`
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  return (
    <Card className={clsx(s.aboutSection, "auto")}>
      <div className={s.header}>
        <Heading
          icon="hugeicons:information-circle"
          title="About this ETF"
          description="Details about this ETF"
        />
        {isCreator && (
          <Button
            variant="secondary"
            size="small"
            iconLeft="hugeicons:settings-02"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
      </div>

      <div className={s.content}>
        <p className={s.description}>{description}</p>

        <div className={s.metricsGrid}>
          <Card className={s.metric}>
            <span className={s.metricLabel}>Market Cap</span>
            <span className={s.metricValue}>{formatCurrency(etf.tvl)}</span>
          </Card>
          <Card className={s.metric}>
            <span className={s.metricLabel}>Supply</span>
            <span className={s.metricValue}>
              {formatTokenSupply(etf.totalSupply, 18, 4)}
            </span>
          </Card>
          <Card className={s.metric}>
            <span className={s.metricLabel}>Price</span>
            <span className={s.metricValue}>${formatTokenAmount(etf.sharePrice)}</span>
          </Card>
          <Card className={s.metric}>
            <span className={s.metricLabel}>24h Volume</span>
            <span className={s.metricValue}>
              {formatCurrency(dailyVolume)}
            </span>
          </Card>
          <Card className={s.metric}>
            <span className={s.metricLabel}>Created</span>
            <span className={s.metricValue}>{formatDate(etf.createdAt)}</span>
          </Card>
          <Card className={s.metric}>
            <span className={s.metricLabel}>Chain</span>
            <span className={s.metricValue}>
              {chainConfig?.name || `Chain ${etf.chain}`}
            </span>
          </Card>
        </div>

        {website && (
          <div className={s.website}>
            <Icon icon="link" className={s.linkIcon} />
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className={s.websiteLink}
            >
              {website}
            </a>
          </div>
        )}

        {tags.length > 0 && (
          <div className={s.tags}>
            {tags.map((tag, index) => (
              <span key={index} className={s.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit ETF Information"
      >
        <div className={s.editForm}>
          <div className={s.formGroup}>
            <Input
              type="url"
              label="Website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className={s.formGroup}>
            <Input
              type="textarea"
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ETF description..."
              rows={5}
            />
          </div>

          <div className={s.formGroup}>
            <Input
              type="text"
              label="Tags (comma separated)"
              value={tags.join(", ")}
              onChange={(e) =>
                setTags(
                  e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                )
              }
              placeholder="DeFi, Index, Crypto"
            />
          </div>

          <div className={s.formActions}>
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}
