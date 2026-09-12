import { Clock } from './components/Clock'
import { DemoPanel } from './components/DemoPanel'
import { PortMap } from './components/PortMap'
import { RecoveryCard } from './components/RecoveryCard'
import { useBot } from './lib/sync'
import type { Place } from './types'

export default function App() {
  const { state, connected, demo, call, act } = useBot()
  const phase = state?.phase ?? 'empty'
  const cruise = state?.cruise ?? null
  const you = state?.you ?? { lat: 20.4898, lng: -86.9462 }

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="brand">REJOIN</p>
          <h1>{cruise?.ship ?? 'Harmony of the Seas'}</h1>
        </div>
        <p className="source">
          {cruise?.source?.provider ?? cruise?.cruise_line ?? 'Royal Caribbean'}
          <span>
            {cruise?.port ?? 'Cozumel, Mexico'}
            {connected ? '' : ' · run the API from the README'}
          </span>
        </p>
      </header>

      {phase === 'empty' || !cruise ? (
        <section className="waiting">
          <p className="empty-kicker">Still ashore. The ship is leaving.</p>
          <h2>REJOIN</h2>
          <p className="empty-copy">Load the mock Royal Caribbean sailing.</p>
          <div className="empty-actions">
            <button type="button" className="primary" onClick={() => void act('sample')}>
              Use sample planner
            </button>
          </div>
        </section>
      ) : (
        <main className="stage">
          <Clock
            phase={phase}
            nowSec={state?.now_sec ?? 0}
            allAboard={cruise.all_aboard_local}
            departure={cruise.departure_local}
            walkMin={state?.walk_min ?? 12}
          />
          <PortMap cruise={cruise} you={you} departed={Boolean(state?.departed)} onYouChange={() => undefined} />
        </main>
      )}

      <ul className="log">
        {(state?.logs ?? []).map((line) => (
          <li key={line.id} className={line.level}>
            {line.text}
          </li>
        ))}
      </ul>

      {phase === 'armed' || phase === 'late' ? (
        <footer className="action">
          <button type="button" className="primary wide" onClick={() => void act("I'm still at the ruins")}>
            I&apos;m still at the ruins
          </button>
        </footer>
      ) : null}

      {cruise && state?.show_recovery ? (
        <RecoveryCard cruise={cruise} phase={phase} onCall={() => void call()} />
      ) : null}

      {state?.show_recovery ? null : (
        <DemoPanel
          nowSec={state?.now_sec ?? 15 * 3600 + 50 * 60}
          place={(state?.place as Place) ?? 'town'}
          onTime={(sec) => void demo({ now_sec: sec })}
          onPlace={(place) => void demo({ place })}
        />
      )}
    </div>
  )
}
