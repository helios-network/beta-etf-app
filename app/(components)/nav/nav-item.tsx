"use client"

import { Link } from "@/components"
import { useActive } from "@/hooks/useActive"
import { useAppStore } from "@/stores/app"
import clsx from "clsx"
import s from "./nav.module.scss"

export interface NavItemProps {
  label: string
  href: string
  disabled?: boolean
}

const NavItem = ({ label, href, disabled }: NavItemProps) => {
  const active = useActive(href)
  const { setNav } = useAppStore()

  return (
    <li>
      <Link
        href={href}
        className={clsx(s.item, active && s.active)}
        onClick={() => setNav(false)}
        disabled={disabled}
      >
        {label}
      </Link>
    </li>
  )
}

export default NavItem
