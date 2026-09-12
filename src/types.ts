export type Phase = 'empty' | 'armed' | 'late' | 'missed' | 'calling'
export type Place = 'pier' | 'town' | 'ruins' | 'custom'
export type LogLevel = 'info' | 'warn' | 'alert'

export type LatLng = {
  lat: number
  lng: number
}

export type WalkPoint = LatLng & {
  walk_min: number
}

export type Cruise = {
  source?: {
    kind: string
    provider: string
    feed: string
    sailing_id: string
    note?: string
  }
  ship: string
  cruise_line: string
  port: string
  pier_name?: string
  all_aboard_local: string
  departure_local: string
  next_port: string
  next_port_arrival: string
  next_port_arrival_note: string
  timezone: string
  passenger: {
    booking_name: string
    cabin: string
    booking_ref?: string
    passport: string
  }
  port_agent: {
    name: string
    phone: string
    phone_display: string
    role: string
  }
  fallback_transport: string
  map: {
    pier: WalkPoint
    town: WalkPoint
    ruins: WalkPoint
    ship_departed: LatLng
  }
  source_tag?: 'fixture' | 'grok' | 'cruise_line'
}

export type LogLine = {
  id: number
  level: LogLevel
  text: string
}

export type ChatBubble = {
  id: number
  from: 'me' | 'them'
  text: string
  photo?: string
}

export type BotState = {
  phase: Phase
  now_sec: number
  place: Place
  you: LatLng | null
  calling: boolean
  said_ruins: boolean
  recovery_ready: boolean
  show_recovery: boolean
  departed: boolean
  walk_min: number
  cruise: Cruise | null
  photo: string | null
  logs: LogLine[]
  bubbles: ChatBubble[]
  last_command: string | null
}
