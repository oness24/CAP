import { ArrowLeftRight, ShieldAlert, UserX, Users, FileX, Shield } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { ExecutiveSummary } from '@/components/executive/ExecutiveSummary'
import { MetricCard } from '@/components/cards/MetricCard'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'
import { PieChartWidget } from '@/components/charts/PieChartWidget'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { safeticaDashboard, type SafeticaViolation } from '@/data/safetica/dashboard'
import { useDashboard } from '@/hooks/useDashboard'

export default function SafeticaDashboard() {
  const { data } = useDashboard('safetica')
  const d = (data as typeof safeticaDashboard) ?? safeticaDashboard
  return (
    <PageLayout title="Safetica Dashboard" subtitle="Data Loss Prevention — Transfer monitoring and policy enforcement">
      <ExecutiveSummary />
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard title={d.kpis.dataTransfers.label} value={d.kpis.dataTransfers.value} trend={d.kpis.dataTransfers.trend} icon={ArrowLeftRight} />
        <MetricCard title={d.kpis.blockedTransfers.label} value={d.kpis.blockedTransfers.value} trend={d.kpis.blockedTransfers.trend} icon={ShieldAlert} />
        <MetricCard title={d.kpis.policyViolations.label} value={d.kpis.policyViolations.value} trend={d.kpis.policyViolations.trend} icon={UserX} />
        <MetricCard title={d.kpis.usersAtRisk.label} value={d.kpis.usersAtRisk.value} trend={d.kpis.usersAtRisk.trend} icon={Users} />
        <MetricCard title={d.kpis.sensitiveFiles.label} value={d.kpis.sensitiveFiles.value} trend={d.kpis.sensitiveFiles.trend} icon={FileX} />
        <MetricCard title={d.kpis.dlpCoverage.label} value={d.kpis.dlpCoverage.value} trend={d.kpis.dlpCoverage.trend} icon={Shield} />
      </div>

      {/* Transfer trend */}
      <AreaChartWidget
        title="Data Transfer Activity (Last 24 Hours)"
        subtitle="All outbound data movement monitored by DLP engine"
        data={d.transferTrend}
        height={220}
      />

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PieChartWidget
          title="Channel Breakdown"
          subtitle="Transfer volume by exfiltration channel"
          data={d.channelBreakdown}
          height={220}
        />
        <BarChartWidget
          title="Violations by Data Type"
          subtitle="Policy violations by data classification"
          data={d.violationsByType}
          dataKey="count"
          labelKey="type"
          height={220}
        />
      </div>

      {/* Violations Table */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Policy Violations</h2>
        <DataTable<SafeticaViolation>
          columns={[
            { key: 'user', label: 'User', sortable: true },
            { key: 'department', label: 'Department', sortable: true },
            { key: 'channel', label: 'Channel' },
            { key: 'classification', label: 'Data Classification' },
            { key: 'action', label: 'Action', render: (v) => <StatusBadge status={String(v)} /> },
            { key: 'riskScore', label: 'Risk Score', sortable: true, render: (v) => (
              <span className="font-semibold" style={{ color: Number(v) >= 80 ? 'var(--status-critical)' : Number(v) >= 60 ? 'var(--status-high)' : 'var(--status-low)' }}>
                {String(v)}
              </span>
            )},
            { key: 'timestamp', label: 'Time', sortable: true },
          ]}
          data={d.recentViolations}
        />
      </div>
    </PageLayout>
  )
}
