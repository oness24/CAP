import { format, subHours, subDays, subMinutes } from 'date-fns'
import type { TimeSeriesPoint } from '@/types'

export function generateTimeSeries(
  points: number,
  baseValue: number,
  variance: number,
  intervalMinutes = 60
): TimeSeriesPoint[] {
  return Array.from({ length: points }, (_, i) => {
    const date = subMinutes(new Date(), (points - i) * intervalMinutes)
    return {
      time: format(date, points <= 48 ? 'HH:mm' : 'MMM d'),
      value: Math.max(0, Math.round(baseValue + (Math.random() - 0.5) * variance * 2)),
    }
  })
}

export function generateDualTimeSeries(
  points: number,
  base1: number,
  base2: number,
  variance: number,
  intervalMinutes = 60
) {
  return Array.from({ length: points }, (_, i) => {
    const date = subMinutes(new Date(), (points - i) * intervalMinutes)
    return {
      time: format(date, points <= 48 ? 'HH:mm' : 'MMM d'),
      value1: Math.max(0, Math.round(base1 + (Math.random() - 0.5) * variance * 2)),
      value2: Math.max(0, Math.round(base2 + (Math.random() - 0.5) * variance * 2)),
    }
  })
}

export function ts(hoursAgo: number): string {
  return format(subHours(new Date(), hoursAgo), 'MMM d, HH:mm')
}

export function tsDays(daysAgo: number): string {
  return format(subDays(new Date(), daysAgo), 'MMM d, yyyy')
}

export function randomIP(): string {
  return `10.${r(0, 50)}.${r(1, 254)}.${r(1, 254)}`
}

export function r(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function hostname(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(4, '0')}`
}
