import { Button } from "@/components/button"
import { Card } from "@/components/card"
import { Sub } from "@/components/sub"
import { Tunnel } from "@/components/tunnel"
import s from "./page.module.scss"

export default function Home() {
  return (
    <div className={s.home}>
      <div className={s.header}>
        <Sub className={s.sub}>
          Welcome to Helios <strong>Forge</strong>
        </Sub>
        <h1>Create, Mint, and Evolve ETFs.</h1>
        <p>
          Experience the future of ETF token trading Ethereum. Create, Mint and
          Manage diversified token baskets.
        </p>
      </div>
      <Card className={s.form}>
        <div className={s.field}>
          <label>Sell</label>
          <div className={s.middle}>
            <input type="number" value="0.00" placeholder="0.00" />
            <Button icon="hugeicons:arrow-down-01" variant="secondary">
              ETH
            </Button>
          </div>
          <div className={s.bottom}>$0.00</div>
        </div>
        <div className={s.actions}>
          <Button
            icon="hugeicons:arrow-data-transfer-vertical"
            variant="secondary"
          />
          <Button icon="hugeicons:settings-02" variant="secondary" />
          <Tunnel className={s.tunnel} />
        </div>
        <div className={s.field}>
          <label>Buy</label>
          <div className={s.middle}>
            <input type="number" value="0.00" placeholder="0.00" />
            <Button icon="hugeicons:arrow-down-01" variant="secondary">
              Select ETF
            </Button>
          </div>
          <div className={s.bottom}>$0.00</div>
        </div>
        <Button className={s.start}>Start now</Button>
      </Card>
    </div>
  )
}
