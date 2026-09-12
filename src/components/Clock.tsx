import { analogAngles, formatCountdown, formatHm, parseHm } from '../lib/time'
import type { Phase } from '../types'

type Props = {
  phase: Phase
  nowSec: number
  allAboard: string
  departure: string
  walkMin: number
}

export function Clock({ phase, nowSec, allAboard, departure, walkMin }: Props) {
  const allSec = parseHm(allAboard)
  const depSec = parseHm(departure)
  const remainAll = allSec - nowSec
  const remainDep = depSec - nowSec
  const hot = phase === 'late' || phase === 'missed' || phase === 'calling'
  const dead = phase === 'missed' || phase === 'calling'
  const now = analogAngles(nowSec)
  const allArm = analogAngles(allSec)
  const depArm = analogAngles(depSec)

  return (
    <section className={`clock ${hot ? 'hot' : ''} ${dead ? 'dead' : ''}`}>
      <div className="clock-face-wrap">
        <svg className="clock-face" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="94" className="face-ring" />
          <circle cx="100" cy="100" r="86" className="face-disk" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = ((i * 30 - 90) * Math.PI) / 180
            const x1 = 100 + Math.cos(a) * 74
            const y1 = 100 + Math.sin(a) * 74
            const x2 = 100 + Math.cos(a) * 82
            const y2 = 100 + Math.sin(a) * 82
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="tick" />
          })}
          <line
            x1="100"
            y1="100"
            x2={100 + Math.sin((allArm.hour * Math.PI) / 180) * 52}
            y2={100 - Math.cos((allArm.hour * Math.PI) / 180) * 52}
            className={`arm all-arm ${dead ? 'arm-dead' : ''}`}
          />
          <line
            x1="100"
            y1="100"
            x2={100 + Math.sin((depArm.hour * Math.PI) / 180) * 70}
            y2={100 - Math.cos((depArm.hour * Math.PI) / 180) * 70}
            className="arm sail-arm"
          />
          <line
            x1="100"
            y1="100"
            x2={100 + Math.sin((now.minute * Math.PI) / 180) * 64}
            y2={100 - Math.cos((now.minute * Math.PI) / 180) * 64}
            className="arm now-arm"
          />
          <circle cx="100" cy="100" r="5" className="hub" />
        </svg>
        <p className="face-caption">{formatHm(nowSec)}</p>
      </div>

      <div className="clock-digits">
        <div className={`deadline ${dead ? 'struck' : ''}`}>
          <span className="kicker">All aboard</span>
          <strong>{allAboard}</strong>
          <em>{dead ? 'CLOSED' : formatCountdown(remainAll)}</em>
        </div>
        <div className="deadline sail">
          <span className="kicker">Ship leaves</span>
          <strong>{departure}</strong>
          <em>{dead ? 'GONE' : formatCountdown(remainDep)}</em>
        </div>
        {phase === 'late' ? <p className="leave-now">LEAVE NOW</p> : null}
        {dead ? <p className="leave-now">SHIP LEFT</p> : null}
        {phase === 'armed' || phase === 'late' ? (
          <p className="walk-note">
            Walk to pier {Math.round(walkMin)} min
            {phase === 'late' ? ' · you will miss all-aboard' : ''}
          </p>
        ) : null}
      </div>
    </section>
  )
}
