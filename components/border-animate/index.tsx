import clsx from "clsx"
import s from "./border-animate.module.scss"

interface BorderAnimateProps {
  className?: string
}

export const BorderAnimate = ({ className }: BorderAnimateProps) => {
  return (
    <div className={clsx(s.border, className)}>
      <div className={s.borderInner} />
    </div>
  )
}
