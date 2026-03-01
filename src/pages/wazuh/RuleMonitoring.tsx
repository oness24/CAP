import { useMemo } from 'react'
import { BookOpen, Shield, AlertTriangle } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { wazuhDashboard } from '@/data/wazuh/dashboard'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { BarChartWidget } from '@/components/charts/BarChartWidget'


export default function RuleMonitoring() {
  const { data } = useDashboard('wazuh')
  const d = (data as any) ?? wazuhDashboard

  const topRules: any[] = d.topRules ?? []
  const sevAll = d.severityBreakdownAll ?? d.severityBreakdown24h ?? []

  const totalRuleHits = useMemo(() => topRules.reduce((s: number, r: any) => s + (r.count ?? 0), 0), [topRules])
  const criticalHigh = useMemo(() => {
    return (sevAll as any[]).filter(s => s.severity === 'Critical' || s.severity === 'High').reduce((s: number, r: any) => s + r.count, 0)
  }, [sevAll])

  const sevChart = useMemo(() => {
    return (sevAll as { severity: string; count: number }[]).filter(s => s.count > 0).map(s => ({ name: s.severity, value: s.count }))
  }, [sevAll])

  return (
    <PageLayout title="Rule Monitoring" subtitle="SIEM — Detection rule activations, severity, and tuning priorities">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Top Rules" value={topRules.length} icon={BookOpen} />
        <MetricCard title="Rule Hits (Top 10)" value={totalRuleHits.toLocaleString()} icon={Shield} />
        <MetricCard title="Critical + High" value={criticalHigh.toLocaleString()} icon={AlertTriangle} />
        <MetricCard title="Unique Severities" value={sevChart.length} icon={Shield} />
      </div>

      {/* Top rules bar chart */}
      <BarChartWidget
        title="Top Triggered Rules"
        subtitle="Highest frequency rule activations across all agents"
        data={topRules.map((r: any) => ({ ruleId: r.ruleId || '—', description: r.description?.slice(0, 60) || '—', count: r.count }))}
        dataKey="count"
        labelKey="description"
        layout="vertical"
        height={320}
      />

      {/* Severity distribution */}
      {sevChart.length > 0 && (
        <BarChartWidget
          title="Severity Distribution (All Time)"
          subtitle="Alert counts by Wazuh severity level"
          data={sevChart}
          dataKey="value"
          labelKey="name"
          height={200}
        />
      )}

      {/* Detailed rules table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Top Triggered Rules — Detail</h3>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{topRules.length} rules</span>
        </div>
        <div className="grid text-[10px] font-semibold uppercase tracking-wider px-4 py-2"
          style={{ gridTemplateColumns: '70px 2fr 120px 100px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          <span>Rule ID</span><span>Description</span><span>Hit Count</span><span>% of Top 10</span>
        </div>
        {topRules.map((r: any, i: number) => (
          <div key={r.ruleId || i} className="grid items-center px-4 py-3"
            style={{
              gridTemplateColumns: '70px 2fr 120px 100px',
              borderBottom: i < topRules.length - 1 ? '1px solid var(--border-subtle)' : undefined,
            }}>
            <span className="text-xs font-mono" style={{ color: '#7C3AED' }}>{r.ruleId || '—'}</span>
            <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }} title={r.description}>{r.description}</span>
            <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{(r.count ?? 0).toLocaleString()}</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                <div className="h-full rounded-full" style={{ width: `${totalRuleHits ? ((r.count ?? 0) / totalRuleHits * 100) : 0}%`, background: '#7C3AED' }} />
              </div>
              <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {totalRuleHits ? ((r.count ?? 0) / totalRuleHits * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  )
}
