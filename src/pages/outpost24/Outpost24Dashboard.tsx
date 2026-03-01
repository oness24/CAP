import { Bug, AlertTriangle, Target, Scan, Wrench, CheckSquare } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { ExecutiveSummary } from '@/components/executive/ExecutiveSummary'
import { MetricCard } from '@/components/cards/MetricCard'
import { LineChartWidget } from '@/components/charts/LineChartWidget'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { DataTable } from '@/components/tables/DataTable'
import { outpost24Dashboard, type OutpostAsset } from '@/data/outpost24/dashboard'
import { useDashboard } from '@/hooks/useDashboard'

export default function Outpost24Dashboard() {
  const { data } = useDashboard('outpost24')
  const d = (data as typeof outpost24Dashboard) ?? outpost24Dashboard
  return (
    <PageLayout title="Outpost24 Dashboard" subtitle="Vulnerability Management — Asset risk posture and remediation tracking">
      <ExecutiveSummary />
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard title={d.kpis.totalVulns.label} value={d.kpis.totalVulns.value} trend={d.kpis.totalVulns.trend} icon={Bug} />
        <MetricCard title={d.kpis.criticalCVEs.label} value={d.kpis.criticalCVEs.value} trend={d.kpis.criticalCVEs.trend} icon={AlertTriangle} />
        <MetricCard title={d.kpis.avgCVSS.label} value={d.kpis.avgCVSS.value} trend={d.kpis.avgCVSS.trend} icon={Target} trendLabel="" />
        <MetricCard title={d.kpis.assetsScanned.label} value={d.kpis.assetsScanned.value} trend={d.kpis.assetsScanned.trend} icon={Scan} />
        <MetricCard title={d.kpis.remediated7d.label} value={d.kpis.remediated7d.value} trend={d.kpis.remediated7d.trend} icon={Wrench} />
        <MetricCard title={d.kpis.patchCompliance.label} value={d.kpis.patchCompliance.value} trend={d.kpis.patchCompliance.trend} icon={CheckSquare} trendLabel="%" />
      </div>

      {/* Vulnerability trend */}
      <LineChartWidget
        title="Vulnerability Trend (Last 30 Days)"
        subtitle="Open vulnerabilities discovered vs remediated over time"
        data={d.vulnTrend}
        lines={[
          { key: 'value1', label: 'Total Open' },
          { key: 'value2', label: 'Remediated/Day', color: '#22C55E' },
        ]}
        height={220}
      />

      {/* Secondary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BarChartWidget
          title="CVSS Score Distribution"
          subtitle="Vulnerabilities grouped by severity range"
          data={d.cvssDistribution}
          dataKey="count"
          labelKey="label"
          colorMap={{ Critical: '#EF4444', High: '#F97316', Medium: '#EAB308', Low: '#22C55E' }}
          height={220}
        />

        {/* Top CVEs mini-table */}
        <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Top Critical CVEs</h3>
          <div className="flex flex-col gap-2">
            {d.topCVEs.map((cve) => (
              <div key={cve.cveId} className="flex items-center justify-between py-1.5 px-3 rounded-lg" style={{ background: 'var(--bg-overlay)' }}>
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{cve.cveId}</span>
                  <span className="text-[11px] truncate max-w-[160px]" style={{ color: 'var(--text-muted)' }}>{cve.product}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-bold" style={{ color: cve.score >= 9 ? '#EF4444' : '#F97316' }}>
                    CVSS {cve.score}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{cve.affected} assets</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Asset Risk Table */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Asset Risk Rankings</h2>
        <DataTable<OutpostAsset>
          columns={[
            { key: 'asset', label: 'Asset', sortable: true },
            { key: 'ip', label: 'IP Address' },
            { key: 'type', label: 'Type' },
            { key: 'os', label: 'OS' },
            { key: 'critical', label: 'Critical', sortable: true, render: (v) => (
              <span className="font-semibold" style={{ color: Number(v) > 0 ? 'var(--status-critical)' : 'var(--text-muted)' }}>{String(v)}</span>
            )},
            { key: 'high', label: 'High', sortable: true, render: (v) => (
              <span className="font-semibold" style={{ color: 'var(--status-high)' }}>{String(v)}</span>
            )},
            { key: 'riskScore', label: 'Risk Score', sortable: true, render: (v) => (
              <span className="font-bold text-sm" style={{ color: Number(v) >= 80 ? 'var(--status-critical)' : Number(v) >= 60 ? 'var(--status-high)' : 'var(--status-medium)' }}>
                {String(v)}
              </span>
            )},
            { key: 'lastScanned', label: 'Last Scanned', sortable: true },
          ]}
          data={d.assetRiskRankings}
        />
      </div>
    </PageLayout>
  )
}
