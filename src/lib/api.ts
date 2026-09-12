import fixture from './fixture'
import type { Cruise } from '../types'

const STORAGE_KEY = 'rejoin.lastCruise'

function isCruise(value: unknown): value is Cruise {
  if (!value || typeof value !== 'object') return false
  const v = value as Cruise
  return Boolean(v.ship && v.all_aboard_local && v.map?.pier)
}

export function rememberCruise(cruise: Cruise): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cruise))
  } catch {
    /* ignore quota */
  }
}

export function lastCruise(): Cruise | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return isCruise(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function loadCompanySailing(): Promise<Cruise> {
  try {
    const res = await fetch('/api/cruise', { signal: AbortSignal.timeout(2500) })
    if (!res.ok) return { ...fixture, source_tag: 'cruise_line' }
    const data = (await res.json()) as Cruise
    if (!isCruise(data)) return { ...fixture, source_tag: 'cruise_line' }
    return { ...fixture, ...data, map: data.map ?? fixture.map, source_tag: 'cruise_line' }
  } catch {
    return { ...fixture, source_tag: 'cruise_line' }
  }
}

export async function extractPlanner(file: File | null, usedSample: boolean): Promise<Cruise> {
  const base = await loadCompanySailing()
  if (usedSample || !file) {
    return { ...base, source_tag: 'cruise_line' }
  }

  const body = new FormData()
  body.append('image', file)
  try {
    const res = await fetch('/api/extract', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return { ...base, source_tag: 'fixture' }
    const data = (await res.json()) as Cruise & { source?: string }
    if (!isCruise(data)) return { ...base, source_tag: 'fixture' }
    return {
      ...base,
      ...data,
      map: data.map ?? base.map,
      source_tag: data.source === 'grok' ? 'grok' : 'fixture',
    }
  } catch {
    return { ...base, source_tag: 'fixture' }
  }
}

export async function recoverAgent(cruise: Cruise): Promise<Cruise> {
  try {
    const res = await fetch('/api/recover', {
      method: 'POST',
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return cruise
    const data = (await res.json()) as {
      port_agent?: Cruise['port_agent']
      next_port?: string
      next_port_arrival_note?: string
      fallback_transport?: string
      passport_note?: string
    }
    return {
      ...cruise,
      port_agent: data.port_agent ?? cruise.port_agent,
      next_port: data.next_port ?? cruise.next_port,
      next_port_arrival_note: data.next_port_arrival_note ?? cruise.next_port_arrival_note,
      fallback_transport: data.fallback_transport ?? cruise.fallback_transport,
      passenger: {
        ...cruise.passenger,
        passport: data.passport_note ?? cruise.passenger.passport,
      },
    }
  } catch {
    return cruise
  }
}
