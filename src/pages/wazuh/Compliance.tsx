import { useMemo } from 'react'
import { ShieldCheck, CheckCircle2, AlertTriangle, Users } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { wazuhDashboard } from '@/data/wazuh/dashboard'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { RadarChartWidget } from '@/components/charts/RadarChartWidget'
import { BarChartWidget } from '@/components/charts/BarChartWidget'

export default function Compliance() {
  const { data, isLoading, error } = useDashboard('wazuh')
  const d = (data as any) ?? wazuhDashboard

  const frameworks: { framework: string; score: number }[] = d.complianceBreakdown ?? []
  const avgScore = useMemo(() => {
    if (!frameworks.length) return 0
    return Math.round(frameworks.reduce((s, f) => s + f.score, 0) / frameworks.length)
  }, [frameworks])

  const agentSummary = d.agentSummary ?? { total: 0, active: 0, disconnected: 0, neverConnected: 0 }
  const sevAll = d.severityBreakdownAll ?? d.severityBreakdown24h ?? []
  const critHigh = useMemo(() => {
    return (sevAll as any[]).filter(s => s.severity === 'Critical' || s.severity === 'High').reduce((s: number, r: any) => s + r.count, 0)
  }, [sevAll])

  const barData = useMemo(() => {
    return frameworks.map(f => ({ name: f.framework, value: f.score }))
  }, [frameworks])

  return (
    <PageLayout title="Compliance" subtitle="SIEM — Framework compliance scores and posture overview">
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
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Average Score" value={`${avgScore}%`} icon={ShieldCheck} />
        <MetricCard title="Frameworks" value={frameworks.length} icon={CheckCircle2} />
        <MetricCard title="Critical+High Events" value={critHigh.toLocaleString()} icon={AlertTriangle} />
        <MetricCard title="Active Agents" value={`${agentSummary.active}/${agentSummary.total}`} icon={Users} />
      </div>

      {/* Radar + Bar side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RadarChartWidget
          title="Compliance Radar"
          subtitle="Coverage scores by security framework"
          data={frameworks}
          height={300}
        />
        <BarChartWidget
          title="Framework Scores"
          subtitle="Compliance percentage per standard"
          data={barData}
          dataKey="value"
          labelKey="name"
          height={300}
        />
      </div>

      {/* Framework detail cards */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Framework Compliance Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {frameworks.map(f => (
            <div key={f.framework} className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f.framework}</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: f.score >= 90 ? '#10B981' : f.score >= 75 ? '#F59E0B' : '#EF4444' }}>
                  {f.score}%
                </span>
              </div>
              <div className="h-2 rounded-full" style={{ background: 'var(--bg-surface)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${f.score}%`, background: f.score >= 90 ? '#10B981' : f.score >= 75 ? '#F59E0B' : '#EF4444' }} />
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                {f.score >= 90 ? 'Compliant — within acceptable thresholds' : f.score >= 75 ? 'Needs attention — minor gaps detected' : 'Non-compliant — remediation required'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  )
}
