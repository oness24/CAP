import { Users, Bell, AlertTriangle, CheckSquare, Activity, BookOpen } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { ExecutiveSummary } from '@/components/executive/ExecutiveSummary'
import { MetricCard } from '@/components/cards/MetricCard'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { RadarChartWidget } from '@/components/charts/RadarChartWidget'
import { DataTable } from '@/components/tables/DataTable'
import { SeverityBadge } from '@/components/badges/SeverityBadge'
import { wazuhDashboard, type WazuhAlert } from '@/data/wazuh/dashboard'
import { useDashboard } from '@/hooks/useDashboard'

export default function WazuhDashboard() {
  const { data, isLoading, error } = useDashboard('wazuh')
  const d = (data as typeof wazuhDashboard) ?? wazuhDashboard
  return (
    <PageLayout title="SIEM Dashboard" subtitle="Security Information & Event Management — Alert and compliance overview">
      <ExecutiveSummary />
      {/* Data source status */}
      <div className="flex items-center gap-3">
        {isLoading && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading live data…</span>
          </div>
        )}
        {!isLoading && (
          (data as Record<string, unknown> | null)?._live ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium" style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', color: '#22C55E' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }} /> Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium" style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.25)', color: '#F97316' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#F97316' }} /> Mock
            </span>
          )
        )}
        {error && !isLoading && (
          <span className="text-xs" style={{ color: '#F87171' }}>⚠ {error}</span>
        )}
      </div>
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard title={d.kpis.totalAgents.label} value={d.kpis.totalAgents.value} trend={d.kpis.totalAgents.trend} icon={Users} />
        <MetricCard title={d.kpis.activeAlerts.label} value={d.kpis.activeAlerts.value} trend={d.kpis.activeAlerts.trend} icon={Bell} />
        <MetricCard title={d.kpis.criticalEvents.label} value={d.kpis.criticalEvents.value} trend={d.kpis.criticalEvents.trend} icon={AlertTriangle} />
        <MetricCard title={d.kpis.complianceScore.label} value={d.kpis.complianceScore.value} trend={d.kpis.complianceScore.trend} icon={CheckSquare} />
        <MetricCard title={d.kpis.agentsOnline.label} value={d.kpis.agentsOnline.value} trend={d.kpis.agentsOnline.trend} icon={Activity} />
        <MetricCard title={d.kpis.rulesTriggered.label} value={d.kpis.rulesTriggered.value} trend={d.kpis.rulesTriggered.trend} icon={BookOpen} />
      </div>

      {/* Alert trend */}
      <AreaChartWidget
        title="Alert Volume (Last 24 Hours)"
        subtitle="Security events detected by SIEM agents"
        data={d.alertTrend}
        height={220}
      />

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3">
          <BarChartWidget
            title="Top Triggered Rules"
            subtitle="Highest frequency rule activations"
            data={d.topRules}
            dataKey="count"
            labelKey="ruleId"
            layout="vertical"
            height={240}
          />
        </div>
        <div className="md:col-span-2">
          <RadarChartWidget
            title="Compliance Frameworks"
            subtitle="Coverage scores by standard"
            data={d.complianceBreakdown}
            height={240}
          />
        </div>
      </div>

      {/* Alerts Table */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Alerts</h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.recentAlerts.length} alerts shown</span>
        </div>
        <DataTable<WazuhAlert>
          columns={[
            { key: 'rule', label: 'Rule ID', sortable: true, width: '80px' },
            { key: 'description', label: 'Description' },
            { key: 'agent', label: 'Agent', sortable: true },
            { key: 'ip', label: 'Source IP', width: '120px' },
            { key: 'level', label: 'Level', width: '90px', render: (v) => <SeverityBadge severity={String(v)} /> },
            { key: 'tactic', label: 'Tactic' },
            { key: 'timestamp', label: 'Time', sortable: true },
          ]}
          data={d.recentAlerts}
        />
      </div>
    </PageLayout>
  )
}
