"use client"

import { Button, Input, Modal } from "@/components"
import clsx from "clsx"
import { useState } from "react"
import s from "./slippage-modal.module.scss"

interface SlippageModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (slippage: number) => void
  initialSlippage?: number
}

export function SlippageModal({
  open,
  onClose,
  onConfirm,
  initialSlippage = 0.25
}: SlippageModalProps) {
  const [slippage, setSlippage] = useState<number>(initialSlippage)
  const [customSlippage, setCustomSlippage] = useState<string>("")
  const [isCustom, setIsCustom] = useState(false)

  const handlePresetClick = (value: number) => {
    setSlippage(value)
    setCustomSlippage("")
    setIsCustom(false)
  }

  const handleCustomChange = (value: string) => {
    setCustomSlippage(value)
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setSlippage(numValue)
      setIsCustom(true)
    }
  }

  const handleConfirm = () => {
    onConfirm(slippage)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Slippage Tolerance"
      className={s.modal}
      responsiveBottom
    >
      <div className={s.content}>
        <div className={s.slippageContainer}>
          <label className={s.slippageLabel}>Slippage Tolerance</label>
          <div className={s.slippageButtons}>
            <button
              type="button"
              className={clsx(
                s.slippageButton,
                slippage === 0.25 && !isCustom && s.active
              )}
              onClick={() => handlePresetClick(0.25)}
            >
              0.25%
            </button>
            <button
              type="button"
              className={clsx(
                s.slippageButton,
                slippage === 0.5 && !isCustom && s.active
              )}
              onClick={() => handlePresetClick(0.5)}
            >
              0.5%
            </button>
            <button
              type="button"
              className={clsx(
                s.slippageButton,
                slippage === 1 && !isCustom && s.active
              )}
              onClick={() => handlePresetClick(1)}
            >
              1%
            </button>
          </div>
        </div>

        <Input
          label="Custom Slippage (%)"
          type="number"
          inputMode="decimal"
          placeholder="0.0"
          value={customSlippage}
          onChange={(e) => handleCustomChange(e.target.value)}
          icon="hugeicons:percentage-circle"
          helperText="Enter a custom slippage tolerance (0-100%)"
          min={0}
          max={100}
          step={0.01}
        />

        <div className={s.actions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  )
}
