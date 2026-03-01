import { Scan, Clock, ShieldAlert, AlertTriangle } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { DataTable } from '@/components/tables/DataTable'
import { outpost24Dashboard } from '@/data/outpost24/dashboard'
import { useDashboard } from '@/hooks/useDashboard'

const typeColors: Record<string, string> = {
  'Full Scan':  '#EA580C',
  'Quick Scan': '#F97316',
  'Web App':    '#EAB308',
  'Network':    '#22C55E',
  'Auth':       '#3B82F6',
}

function statusColor(s: string): string {
  if (s === 'Completed')   return '#22C55E'
  if (s === 'In Progress') return '#F97316'
  if (s === 'Failed')      return '#EF4444'
  if (s === 'Scheduled')   return '#3B82F6'
  return 'var(--text-muted)'
}

type ScanRow = typeof outpost24Dashboard.scans[number]

export default function ScanResults() {
  const { data: apiData } = useDashboard('outpost24')
  const d = (apiData as typeof outpost24Dashboard) ?? outpost24Dashboard

  return (
    <PageLayout
      title="Scan Results"
      subtitle="Outpost24 — Vulnerability scan jobs, findings by severity, and coverage"
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title={d.scanKpis.scansToday.label}    value={d.scanKpis.scansToday.value}    trend={d.scanKpis.scansToday.trend}    icon={Scan} />
        <MetricCard title={d.scanKpis.avgDuration.label}   value={d.scanKpis.avgDuration.value}   trend={d.scanKpis.avgDuration.trend}   icon={Clock} trendLabel="min" />
        <MetricCard title={d.scanKpis.totalFindings.label} value={d.scanKpis.totalFindings.value} trend={d.scanKpis.totalFindings.trend} icon={ShieldAlert} />
        <MetricCard title={d.scanKpis.openFindings.label}  value={d.scanKpis.openFindings.value}  trend={d.scanKpis.openFindings.trend}  icon={AlertTriangle} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AreaChartWidget
          title="Daily Findings Trend"
          subtitle="New findings discovered per scan day (last 14 days)"
          data={d.findingsTrend}
          height={200}
        />
        <BarChartWidget
          title="Scans by Type — Last 30 Days"
          subtitle="Breakdown of scan categories executed"
          data={d.scansByType}
          dataKey="count"
          labelKey="label"
          colorMap={typeColors}
          height={200}
        />
      </div>

      {/* Scan Table */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Scans</h2>
        <DataTable<ScanRow>
          columns={[
            {
              key: 'id', label: 'Scan ID',
              render: (v) => (
                <span className="font-mono text-xs" style={{ color: 'var(--accent-primary)' }}>{String(v)}</span>
              ),
            },
            { key: 'target', label: 'Target', sortable: true },
            { key: 'type',   label: 'Type' },
            {
              key: 'status', label: 'Status',
              render: (v) => (
                <span style={{ color: statusColor(String(v)), fontWeight: 600, fontSize: '12px' }}>
                  {String(v)}
                </span>
              ),
            },
            { key: 'started',  label: 'Started',  sortable: true },
            { key: 'duration', label: 'Duration' },
            {
              key: 'critical', label: 'Crit', sortable: true,
              render: (v) => (
                <span style={{ color: Number(v) > 0 ? '#EF4444' : 'var(--text-muted)', fontWeight: 700 }}>
                  {String(v)}
                </span>
              ),
            },
            {
              key: 'high', label: 'High', sortable: true,
              render: (v) => <span style={{ color: '#F97316', fontWeight: 600 }}>{String(v)}</span>,
            },
            {
              key: 'medium', label: 'Med', sortable: true,
              render: (v) => <span style={{ color: '#EAB308', fontWeight: 600 }}>{String(v)}</span>,
            },
            {
              key: 'low', label: 'Low', sortable: true,
              render: (v) => <span style={{ color: '#22C55E', fontWeight: 600 }}>{String(v)}</span>,
            },
          ]}
          data={d.scans}
        />
      </div>
    </PageLayout>
  )
}
