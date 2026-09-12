import type { Cruise } from '../types'

const fixture: Cruise = {
  source: {
    kind: 'cruise_line',
    provider: 'Royal Caribbean International',
    feed: 'mock-port-operations',
    sailing_id: 'HA-WCAR-20260907',
    note: 'Mock of the cruise line sailing + all-aboard feed. Replace with a real company API later.',
  },
  ship: 'Harmony of the Seas',
  cruise_line: 'Royal Caribbean',
  port: 'Cozumel, Mexico',
  pier_name: 'Puerta Maya',
  all_aboard_local: '16:30',
  departure_local: '17:00',
  next_port: 'Roatán, Honduras',
  next_port_arrival: '08:00',
  next_port_arrival_note: 'tomorrow 08:00',
  timezone: 'America/Cancun',
  passenger: {
    booking_name: 'Chen',
    cabin: '10204',
    booking_ref: 'RC-88410204',
    passport: 'US passport left in the cabin',
  },
  port_agent: {
    name: 'Elena Vargas',
    phone: '+529878724410',
    phone_display: '+52 987 872 4410',
    role: 'Royal Caribbean port agent, pier desk',
  },
  fallback_transport:
    'First flight CUN → RTB, or ferry/air via Cancún. Ask the agent which join they will ticket.',
  map: {
    pier: { lat: 20.4786, lng: -86.953, walk_min: 3 },
    town: { lat: 20.4898, lng: -86.9462, walk_min: 12 },
    ruins: { lat: 20.5003, lng: -86.8467, walk_min: 45 },
    ship_departed: { lat: 20.476, lng: -86.972 },
  },
  source_tag: 'cruise_line',
}

export default fixture
