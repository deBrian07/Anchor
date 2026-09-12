export const T40_SEC = 15 * 3600 + 50 * 60
export const T5_SEC = 16 * 3600 + 25 * 60
export const DEPARTED_SEC = 17 * 3600 + 60
export const SLIDER_MIN = 15 * 3600
export const SLIDER_MAX = 17 * 3600 + 30 * 60

export function parseHm(hm: string): number {
  if (!hm) return 0
  const parts = hm.split(':').map(Number)
  return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60
}

export function formatHm(totalSec: number): string {
  const sec = ((totalSec % 86400) + 86400) % 86400
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatHms(totalSec: number): string {
  const sec = ((totalSec % 86400) + 86400) % 86400
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatCountdown(remainSec: number): string {
  const sign = remainSec < 0 ? '-' : ''
  const abs = Math.abs(Math.floor(remainSec))
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const s = abs % 60
  if (h > 0) {
    return `${sign}${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function analogAngles(totalSec: number): { hour: number; minute: number; second: number } {
  const sec = ((totalSec % 86400) + 86400) % 86400
  const h = Math.floor(sec / 3600) % 12
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return {
    hour: h * 30 + m * 0.5,
    minute: m * 6 + s * 0.1,
    second: s * 6,
  }
}
