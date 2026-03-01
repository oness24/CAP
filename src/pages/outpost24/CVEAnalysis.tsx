import { Bug, AlertTriangle, ShieldCheck, Server } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { PieChartWidget } from '@/components/charts/PieChartWidget'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { DataTable } from '@/components/tables/DataTable'
import { outpost24Dashboard } from '@/data/outpost24/dashboard'
import { useDashboard } from '@/hooks/useDashboard'

function severityColor(s: string): string {
  if (s === 'Critical') return '#EF4444'
  if (s === 'High')     return '#F97316'
  if (s === 'Medium')   return '#EAB308'
  return '#22C55E'
}

function statusColor(s: string): string {
  if (s === 'Active')    return '#EF4444'
  if (s === 'Patched')   return '#22C55E'
  if (s === 'Mitigated') return '#F97316'
  if (s === 'Accepted')  return '#3B82F6'
  return 'var(--text-muted)'
}

type CVERow = typeof outpost24Dashboard.cves[number]

export default function CVEAnalysis() {
  const { data: apiData } = useDashboard('outpost24')
  const d = (apiData as typeof outpost24Dashboard) ?? outpost24Dashboard

  return (
    <PageLayout
      title="CVE Analysis"
      subtitle="Outpost24 — CVE database, severity breakdown, and affected asset mapping"
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title={d.cveKpis.totalCVEs.label}      value={d.cveKpis.totalCVEs.value}      trend={d.cveKpis.totalCVEs.trend}      icon={Bug} />
        <MetricCard title={d.cveKpis.criticalCVEs2.label}  value={d.cveKpis.criticalCVEs2.value}  trend={d.cveKpis.criticalCVEs2.trend}  icon={AlertTriangle} />
        <MetricCard title={d.cveKpis.patchedCVEs.label}    value={d.cveKpis.patchedCVEs.value}    trend={d.cveKpis.patchedCVEs.trend}    icon={ShieldCheck} />
        <MetricCard title={d.cveKpis.affectedAssets.label} value={d.cveKpis.affectedAssets.value} trend={d.cveKpis.affectedAssets.trend} icon={Server} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PieChartWidget
          title="CVE Severity Distribution"
          subtitle="Total vulnerabilities by CVSS severity band"
          data={d.severityPie}
          height={220}
        />
        <BarChartWidget
          title="Top Affected Products"
          subtitle="Products with highest number of impacted assets"
          data={d.topAffectedProducts}
          dataKey="count"
          labelKey="label"
          layout="vertical"
          height={220}
        />
      </div>

      {/* CVE Table */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>CVE Database</h2>
        <DataTable<CVERow>
          columns={[
            {
              key: 'cveId', label: 'CVE ID',
              render: (v) => (
                <span className="font-mono text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
                  {String(v)}
                </span>
              ),
            },
            {
              key: 'score', label: 'CVSS', sortable: true,
              render: (v) => (
                <span className="font-bold text-sm" style={{ color: Number(v) >= 9 ? '#EF4444' : Number(v) >= 7 ? '#F97316' : '#EAB308' }}>
                  {String(v)}
                </span>
              ),
            },
            {
              key: 'severity', label: 'Severity',
              render: (v) => (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    color: severityColor(String(v)),
                    background: `${severityColor(String(v))}18`,
                    border: `1px solid ${severityColor(String(v))}33`,
                  }}
                >
                  {String(v)}
                </span>
              ),
            },
            { key: 'product',   label: 'Product',       sortable: true },
            {
              key: 'affected', label: 'Affected Assets', sortable: true,
              render: (v) => (
                <span className="font-semibold" style={{ color: Number(v) > 20 ? '#EF4444' : 'var(--text-secondary)' }}>
                  {String(v)}
                </span>
              ),
            },
            { key: 'published', label: 'Published',     sortable: true },
            {
              key: 'status', label: 'Status',
              render: (v) => (
                <span style={{ color: statusColor(String(v)), fontWeight: 600, fontSize: '12px' }}>
                  {String(v)}
                </span>
              ),
            },
          ]}
          data={d.cves}
        />
      </div>
    </PageLayout>
  )
}
