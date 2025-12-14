import clsx from "clsx"
import { Sprite } from "../sprite"
import s from "./sub.module.scss"

interface SubProps {
  className?: string
  children?: React.ReactNode
}

export const Sub = ({ className, children }: SubProps) => {
  return (
    <div className={clsx(s.sub, className)} data-reveal="bottom">
      <Sprite id="logotype" viewBox="0 0 464 464" />
      {children}
    </div>
  )
}
