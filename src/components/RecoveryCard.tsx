import type { Cruise, Phase } from '../types'

type Props = {
  cruise: Cruise
  phase: Phase
  onCall: () => void
  onReset: () => void
}

export function RecoveryCard({ cruise, phase, onCall, onReset }: Props) {
  const agent = cruise.port_agent
  const calling = phase === 'calling'

  return (
    <section className={`recovery ${calling ? 'calling' : ''}`}>
      <p className="recovery-kicker">Missed the ship · {cruise.cruise_line} port agent</p>
      <h2>Call the pier desk</h2>
      <ul className="facts">
        <li>
          <span>Passport</span>
          <strong>{cruise.passenger.passport}</strong>
        </li>
        <li>
          <span>Next reachable port</span>
          <strong>
            {cruise.next_port}
            <em>{cruise.next_port_arrival_note}</em>
          </strong>
        </li>
        <li>
          <span>Port agent</span>
          <strong>
            {agent.name}
            <em>{agent.role}</em>
          </strong>
        </li>
        <li>
          <span>Phone</span>
          <strong>{agent.phone_display}</strong>
        </li>
        <li>
          <span>Join</span>
          <strong>{cruise.fallback_transport}</strong>
        </li>
      </ul>

      <a className="call" href={`tel:${agent.phone}`} onClick={onCall}>
        CALL PORT AGENT
        <span>{agent.phone_display}</span>
      </a>

      <div className="script">
        <p className="script-label">What to tell them</p>
        <ol>
          <li>
            {cruise.ship}, booking {cruise.passenger.booking_name}, cabin {cruise.passenger.cabin}.
          </li>
          <li>I missed all-aboard at {cruise.port}. Passport is in the cabin.</li>
          <li>I need the next-port join instructions.</li>
          <li>Where do I meet you.</li>
        </ol>
      </div>

      <button type="button" className="reset-demo" onClick={onReset}>
        Reset demo
      </button>
    </section>
  )
}
