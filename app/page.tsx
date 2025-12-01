import { Card } from "@/components/card"
import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import Link from "next/link"
import s from "./page.module.scss"

export default function Home() {
  return (
    <div className={s.home}>
      <div className={s.container}>
        <div className={s.hero}>
          <Heading
            title="Beta ETF Trading"
            description="Experience the future of ETF token trading on Ethereum. Create, mint, and manage diversified token baskets."
          />
        </div>

        <div className={s.featuresGrid}>
          <Link href="/etf-list" className={s.featureCard}>
            <Card>
              <div className={s.cardContent}>
                <Icon icon="hugeicons:store-01" className={s.cardIcon} />
                <h3>ETF Marketplace</h3>
                <p>Browse available ETFs, buy, sell, mint, and withdraw tokens</p>
              </div>
            </Card>
          </Link>

          <Link href="/etf-creator" className={s.featureCard}>
            <Card>
              <div className={s.cardContent}>
                <Icon icon="hugeicons:package" className={s.cardIcon} />
                <h3>Create ETF</h3>
                <p>Design your own ETF basket with custom token allocations</p>
              </div>
            </Card>
          </Link>
        </div>

        <div className={s.infoBox}>
          <Icon icon="hugeicons:info-circle" />
          <div>
            <div className={s.titleWrapper}>
              <Icon icon="hugeicons:idea-01" className={s.topicIcon} />
              <h4>How It Works</h4>
            </div>
            <p>
              Create customized ETF baskets with your preferred token allocations, mint tokens to start investing,
              or browse existing ETF portfolios in the marketplace. Manage your diversified portfolio with full control
              over token selection and asset allocation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
