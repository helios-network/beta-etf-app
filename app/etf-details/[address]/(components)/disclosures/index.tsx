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
        description="Please read carefully"
      />

      <div className={s.content}>
        <p className={s.disclosureText}>
          By using <a href="#" className={s.link}>helios.finance</a> (the "Website"), you expressly acknowledge that you have read and understood the <a href="#" className={s.link}>Terms and Conditions</a> and agree to the terms therein. Helios Labs ("Helios") operates the Website to help facilitate interaction with the Helios protocol, including the minting and redeeming of ETFs. However, the Website is only one of several ways in which you can interact with the Helios protocol. Helios has neither created nor deployed any DTF and you are solely responsible for your interaction with specific DTFs via this Website in no way indicates that any DTF is endorsed by Helios. In fact, Helios assumes no liability for your use of the Website and interaction with the Helios protocol, as covered in the Terms and Conditions.
        </p>

        <p className={s.disclosureText}>
          The information provided on the Website comes from on-chain sources. Past performance is not indicative of future results. Although index ETFs are intended to track indexes, their ability to successfully track indexes is dependent on the governance structure of the DTF and the governance's ability to make appropriate trades. There is no guarantee that index funds will be successful or will track its corresponding index exactly. There are many risks associated with digital assets, including but not limited to security risk, counterparty risk, volatility risk, conflicts of interest, and many more. DTFs are non-custodial. You agree that your interaction with any DTFs is solely at your own risk and the Website and DTFs come as is, without any warranty or condition of any kind.
        </p>

        <p className={s.disclosureFooter}>
          To learn more about the risks associated with DTFs, <a href="#" className={s.link}>please see here</a>.
        </p>
      </div>
    </Card>
  )
}
