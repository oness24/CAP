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
  if (s === 'New')       return '#EF4444'
  if (s === 'Patched')   return '#22C55E'
  if (s === 'Mitigated') return '#F97316'
  if (s === 'Accepted')  return '#3B82F6'
  return 'var(--text-muted)'
}

type CVERow = typeof outpost24Dashboard.cves[number]

const emptyCveKpis = {
  totalCVEs: { value: 0, trend: 0, label: 'Total CVEs Tracked' },
  criticalCVEs2: { value: 0, trend: 0, label: 'Critical CVEs' },
  patchedCVEs: { value: 0, trend: 0, label: 'CVEs Patched (30d)' },
  affectedAssets: { value: 0, trend: 0, label: 'Affected Assets' },
}

export default function CVEAnalysis() {
  const { data: apiData, isLoading, error } = useDashboard('outpost24')
  const raw = apiData as Record<string, unknown> | null
  const isLive = raw?._live === true
  const d = isLive ? (raw as typeof outpost24Dashboard) : null

  // Defensive: show only live data (or empty state) to avoid mock products
  const cveKpis = d?.cveKpis ?? emptyCveKpis
  const cves = Array.isArray(d?.cves) ? d.cves : []
  const severityPie = Array.isArray(d?.severityPie) ? d.severityPie : []
  const topAffectedProducts = Array.isArray(d?.topAffectedProducts) ? d.topAffectedProducts : []

  return (
    <PageLayout
      title="CVE Analysis"
      subtitle="Outpost24 — CVE database, severity breakdown, and affected asset mapping"
    >
      {isLoading && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading live data…</span>
        </div>
      )}
      {!isLoading && (
        <div className="flex items-center gap-3">
          {isLive ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium" style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', color: '#22C55E' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }} /> Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium" style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.25)', color: '#F97316' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#F97316' }} /> Mock
            </span>
          )}
          {error && (
            <span className="text-xs" style={{ color: '#F87171' }}>⚠ {error}</span>
          )}
        </div>
      )}
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title={cveKpis.totalCVEs?.label ?? 'Total CVEs'}       value={cveKpis.totalCVEs?.value ?? 0}      trend={cveKpis.totalCVEs?.trend ?? 0}      icon={Bug} />
        <MetricCard title={cveKpis.criticalCVEs2?.label ?? 'Critical CVEs'} value={cveKpis.criticalCVEs2?.value ?? 0}  trend={cveKpis.criticalCVEs2?.trend ?? 0}  icon={AlertTriangle} />
        <MetricCard title={cveKpis.patchedCVEs?.label ?? 'CVEs Patched'}    value={cveKpis.patchedCVEs?.value ?? 0}    trend={cveKpis.patchedCVEs?.trend ?? 0}    icon={ShieldCheck} />
        <MetricCard title={cveKpis.affectedAssets?.label ?? 'Affected Assets'} value={cveKpis.affectedAssets?.value ?? 0} trend={cveKpis.affectedAssets?.trend ?? 0} icon={Server} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PieChartWidget
          title="CVE Severity Distribution"
          subtitle="Total vulnerabilities by CVSS severity band"
          data={severityPie}
          height={220}
        />
        <BarChartWidget
          title="Top Affected Products"
          subtitle="Products with highest number of impacted assets"
          data={topAffectedProducts}
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
          data={cves as CVERow[]}
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
        />
      </div>
    </PageLayout>
  )
}
