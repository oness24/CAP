import { useMemo } from 'react'
import { Activity, TrendingUp, Clock, BarChart3 } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { wazuhDashboard } from '@/data/wazuh/dashboard'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'
import { BarChartWidget } from '@/components/charts/BarChartWidget'

function fmtNum(n: number | string): string {
  const v = typeof n === 'string' ? parseInt(n.replace(/,/g, ''), 10) : n
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(v)
}

export default function LogAnalysis() {
  const { data, isLoading, error } = useDashboard('wazuh')
  const d = (data as any) ?? wazuhDashboard

  const vol = d.alertVolume ?? {} as Record<string, number>
  const sev24 = d.severityBreakdown24h ?? []
  const dailyTrend = d.dailyTrend ?? []
  const monthlyTrend = d.monthlyTrend ?? []

  const sevData = useMemo(() => {
    return (sev24 as { severity: string; count: number }[])
      .filter((s: any) => s.count > 0)
      .map((s: any) => ({ name: s.severity, value: s.count }))
  }, [sev24])

  return (
    <PageLayout title="Log Analysis" subtitle="SIEM — Alert volume, ingestion trends, and severity distribution">
      {/* Status banners */}
      {isLoading && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading live data…</span>
        </div>
      )}
      {error && !isLoading && (
        <div className="rounded-lg px-4 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171' }}>
          ⚠ Failed to fetch live data — showing fallback. {error}
        </div>
      )}
      {/* Volume KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard title="Alerts (24h)" value={fmtNum(vol['24h'] ?? 0)} icon={Clock} />
        <MetricCard title="Alerts (7d)" value={fmtNum(vol['7d'] ?? 0)} icon={TrendingUp} />
        <MetricCard title="Alerts (30d)" value={fmtNum(vol['30d'] ?? 0)} icon={BarChart3} />
        <MetricCard title="Alerts (90d)" value={fmtNum(vol['90d'] ?? 0)} icon={Activity} />
        <MetricCard title="Alerts (365d)" value={fmtNum(vol['365d'] ?? 0)} icon={TrendingUp} />
        <MetricCard title="Total Indexed" value={fmtNum(vol['total'] ?? 0)} icon={BarChart3} />
      </div>

      {/* Hourly trend 24h */}
      <AreaChartWidget
        title="Hourly Alert Volume (Last 24 Hours)"
        subtitle="Security events per hour across all CAP agents"
        data={d.alertTrend ?? []}
        height={220}
      />

      {/* Daily + Monthly trends side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AreaChartWidget
          title="Daily Alert Volume (Last 7 Days)"
          subtitle="Aggregated daily event counts"
          data={dailyTrend}
          height={200}
        />
        <AreaChartWidget
          title="Monthly Alert Volume (Last 90 Days)"
          subtitle="Monthly ingestion trend"
          data={monthlyTrend}
          height={200}
        />
      </div>

      {/* Severity distribution (24h) as bar chart */}
      {sevData.length > 0 && (
        <BarChartWidget
          title="Severity Distribution (Last 24 Hours)"
          subtitle="Alerts grouped by SIEM severity level"
          data={sevData}
          dataKey="value"
          labelKey="name"
          height={200}
        />
      )}

      {/* Raw volume table */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Alert Volume Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: 'Last 24h', key: '24h' },
            { label: 'Last 7 Days', key: '7d' },
            { label: 'Last 30 Days', key: '30d' },
            { label: 'Last 90 Days', key: '90d' },
            { label: 'Last 365 Days', key: '365d' },
            { label: 'All Time', key: 'total' },
          ].map(p => (
            <div key={p.key} className="rounded-lg px-3 py-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {(vol[p.key] ?? 0).toLocaleString()}
              </p>
              <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.label}</p>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  )
}
