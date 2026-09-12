import { useEffect, useRef, useState } from 'react'
import { Clock } from './components/Clock'
import { DemoPanel } from './components/DemoPanel'
import { PortMap } from './components/PortMap'
import { RecoveryCard } from './components/RecoveryCard'
import { prettyPhone } from './lib/phone'
import { useBot } from './lib/sync'
import { parseHm } from './lib/time'
import type { Place } from './types'

const BLOCKED = '+15555550100'
const CHIPS = [
  { label: 'sample', text: 'sample' },
  { label: 'ruins', text: "I'm still at the ruins" },
  { label: 'skip', text: 'skip' },
  { label: 'call', text: 'call' },
  { label: 'reset', text: 'reset' },
]

type Notice = { id: number; text: string; bad?: boolean }

export default function Sim() {
  const { state, connected, demo, call, act } = useBot()
  const [peers, setPeers] = useState<string[]>([])
  const [from, setFrom] = useState('')
  const [draft, setDraft] = useState('')
  const [notices, setNotices] = useState<Notice[]>([])
  const threadRef = useRef<HTMLDivElement>(null)
  const seq = useRef(0)

  const phase = state?.phase ?? 'empty'
  const cruise = state?.cruise ?? null
  const you = state?.you ?? { lat: 20.4898, lng: -86.9462 }

  useEffect(() => {
    void fetch('/api/sim/peers')
      .then((r) => r.json())
      .then((data: { peers?: string[] }) => {
        const list = data.peers ?? []
        setPeers(list)
        setFrom((cur) => cur || list[0] || '')
      })
      .catch(() => setPeers([]))
  }, [])

  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state?.bubbles, notices])

  function note(text: string, bad = false) {
    seq.current += 1
    setNotices((rows) => [...rows, { id: seq.current, text, bad }].slice(-8))
  }

  async function send(text: string) {
    const body = text.trim()
    if (!body || !from) return
    setDraft('')
    try {
      const res = await fetch('/api/sim/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, text: body }),
      })
      const data = (await res.json()) as { blocked?: boolean; reason?: string; delivered?: string }
      if (data.blocked) note("that number isn't on the list.", true)
    } catch {
      note('api is down. run npm run api.', true)
    }
  }

  async function probeSend() {
    try {
      const res = await fetch('/api/sim/probe-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, text: 'sim probe' }),
      })
      await res.json()
      note("didn't send. send is off.", true)
    } catch {
      note('api is down. run npm run api.', true)
    }
  }

  async function forgetInbound() {
    await fetch('/api/sim/forget-inbound', { method: 'POST' })
    note('ok, forgot who texted first.')
  }

  return (
    <div className="sim-shell">
      <p className="sim-banner">
        fake imessage. nothing leaves this laptop.
        {connected ? '' : ' start the api first.'}
      </p>

      <section className="sim-phone">
        <header className="sim-phone-top">
          <a href="#">Clock view</a>
          <strong>Rejoin</strong>
          <span>{from ? prettyPhone(from) : 'no peer'}</span>
        </header>

        <label className="sim-peer">
          you're texting as
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            {peers.map((n) => (
              <option key={n} value={n}>
                {prettyPhone(n)}
              </option>
            ))}
            <option value={BLOCKED}>{prettyPhone(BLOCKED)} (blocked)</option>
          </select>
        </label>

        <div className="sim-thread" ref={threadRef}>
          {(state?.bubbles ?? []).map((row) => (
            <p key={row.id} className={`sim-bubble ${row.from === 'me' ? 'mine' : 'theirs'}`}>
              {row.text}
            </p>
          ))}
          {notices.map((row) => (
            <p key={`n-${row.id}`} className={`sim-system ${row.bad ? 'bad' : ''}`}>
              {row.text}
            </p>
          ))}
        </div>

        <div className="sim-chips">
          {CHIPS.map((chip) => (
            <button key={chip.label} type="button" onClick={() => void send(chip.text)}>
              {chip.label}
            </button>
          ))}
        </div>

        <form
          className="sim-compose"
          onSubmit={(e) => {
            e.preventDefault()
            void send(draft)
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="iMessage"
            autoComplete="off"
          />
          <button type="submit">Send</button>
        </form>

        <div className="sim-tools">
          <button type="button" onClick={() => void probeSend()}>
            don't send
          </button>
          <button type="button" onClick={() => void forgetInbound()}>
            forget who texted
          </button>
        </div>
      </section>

      <section className="sim-laptop">
        <header className="sim-laptop-top">
          <p>Laptop</p>
          <h1>{cruise?.ship ?? 'Harmony of the Seas'}</h1>
        </header>

        {phase === 'empty' || !cruise ? (
          <div className="sim-empty">
            <p>text <strong>sample</strong> and i'll pull the sailing.</p>
          </div>
        ) : (
          <div className="sim-stage">
            <Clock
              phase={phase}
              nowSec={state?.now_sec ?? 0}
              allAboard={cruise.all_aboard_local}
              departure={cruise.departure_local}
              walkMin={state?.walk_min ?? 12}
              departed={Boolean(state?.departed)}
            />
            <PortMap cruise={cruise} you={you} departed={Boolean(state?.departed)} onYouChange={() => undefined} />
          </div>
        )}

        {cruise && state?.show_recovery ? (
          <RecoveryCard
            cruise={cruise}
            phase={phase}
            onCall={() => void call()}
            onReset={() => void act('reset')}
          />
        ) : null}

        {cruise && !state?.show_recovery ? (
          <DemoPanel
            nowSec={state?.now_sec ?? 15 * 3600 + 50 * 60}
            skipSec={parseHm(cruise.departure_local) + 60}
            place={(state?.place as Place) ?? 'town'}
            onTime={(sec) => void demo({ now_sec: sec })}
            onPlace={(place) => void demo({ place })}
          />
        ) : null}
      </section>
    </div>
  )
}
