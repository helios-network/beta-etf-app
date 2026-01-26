"use client"

import { Button } from "@/components/button"
import routes from "@/config/routes"
import { useAppStore } from "@/stores/app"
import clsx from "clsx"
import { useRef } from "react"
import { useOnClickOutside } from "usehooks-ts"

import NavItem, { type NavItemProps } from "./nav-item"
import s from "./nav.module.scss"

export const Nav = () => {
  const { nav, setNav } = useAppStore()
  const ref = useRef(null)

  // @ts-expect-error - useOnClickOutside not updated ts
  useOnClickOutside(ref, () => setNav(false))

  const list: NavItemProps[] = [
    {
      label: "Home",
      href: routes.home
    },
    {
      label: "ETF Marketplace",
      href: routes.etfList
    },
    {
      label: "Create ETF",
      href: routes.etfCreate
    },
    {
      label: "Portfolio",
      href: routes.portfolio
    },
    {
      label: "Predictions",
      href: routes.etfPredictions
    },
    {
      label: "Leaderboard",
      href: routes.leaderboard
    }
  ]

  return (
    <nav className={s.nav} ref={ref}>
      <ul className={s.list}>
        {list.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </ul>
      <ul className={clsx(s.sub, s.list, nav && s.open)}>
        {list.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </ul>
      <Button
        iconRight={nav ? "hugeicons:arrow-down-01" : "hugeicons:menu-01"}
        variant="secondary"
        className={s.bnav}
        onClick={() => setNav(!nav)}
      />
    </nav>
  )
}
