import type { PlatformId } from '@/types'

export type DataSourceType = 'live' | 'mock' | 'offline'

export type DashboardMap = Partial<Record<PlatformId, Record<string, unknown>>>

export const EXECUTIVE_PLATFORM_IDS: PlatformId[] = [
  'crowdstrike',
  'wazuh',
  'outpost24',
  'keeper',
  'zabbix',
]

export const EXECUTIVE_PLATFORM_LABELS: Record<PlatformId, string> = {
  crowdstrike: 'CrowdStrike (EDR)',
  wazuh: 'SIEM',
  outpost24: 'Outpost24 (VM)',
  zabbix: 'Zabbix (Infra)',
  keeper: 'Keeper (Passwords)',
}

export interface PlatformKpiSummary {
  key: string
  label: string
  value: unknown
}

export interface PlatformSummary {
  platform: string
  platformId: PlatformId
  online: boolean
  dataSource: DataSourceType
  kpis: PlatformKpiSummary[]
}

export interface ExecutiveCollectorOutput {
  statusMap: Record<PlatformId, DataSourceType>
  liveCount: number
  mockCount: number
  offlineCount: number
  onlineCount: number
  livePlatforms: string[]
  mockPlatforms: string[]
  offlinePlatforms: string[]
  platformSummary: PlatformSummary[]
}

function getDataSource(data: Record<string, unknown> | undefined): DataSourceType {
  if (!data) return 'offline'
  if (data._live === true) return 'live'
  return 'mock'
}

export function collectExecutivePlatformIntel(dashboards: DashboardMap): ExecutiveCollectorOutput {
  const statusMap = {} as Record<PlatformId, DataSourceType>

  for (const platformId of EXECUTIVE_PLATFORM_IDS) {
    statusMap[platformId] = getDataSource(dashboards[platformId])
  }

  const livePlatforms = EXECUTIVE_PLATFORM_IDS
    .filter((platformId) => statusMap[platformId] === 'live')
    .map((platformId) => EXECUTIVE_PLATFORM_LABELS[platformId].split(' (')[0])

  const mockPlatforms = EXECUTIVE_PLATFORM_IDS
    .filter((platformId) => statusMap[platformId] === 'mock')
    .map((platformId) => EXECUTIVE_PLATFORM_LABELS[platformId].split(' (')[0])

  const offlinePlatforms = EXECUTIVE_PLATFORM_IDS
    .filter((platformId) => statusMap[platformId] === 'offline')
    .map((platformId) => EXECUTIVE_PLATFORM_LABELS[platformId].split(' (')[0])

  const platformSummary: PlatformSummary[] = EXECUTIVE_PLATFORM_IDS.map((platformId) => {
    const data = dashboards[platformId]
    const dataSource = statusMap[platformId]

    if (!data) {
      return {
        platform: EXECUTIVE_PLATFORM_LABELS[platformId],
        platformId,
        online: false,
        dataSource,
        kpis: [],
      }
    }

    const kpis = data.kpis as Record<string, { value?: unknown; label?: string }> | undefined
    const kpiSummary = kpis
      ? Object.entries(kpis).slice(0, 6).map(([key, value]) => ({
          key,
          label: value?.label ?? key,
          value: value?.value ?? 'N/A',
        }))
      : []

    return {
      platform: EXECUTIVE_PLATFORM_LABELS[platformId],
      platformId,
      online: true,
      dataSource,
      kpis: kpiSummary,
    }
  })

  const liveCount = livePlatforms.length
  const mockCount = mockPlatforms.length
  const offlineCount = offlinePlatforms.length

  return {
    statusMap,
    liveCount,
    mockCount,
    offlineCount,
    onlineCount: liveCount + mockCount,
    livePlatforms,
    mockPlatforms,
    offlinePlatforms,
    platformSummary,
  }
}
