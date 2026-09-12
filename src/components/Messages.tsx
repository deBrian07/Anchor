import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  composer: ReactNode
}

export function Messages({ children, composer }: Props) {
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  })

  return (
    <div className="phone">
      <div className="phone-notch" />
      <header className="imsg-nav">
        <span className="imsg-back">‹</span>
        <div className="imsg-person">
          <span className="imsg-avatar">R</span>
          <strong>Rejoin</strong>
          <em>iMessage</em>
        </div>
        <span className="imsg-face">⊕</span>
      </header>
      <div ref={scroller} className="imsg-thread">
        {children}
      </div>
      {composer}
    </div>
  )
}

type BubbleProps = {
  from: 'me' | 'them'
  children: ReactNode
  time?: string
}

export function Bubble({ from, children, time }: BubbleProps) {
  return (
    <div className={`bubble-row ${from}`}>
      <div className={`bubble ${from}`}>{children}</div>
      {time ? <time>{time}</time> : null}
    </div>
  )
}
