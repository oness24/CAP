import type { LucideIcon } from 'lucide-react'

export interface NavBadge {
  text: string
  variant: 'blue' | 'green' | 'orange' | 'red'
}

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  path: string
  badge?: NavBadge
}
