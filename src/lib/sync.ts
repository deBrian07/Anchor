import { useEffect, useState } from 'react'
import type { BotState } from '../types'

export function useBot() {
  const [state, setState] = useState<BotState | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let cancelled = false
    let socket: WebSocket | null = null
    let retry = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    async function loadState() {
      try {
        const res = await fetch('/api/state')
        if (!res.ok || cancelled) return
        setState((await res.json()) as BotState)
      } catch {
        /* API is down; socket retry will pick it up */
      }
    }

    function connect() {
      if (cancelled) return
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
        if (cancelled) return
        if (socket === ws) setConnected(false)
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
    const res = await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (res.ok) setState((await res.json()) as BotState)
  }

  async function demo(body: { now_sec?: number; place?: string }) {
    const res = await fetch('/api/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) setState((await res.json()) as BotState)
  }

  async function call() {
    const res = await fetch('/api/call', { method: 'POST' })
    if (res.ok) {
      const data = (await res.json()) as { state: BotState }
      setState(data.state)
    }
  }

  return { state, connected, act, demo, call }
}
