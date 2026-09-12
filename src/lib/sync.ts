import { useEffect, useState } from 'react'
import type { BotState, HostInfo } from '../types'

export function useBot() {
  const [state, setState] = useState<BotState | null>(null)
  const [host, setHost] = useState<HostInfo | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    void fetch('/api/state')
      .then((r) => r.json())
      .then((data) => setState(data as BotState))
      .catch(() => setState(null))
    void fetch('/api/host')
      .then((r) => r.json())
      .then((data) => setHost(data as HostInfo))
      .catch(() => setHost(null))

    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const socket = new WebSocket(`${proto}://${location.host}/api/ws`)
    socket.onopen = () => setConnected(true)
    socket.onclose = () => setConnected(false)
    socket.onerror = () => setConnected(false)
    socket.onmessage = (ev) => {
      try {
        setState(JSON.parse(ev.data) as BotState)
      } catch {
        /* ignore */
      }
    }
    return () => socket.close()
  }, [])

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

  return { state, host, connected, demo, call }
}
