"use client"

import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import clsx from "clsx"
import s from "./disclosures.module.scss"

export function Disclosures() {
  return (
    <Card className={clsx(s.disclosures, "auto")}>
      <Heading
        icon="hugeicons:apple-reminder"
        title="Disclosures"
        description="Important legal and risk information"
      />

      <div className={s.content}>
        <div className={s.section}>
          <h4 className={s.sectionTitle}>General Disclaimer</h4>
          <p className={s.text}>
            Use of this platform implies acceptance of our terms and conditions.
            Information presented comes from on-chain sources and may be subject
            to errors or delays. Past performance is not indicative of future
            results.
          </p>
        </div>

        <div className={s.section}>
          <h4 className={s.sectionTitle}>Risks Related to Digital Assets</h4>
          <p className={s.text}>
            Digital assets and ETF tokens present significant risks, including
            price volatility, possible total loss of invested capital, and
            technical risks related to blockchain technology. Only invest what
            you can afford to lose.
          </p>
        </div>

        <div className={s.section}>
          <h4 className={s.sectionTitle}>Not Financial Advice</h4>
          <p className={s.text}>
            Information provided on this platform does not constitute financial,
            investment, legal, or tax advice. You must conduct your own research
            and consult qualified professionals before making any investment
            decisions.
          </p>
        </div>

        <div className={s.section}>
          <h4 className={s.sectionTitle}>Smart Contract Risks</h4>
          <p className={s.text}>
            ETFs are managed by smart contracts deployed on the blockchain.
            Although these contracts are audited, they may contain bugs or
            vulnerabilities that could result in loss of funds. There is no
            guarantee regarding the security or operation of these contracts.
          </p>
        </div>

        <div className={s.section}>
          <h4 className={s.sectionTitle}>Regulation</h4>
          <p className={s.text}>
            Regulations regarding digital assets vary by jurisdiction. Make sure
            you understand and comply with applicable laws in your region before
            using this platform.
          </p>
        </div>
      </div>
    </Card>
  )
}
