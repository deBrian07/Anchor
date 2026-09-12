import { useEffect, useRef, useState } from 'react'
import type { BotState } from '../types'

export function useBot() {
  const [state, setState] = useState<BotState | null>(null)
  const [connected, setConnected] = useState(false)
  const actSeq = useRef(0)
  const demoSeq = useRef(0)
  const callSeq = useRef(0)

  useEffect(() => {
    let cancelled = false
    let socket: WebSocket | null = null
    let retry = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    async function loadState() {
      try {
        const res = await fetch('/api/state')
        if (!res.ok || cancelled) return
        const data = (await res.json()) as BotState
        if (cancelled) return
        setState(data)
      } catch {
        /* API is down; socket retry will pick it up */
      }
    }

    function connect() {
      if (cancelled) return
      if (timer) clearTimeout(timer)
      const prev = socket
      socket = null
      prev?.close()
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${proto}://${location.host}/api/ws`)
      socket = ws
      ws.onopen = () => {
        if (cancelled || socket !== ws) return
        setConnected(true)
        retry = 0
        void loadState()
      }
      ws.onclose = () => {
        if (cancelled || socket !== ws) return
        setConnected(false)
        const delay = Math.min(4000, 400 * 2 ** retry)
        retry += 1
        timer = setTimeout(connect, delay)
      }
      ws.onerror = () => {
        ws.close()
      }
      ws.onmessage = (ev) => {
        if (cancelled || socket !== ws) return
        try {
          setState(JSON.parse(ev.data) as BotState)
        } catch {
          /* ignore */
        }
      }
    }

    void loadState()
    connect()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      socket?.close()
    }
  }, [])

  async function act(text: string) {
    const id = ++actSeq.current
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok || id !== actSeq.current) return
      setState((await res.json()) as BotState)
    } catch {
      /* keep last good state */
    }
  }

  async function demo(body: { now_sec?: number; place?: string }) {
    const id = ++demoSeq.current
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok || id !== demoSeq.current) return
      setState((await res.json()) as BotState)
    } catch {
      /* keep last good state */
    }
  }

  async function call() {
    const id = ++callSeq.current
    try {
      const res = await fetch('/api/call', { method: 'POST' })
      if (!res.ok || id !== callSeq.current) return
      const data = (await res.json()) as { state: BotState }
      setState(data.state)
    } catch {
      /* keep last good state */
    }
  }

  return { state, connected, act, demo, call }
}
