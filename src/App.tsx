import { Clock } from './components/Clock'
import { DemoPanel } from './components/DemoPanel'
import { PortMap } from './components/PortMap'
import { RecoveryCard } from './components/RecoveryCard'
import { useBot } from './lib/sync'
import type { Place } from './types'

export default function App() {
  const { state, host, connected, demo, call } = useBot()
  const phase = state?.phase ?? 'empty'
  const cruise = state?.cruise ?? null
  const you = state?.you ?? { lat: 20.4898, lng: -86.9462 }
  const imsg = host?.imessage
  const waiting = !cruise

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="brand">REJOIN</p>
          <h1>{cruise?.ship ?? 'Harmony of the Seas'}</h1>
        </div>
        <p className={`source ${imsg?.db_readable ? 'live' : 'wait'}`}>
          {imsg?.db_readable ? 'iMessage inbox live' : 'Grant Full Disk Access to read iMessage'}
          <span>
            Text {imsg?.local_handle ?? 'this Mac'}
            {imsg?.peer ? ` · replies to ${imsg.peer}` : ''}
            {state?.last_imessage ? ` · last: ${state.last_imessage}` : ''}
            {connected ? '' : ' · run npm run api'}
          </span>
        </p>
      </header>

      {waiting ? (
        <section className="waiting">
          <p className="empty-kicker">iMessage only</p>
          <h2>Text this Mac</h2>
          <p className="empty-copy">
            From your iPhone, iMessage {imsg?.local_handle ?? 'the Apple ID signed into Messages on this laptop'}.
            Say <strong>sample</strong>, then <strong>I&apos;m still at the ruins</strong>, then <strong>skip</strong>.
          </p>
          {!imsg?.db_readable ? (
            <p className="empty-copy">
              System Settings → Privacy &amp; Security → Full Disk Access → enable Terminal, then restart{' '}
              <code>npm run api</code>.
            </p>
          ) : null}
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

      {cruise && state?.show_recovery ? (
        <RecoveryCard cruise={cruise} phase={phase} onCall={() => void call()} />
      ) : null}

      <DemoPanel
        nowSec={state?.now_sec ?? 15 * 3600 + 50 * 60}
        place={(state?.place as Place) ?? 'town'}
        onTime={(sec) => void demo({ now_sec: sec })}
        onPlace={(place) => void demo({ place })}
      />
    </div>
  )
}
