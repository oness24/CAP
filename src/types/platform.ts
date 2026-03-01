import type { LucideIcon } from 'lucide-react'
import type { NavItem } from './navigation'

export type PlatformId =
  | 'crowdstrike'
  | 'wazuh'
  | 'safetica'
  | 'outpost24'
  | 'keeper'
  | 'zabbix'

export interface PlatformColors {
  primary: string
  secondary: string
  glow: string
  gradient: string
}

export interface PlatformConfig {
  id: PlatformId
  name: string
  category: string
  Logo: React.FC<{ size?: number; className?: string }>
  colors: PlatformColors
  defaultRoute: string
  nav: NavItem[]
}

// Shared data types used across all platforms
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface KPIMetric {
  value: string | number
  trend?: number
  label: string
  icon?: LucideIcon
  severity?: SeverityLevel
}

export interface TimeSeriesPoint {
  time: string
  value: number
  [key: string]: string | number
}
