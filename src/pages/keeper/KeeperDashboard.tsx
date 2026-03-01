import { Users, Lock, AlertTriangle, Shield, ClipboardList } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { ExecutiveSummary } from '@/components/executive/ExecutiveSummary'
import { MetricCard } from '@/components/cards/MetricCard'
import { ScoreCard } from '@/components/cards/ScoreCard'
import { LineChartWidget } from '@/components/charts/LineChartWidget'
import { PieChartWidget } from '@/components/charts/PieChartWidget'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { keeperDashboard, type KeeperUser } from '@/data/keeper/dashboard'
import { useDashboard } from '@/hooks/useDashboard'

export default function KeeperDashboard() {
  const { data } = useDashboard('keeper')
  const d = (data as typeof keeperDashboard) ?? keeperDashboard
  return (
    <PageLayout title="Keeper Dashboard" subtitle="Password Security — Organizational vault health and credential risk">
      <ExecutiveSummary />
      {/* KPI Row: ScoreCard + 5 metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <ScoreCard title={d.kpis.securityScore.label} score={Number(d.kpis.securityScore.value)} maxScore={100} trend={d.kpis.securityScore.trend} label="vs last week" />
        <MetricCard title={d.kpis.totalUsers.label} value={d.kpis.totalUsers.value} trend={d.kpis.totalUsers.trend} icon={Users} />
        <MetricCard title={d.kpis.weakPasswords.label} value={d.kpis.weakPasswords.value} trend={d.kpis.weakPasswords.trend} icon={Lock} />
        <MetricCard title={d.kpis.breachedPasswords.label} value={d.kpis.breachedPasswords.value} trend={d.kpis.breachedPasswords.trend} icon={AlertTriangle} />
        <MetricCard title={d.kpis.mfaAdoption.label} value={d.kpis.mfaAdoption.value} trend={d.kpis.mfaAdoption.trend} icon={Shield} trendLabel="%" />
        <MetricCard title={d.kpis.policyCompliance.label} value={d.kpis.policyCompliance.value} trend={d.kpis.policyCompliance.trend} icon={ClipboardList} trendLabel="%" />
      </div>

      {/* Score history trend */}
      <LineChartWidget
        title="Security Score History (Last 30 Days)"
        subtitle="Organizational password health over time"
        data={d.scoreHistory}
        lines={[{ key: 'value', label: 'Security Score' }]}
        height={220}
        referenceLine={{ value: 85, label: 'Target' }}
      />

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PieChartWidget
          title="Password Strength Distribution"
          subtitle="All credentials in organizational vault"
          data={d.passwordStrength}
          height={220}
        />
        <BarChartWidget
          title="Department Risk Scores"
          subtitle="Average security score per business unit"
          data={d.deptRiskScores}
          dataKey="score"
          labelKey="dept"
          layout="vertical"
          height={220}
        />
      </div>

      {/* High Risk Users Table */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>High-Risk Users</h2>
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {d.highRiskUsers.length} flagged
          </span>
        </div>
        <DataTable<KeeperUser>
          columns={[
            { key: 'user', label: 'User', sortable: true },
            { key: 'department', label: 'Department', sortable: true },
            { key: 'weakCount', label: 'Weak', sortable: true, render: (v) => (
              <span className="font-semibold" style={{ color: 'var(--status-high)' }}>{String(v)}</span>
            )},
            { key: 'reusedCount', label: 'Reused', sortable: true, render: (v) => (
              <span className="font-semibold" style={{ color: Number(v) > 0 ? 'var(--status-medium)' : 'var(--text-muted)' }}>{String(v)}</span>
            )},
            { key: 'lastLogin', label: 'Last Login', sortable: true },
            { key: 'mfaStatus', label: 'MFA', render: (v) => <StatusBadge status={String(v)} /> },
            { key: 'riskScore', label: 'Risk Score', sortable: true, render: (v) => (
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--border-default)' }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${Number(v)}%`, background: Number(v) >= 80 ? 'var(--status-critical)' : Number(v) >= 60 ? 'var(--status-high)' : 'var(--status-medium)' }} />
                </div>
                <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{String(v)}</span>
              </div>
            )},
          ]}
          data={d.highRiskUsers}
        />
      </div>
    </PageLayout>
  )
}
