import { Shield, Monitor, CheckCircle, Settings } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { useDashboard } from '@/hooks/useDashboard'
import { crowdstrikeDashboard } from '@/data/crowdstrike/dashboard'

const POLICY_DEFS = [
  { id: 'POL-001', name: 'Sensor Anti-tampering',  platform: 'All',     mode: 'Enforce', status: 'Active' },
  { id: 'POL-002', name: 'Malware Prevention',      platform: 'Windows', mode: 'Enforce', status: 'Active' },
  { id: 'POL-003', name: 'Exploit Protection',      platform: 'Windows', mode: 'Enforce', status: 'Active' },
  { id: 'POL-004', name: 'Behavioral Prevention',   platform: 'Windows', mode: 'Enforce', status: 'Active' },
  { id: 'POL-005', name: 'Script Control',          platform: 'Windows', mode: 'Enforce', status: 'Active' },
  { id: 'POL-006', name: 'USB Device Control',      platform: 'Windows', mode: 'Audit',   status: 'Active' },
  { id: 'POL-007', name: 'Firmware Analysis',       platform: 'Windows', mode: 'Enforce', status: 'Active' },
  { id: 'POL-008', name: 'Mac Prevention Policy',   platform: 'macOS',   mode: 'Enforce', status: 'Active' },
  { id: 'POL-009', name: 'Linux Prevention Policy', platform: 'Linux',   mode: 'Enforce', status: 'Active' },
  { id: 'POL-010', name: 'Network Containment',     platform: 'All',     mode: 'Manual',  status: 'Standby' },
]

export default function Policies() {
  const { data: dash, isLoading, error } = useDashboard("crowdstrike")
  const d = (dash as typeof crowdstrikeDashboard) ?? crowdstrikeDashboard

  const coveragePct    = d.kpis.protectionCoverage?.value ?? "98.6%"
  const activePolicies = POLICY_DEFS.filter(p => p.status === "Active").length

  return (
    <PageLayout title="Policies" subtitle="CrowdStrike — Prevention and detection policy management">
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
      <div className="rounded-lg px-4 py-2.5 text-xs flex items-start gap-3"
        style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)' }}>
        <Settings size={14} style={{ color: '#EAB308', flexShrink: 0, marginTop: 1 }} />
        <span style={{ color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Reference data:</strong> Policy list reflects the recommended CrowdStrike configuration.
          Live policy sync requires the <strong>Prevention Policies: Read</strong> API scope.
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Policies" value={activePolicies}      trend={0} icon={Shield} />
        <MetricCard title="Coverage"        value={String(coveragePct)} trend={d.kpis.protectionCoverage?.trend ?? 0} icon={CheckCircle} />
        <MetricCard title="Endpoints"       value={d.kpis.totalEndpoints.value} trend={d.kpis.totalEndpoints.trend} icon={Monitor} />
        <MetricCard title="Enforce Mode"    value={POLICY_DEFS.filter(p => p.mode === "Enforce").length} trend={0} icon={Settings} />
      </div>

      <div className="rounded-lg px-4 py-3 text-xs flex items-start gap-3"
        style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)" }}>
        <CheckCircle size={16} style={{ color: "#22C55E", flexShrink: 0, marginTop: 1 }} />
        <span style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text-secondary)" }}>Coverage:</strong> {String(coveragePct)} of managed
          endpoints have active prevention policies. Live policy config requires <strong>Prevention Policies: Read</strong> API scope.
        </span>
      </div>

      <BarChartWidget
        title="Endpoint Coverage by Platform"
        subtitle="Managed endpoints per operating system"
        data={d.endpointsByOS}
        dataKey="count"
        labelKey="os"
        height={200}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Prevention Policies</h2>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{POLICY_DEFS.length} policies</span>
        </div>
        <DataTable
          columns={[
            { key: "id",       label: "Policy ID",   width: "90px" },
            { key: "name",     label: "Policy Name", sortable: true },
            { key: "platform", label: "Platform" },
            { key: "mode",     label: "Mode" },
            { key: "status",   label: "Status", width: "100px", render: (v) => <StatusBadge status={String(v)} /> },
          ]}
          data={POLICY_DEFS}
        />
      </div>
    </PageLayout>
  )
}
