import { useState } from 'react'
import { Clock } from './components/Clock'
import { DemoPanel } from './components/DemoPanel'
import { Bubble, Messages } from './components/Messages'
import { PortMap } from './components/PortMap'
import { RecoveryCard } from './components/RecoveryCard'
import { useBot } from './lib/sync'
import type { Place } from './types'

export default function App() {
  const { state, host, connected, send, demo, call, upload } = useBot()
  const [draft, setDraft] = useState('')

  const phase = state?.phase ?? 'empty'
  const cruise = state?.cruise ?? null
  const you = state?.you ?? { lat: 20.4898, lng: -86.9462 }

  async function submit(text: string) {
    const t = text.trim()
    if (!t) return
    setDraft('')
    try {
      await send(t)
    } catch {
      /* api offline */
    }
  }

  return (
    <div className="app">
      {host ? (
        <p className="hostbar">
          Phone: open <strong>{host.phone_url}</strong>
          {host.imessage.peer ? ` · iMessage replies to ${host.imessage.peer}` : ' · set REJOIN_PEER to text from Messages'}
          {host.db_readable ? ' · inbox live' : ' · inbox needs Full Disk Access'}
          {connected ? '' : ' · server offline, run npm run api'}
        </p>
      ) : (
        <p className="hostbar">Run <code>npm run api</code> on this Mac, then text from your phone at the LAN URL.</p>
      )}

      <Messages
        composer={
          <footer className="imsg-compose">
            <div className="chips">
              {phase === 'empty' ? (
                <button type="button" onClick={() => void submit('sample')}>
                  Use sample planner
                </button>
              ) : null}
              {phase === 'armed' || phase === 'late' ? (
                <button type="button" onClick={() => void submit("I'm still at the ruins")}>
                  I&apos;m still at the ruins
                </button>
              ) : null}
              {state?.show_recovery && cruise ? (
                <a className="chip-call" href={`tel:${cruise.port_agent.phone}`} onClick={() => void call()}>
                  CALL PORT AGENT
                </a>
              ) : null}
            </div>
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault()
                void submit(draft)
              }}
            >
              <label className="attach">
                +
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void upload(file)
                  }}
                />
              </label>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="iMessage"
                enterKeyHint="send"
              />
              <button type="submit" className="send" disabled={!draft.trim()}>
                ↑
              </button>
            </form>
          </footer>
        }
      >
        {(state?.bubbles ?? []).map((b) => (
          <Bubble key={b.id} from={b.from}>
            {b.photo ? <img className="planner-shot" src={b.photo} alt="" /> : null}
            {b.text}
          </Bubble>
        ))}

        {(state?.logs ?? []).map((line) => (
          <p key={line.id} className={`imsg-status ${line.level}`}>
            {line.text}
          </p>
        ))}

        {cruise ? (
          <div className="rich">
            <Clock
              phase={phase}
              nowSec={state?.now_sec ?? 0}
              allAboard={cruise.all_aboard_local}
              departure={cruise.departure_local}
              walkMin={state?.walk_min ?? 12}
            />
            <PortMap
              cruise={cruise}
              you={you}
              departed={Boolean(state?.departed)}
              onYouChange={() => {
                /* phone pin stays on presets; drag also maps to ruins if far */
              }}
            />
          </div>
        ) : null}

        {cruise && state?.show_recovery ? (
          <div className="rich recovery-wrap">
            <RecoveryCard cruise={cruise} phase={phase} onCall={() => void call()} />
          </div>
        ) : null}
      </Messages>

      <DemoPanel
        nowSec={state?.now_sec ?? 15 * 3600 + 50 * 60}
        place={(state?.place as Place) ?? 'town'}
        onTime={(sec) => void demo({ now_sec: sec })}
        onPlace={(place) => void demo({ place })}
      />
    </div>
  )
}
