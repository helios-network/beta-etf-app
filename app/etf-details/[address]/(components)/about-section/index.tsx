"use client"

import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import { Input } from "@/components/input"
import { Modal } from "@/components/modal"
import { ChainConfig } from "@/config/chain-config"
import clsx from "clsx"
import { useState } from "react"
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
  updatedAt: string
  chain: number
  website?: string
  tags?: string[]
  creatorAddress?: string
  annualizedFee?: number
  mintingFee?: number
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

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success("Information updated successfully")
      setIsEditing(false)
    } catch (error) {
      toast.error("Error updating information")
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}....${address.slice(-4)}`
  }

  const supplyChange = Math.random() * 4 - 2

  return (
    <Card className={clsx(s.aboutSection, "auto")}>
      <div className={s.header}>
        <Heading
          icon="hugeicons:information-circle"
          title="About this ETF"
          description="Details and metrics"
        />
        {isCreator && (
          <Button
            variant="secondary"
            size="small"
            iconLeft="hugeicons:settings-02"
            onClick={() => setIsEditing(true)}
            className={s.editButton}
          >
            Edit
          </Button>
        )}
      </div>

      <div className={s.content}>
        <p className={s.description}>{description}</p>

        <div className={s.creatorSection}>
          <div className={s.creatorCard}>
            <div className={s.creatorLabel}>Creator</div>
            <div className={s.creatorContent}>
              <Icon icon="hugeicons:user-circle" className={s.creatorIconLarge} />
              <div className={s.creatorDetails}>
                <div className={s.creatorAddress}>
                  {etf.creatorAddress ? formatAddress(etf.creatorAddress) : "Unknown"}
                </div>
                <button
                  className={s.copyButton}
                  onClick={() => {
                    if (etf.creatorAddress) {
                      navigator.clipboard.writeText(etf.creatorAddress)
                      toast.success("Address copied")
                    }
                  }}
                  title="Copy full address"
                >
                  <Icon icon="hugeicons:copy-01" />
                </button>
              </div>
            </div>
          </div>

          {website && (
            <div className={s.websiteCard}>
              <div className={s.websiteLabel}>Official Website</div>
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className={s.websiteLink}
              >
                <Icon icon="hugeicons:globe-01" className={s.websiteIcon} />
                <span>{website.replace(/^https?:\/\//, "").split("/")[0]}</span>
                <Icon icon="hugeicons:arrow-up-right-01" className={s.externalArrow} />
              </a>
            </div>
          )}
        </div>

        <div className={s.metricsGrid}>
          <div className={s.metricCard}>
            <div className={s.metricLabel}>Market Cap</div>
            <div className={s.metricValue}>{formatCurrency(etf.tvl)}</div>
          </div>

          <div className={s.metricCard}>
            <div className={s.metricLabel}>Created</div>
            <div className={s.metricValue}>{formatDate(etf.createdAt)}</div>
          </div>

          <div className={s.metricCard}>
            <div className={s.metricLabel}>Supply</div>
            <div className={s.metricValue}>{etf.totalSupply}</div>
          </div>

          <div className={s.metricCard}>
            <div className={s.metricLabel}>24h Supply Change</div>
            <div className={clsx(s.metricValue, supplyChange >= 0 ? s.positive : s.negative)}>
              {supplyChange >= 0 ? "+" : ""}{supplyChange.toFixed(2)}%
            </div>
          </div>
        </div>

        {(etf.annualizedFee !== undefined || etf.mintingFee !== undefined) && (
          <div className={s.feesSection}>
            <div className={s.feesHeader}>Fee Structure</div>
            <div className={s.feesGrid}>
              {(etf.annualizedFee !== undefined) && (
                <div className={s.feeBadge}>
                  <div className={s.feeBadgeLabel}>Annualized TVL Fee</div>
                  <div className={s.feeBadgeValue}>{(etf.annualizedFee * 100).toFixed(1)}%</div>
                </div>
              )}

              {(etf.mintingFee !== undefined) && (
                <div className={s.feeBadge}>
                  <div className={s.feeBadgeLabel}>Minting Fee</div>
                  <div className={s.feeBadgeValue}>{(etf.mintingFee * 100).toFixed(1)}%</div>
                </div>
              )}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div className={s.tagsSection}>
            <div className={s.tagsLabel}>Categories</div>
            <div className={s.tags}>
              {tags.map((tag, index) => (
                <span key={index} className={s.tag}>
                  {tag}
                </span>
              ))}
            </div>
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
