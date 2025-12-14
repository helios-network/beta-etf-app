"use client"

import { useGSAP } from "@gsap/react"
import clsx from "clsx"
import gsap from "gsap"
import { useCallback, useMemo, useRef } from "react"
import s from "./tunnel.module.scss"

interface LightPath {
  id: number
  d: string
  duration?: number
  delay?: number
  ease?: string
}

const LIGHT_PATHS: LightPath[] = [
  {
    id: 1,
    d: "M26.766.5c69.333.523 200 13.25 200 51.727",
    duration: 3,
    delay: 0,
    ease: "power2.inOut"
  },
  {
    id: 2,
    d: "M102.016 1.261c41.584 3.049 124.75 16.727 124.75 51.489",
    duration: 5,
    delay: 0.5,
    ease: "power1.inOut"
  },
  {
    id: 3,
    d: "M142.516 1.523c28.084 4.443 84.25 20.857 84.25 50.966",
    duration: 4,
    delay: 1,
    ease: "none"
  },
  {
    id: 4,
    d: "M.016 1.25c73.833 2.417 226.75 16.2 226.75 50",
    duration: 3,
    delay: 1.5,
    ease: "cubic"
  },
  {
    id: 5,
    d: "M169.016 2c21.75 7.25 57.875 26.95 57.875 49.25",
    duration: 3,
    delay: 0,
    ease: "none"
  },
  {
    id: 6,
    d: "M185.266 1.875c15.25 8.875 41.75 30.8 41.75 49.5",
    duration: 2,
    delay: 2,
    ease: "none"
  },
  {
    id: 7,
    d: "M427.016.5c-69.333.523-200 13.25-200 51.727",
    duration: 3,
    delay: 0.3,
    ease: "power2.inOut"
  },
  {
    id: 8,
    d: "M351.766 1.261c-41.583 3.049-124.75 16.727-124.75 51.489",
    duration: 5,
    delay: 0.8,
    ease: "power1.inOut"
  },
  {
    id: 9,
    d: "M311.266 1.523c-28.083 4.443-84.25 20.857-84.25 50.966",
    duration: 4,
    delay: 1.3,
    ease: "none"
  },
  {
    id: 10,
    d: "M453.766 1.25c-73.833 2.417-226.75 16.2-226.75 50",
    duration: 3,
    delay: 1.8,
    ease: "cubic"
  },
  {
    id: 11,
    d: "M284.766 2c-21.75 7.25-57.875 26.95-57.875 49.25",
    duration: 3,
    delay: 0.2,
    ease: "none"
  },
  {
    id: 12,
    d: "M268.516 1.625c-15.25 8.875-41.75 30.8-41.75 49.5",
    duration: 2,
    delay: 2.2,
    ease: "none"
  },
  {
    id: 13,
    d: "M202.766 1.875c8.167 11.958 24.5 38.65 24.5 49.75",
    duration: 2.5,
    delay: 0.7,
    ease: "power1.inOut"
  },
  {
    id: 14,
    d: "M215.235 1.969c4 11.5 12 37.75 12 50.75",
    duration: 2.8,
    delay: 1.2,
    ease: "power1.inOut"
  },
  {
    id: 15,
    d: "M251.016 1.875c-8.166 11.958-24.5 38.65-24.5 49.75",
    duration: 2.5,
    delay: 0.9,
    ease: "power1.inOut"
  },
  {
    id: 16,
    d: "M238.954 2c-4 11.5-12 37.75-12 50.75",
    duration: 2.8,
    delay: 1.4,
    ease: "power1.inOut"
  }
]

interface TunnelProps {
  className?: string
}

export const Tunnel = ({ className }: TunnelProps) => {
  return (
    <div className={clsx(s.tunnel, className)}>
      <svg viewBox="0 0 454 58" className={s.lines} aria-hidden="true">
        <use href="#lines" />
      </svg>
    </div>
  )
}

export const TunnelDefs = () => {
  const gradientRefs = useRef<(SVGLinearGradientElement | null)[]>([])
  const animationRef = useRef<gsap.core.Timeline | null>(null)

  const animateGradients = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.kill()
    }

    const timeline = gsap.timeline({
      repeat: -1
    })

    gradientRefs.current.forEach((gradient, index) => {
      if (!gradient) return

      const path = LIGHT_PATHS[index]

      const subTimeline = gsap.timeline({
        repeat: -1,
        repeatDelay: path.delay || 0
      })

      subTimeline.to(gradient, {
        attr: {
          x1: "90%",
          y1: "90%",
          x2: "130%",
          y2: "130%"
        },
        duration: path.duration || 3,
        ease: path.ease || "power2.inOut"
      })

      timeline.add(subTimeline, path.delay || 0)
    })

    animationRef.current = timeline
  }, [])

  useGSAP(() => {
    animateGradients()
    return () => {
      if (animationRef.current) {
        animationRef.current.kill()
      }
    }
  }, [animateGradients])

  const gradientElements = useMemo(
    () =>
      LIGHT_PATHS.map((path, index) => (
        <linearGradient
          key={path.id}
          ref={(el: SVGLinearGradientElement | null) => {
            if (el) {
              gradientRefs.current[index] = el
            }
          }}
          id={`light-gradient-${path.id}`}
          x1="0"
          y1="0"
          x2="5%"
          y2="5%"
          gradientUnits="objectBoundingBox"
        >
          <stop stopColor="var(--text-primary)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--text-primary)" />
          <stop offset="1" stopColor="var(--text-primary)" stopOpacity="0" />
        </linearGradient>
      )),
    []
  )

  const basePathElements = useMemo(
    () => LIGHT_PATHS.map((path) => <path key={path.id} d={path.d} />),
    []
  )

  return (
    <defs>
      <g id="lines">
        <path className={s.path} d="M227.048 2.125v55.5" />
        <use href="#lines-path" />
        <g transform="scale(-1, 1)">
          <use
            href="#lines-path"
            style={{
              transform: "scale(1, 1) translate(-100%, 0%)",
              transformOrigin: "center"
            }}
          />
        </g>
      </g>
      <g id="lines-path">
        <g className={s.path}>{basePathElements}</g>
        {LIGHT_PATHS.map((path) => (
          <g
            key={path.id}
            stroke={`url(#light-gradient-${path.id})`}
            className={s.light}
          >
            <path d={path.d} />
          </g>
        ))}
      </g>
      {gradientElements}
    </defs>
  )
}
