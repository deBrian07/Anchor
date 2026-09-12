import { DEPARTED_SEC, SLIDER_MAX, SLIDER_MIN, T40_SEC, T5_SEC, formatHm } from '../lib/time'
import type { Place } from '../types'

type Props = {
  nowSec: number
  place: Place
  onTime: (sec: number) => void
  onPlace: (place: Exclude<Place, 'custom'>) => void
}

export function DemoPanel({ nowSec, place, onTime, onPlace }: Props) {
  return (
    <aside className="demo" aria-label="Demo controls">
      <header>
        <strong>DEMO</strong>
        <span>time skip for judges</span>
      </header>
      <div className="demo-row">
        <button type="button" className={nowSec === T40_SEC ? 'on' : ''} onClick={() => onTime(T40_SEC)}>
          T-40min
        </button>
        <button type="button" className={nowSec === T5_SEC ? 'on' : ''} onClick={() => onTime(T5_SEC)}>
          T-5min
        </button>
        <button type="button" className={nowSec >= DEPARTED_SEC ? 'on' : ''} onClick={() => onTime(DEPARTED_SEC)}>
          Skip to 17:01
        </button>
      </div>
      <label className="slider">
        <span>Demo time {formatHm(nowSec)}</span>
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={60}
          value={Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, nowSec))}
          onChange={(e) => onTime(Number(e.target.value))}
        />
      </label>
      <p className="demo-label">Set my location</p>
      <div className="demo-row">
        <button type="button" className={place === 'pier' ? 'on' : ''} onClick={() => onPlace('pier')}>
          At pier
        </button>
        <button type="button" className={place === 'town' ? 'on' : ''} onClick={() => onPlace('town')}>
          In town
        </button>
        <button type="button" className={place === 'ruins' ? 'on' : ''} onClick={() => onPlace('ruins')}>
          At ruins
        </button>
      </div>
    </aside>
  )
}
