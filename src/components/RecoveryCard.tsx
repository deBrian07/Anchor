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
      <p className="recovery-kicker">you missed it</p>
      <h2>{agent.name}</h2>
      <ul className="facts">
        <li>
          <span>passport</span>
          <strong>{cruise.passenger.passport}</strong>
        </li>
        <li>
          <span>next port</span>
          <strong>
            {cruise.next_port}
            <em>{cruise.next_port_arrival_note}</em>
          </strong>
        </li>
        <li>
          <span>who</span>
          <strong>
            {agent.name}
            <em>{agent.role}</em>
          </strong>
        </li>
        <li>
          <span>phone</span>
          <strong>{agent.phone_display}</strong>
        </li>
        <li>
          <span>backup</span>
          <strong>{cruise.fallback_transport}</strong>
        </li>
      </ul>

      <a className="call" href={`tel:${agent.phone}`} onClick={onCall}>
        call {agent.name.split(' ')[0]}
        <span>{agent.phone_display}</span>
      </a>

      <div className="script">
        <p className="script-label">say this</p>
        <ol>
          <li>
            {cruise.ship}, {cruise.passenger.booking_name}, cabin {cruise.passenger.cabin}.
          </li>
          <li>missed all-aboard at {cruise.port}. passport&apos;s in the cabin.</li>
          <li>need next-port join.</li>
          <li>where do you meet.</li>
        </ol>
      </div>

      <button type="button" className="reset-demo" onClick={onReset}>
        start over
      </button>
    </section>
  )
}
