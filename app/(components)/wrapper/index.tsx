import { PointsModal } from "@/components/points-modal"
import { TunnelDefs } from "@/components/tunnel"
import NextTopLoader from "nextjs-toploader"
import { Toaster } from "sonner"

import { Footer } from "../footer"
import { Header } from "../header"
import s from "./wrapper.module.scss"

interface WrapperProps {
  children: React.ReactNode
}

export const Wrapper = ({ children }: WrapperProps) => {
  return (
    <>
      <Header />
      <main className={s.main}>{children}</main>
      <Footer />
      <NextTopLoader
        color="var(--primary-medium)"
        height={2}
        showSpinner={false}
        zIndex={9999}
      />
      <Toaster
        position="bottom-right"
        visibleToasts={3}
        toastOptions={{
          className: s.toast
        }}
      />
      <PointsModal />
      <svg className={s.defs} width="0" height="0" aria-hidden>
        <TunnelDefs />
      </svg>
      <div id="modal-root" />
      <div className={s.bg} />
    </>
  )
}
