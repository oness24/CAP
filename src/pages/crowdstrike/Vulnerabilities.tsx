import { useState } from 'react'
import { ShieldAlert, Cpu, AlertTriangle, Activity, X, ExternalLink, Monitor, Tag, Clock, Shield } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { PieChartWidget } from '@/components/charts/PieChartWidget'
import { DataTable } from '@/components/tables/DataTable'
import { SeverityBadge } from '@/components/badges/SeverityBadge'
import { useDashboard } from '@/hooks/useDashboard'
import { crowdstrikeDashboard } from '@/data/crowdstrike/dashboard'

interface Finding {
  id: string; finding: string; host: string; risk: string; tactic: string; detected_at: string
}

const SEV_COLOR: Record<string, string> = {
  Critical: '#F87171', High: '#FB923C', Medium: '#FBBF24', Low: '#34D399',
}

const MITRE_INFO: Record<string, { id: string; desc: string }> = {
  'Process Injection':   { id: 'T1055', desc: 'Adversaries inject code into processes to evade process-based defenses and escalate privileges.' },
  'Credential Dumping':  { id: 'T1003', desc: 'Adversaries attempt to dump credentials to obtain account login and credential material.' },
  'Command & Script':    { id: 'T1059', desc: 'Adversaries may abuse command and script interpreters to execute commands, scripts, or binaries.' },
  'Data Encryption':     { id: 'T1486', desc: 'Adversaries may encrypt data on target systems or on large numbers of systems in a network to interrupt availability.' },
  'Phishing':            { id: 'T1566', desc: 'Adversaries may send phishing messages to gain access to victim systems.' },
  'C2 Communication':    { id: 'T1071', desc: 'Adversaries may communicate using application layer protocols to avoid detection.' },
  'Valid Accounts':      { id: 'T1078', desc: 'Adversaries may obtain and abuse credentials of existing accounts as a means of gaining access.' },
  'Boot Persistence':    { id: 'T1542', desc: 'Adversaries may use pre-OS boot mechanisms to achieve persistence or evade defenses.' },
  'Remote Services':     { id: 'T1021', desc: 'Adversaries may use valid accounts to log into a service that accepts remote connections.' },
  'Brute Force':         { id: 'T1110', desc: 'Adversaries may use brute force techniques to gain access to accounts.' },
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function FindingModal({ finding, onClose }: { finding: Finding; onClose: () => void }) {
  const sevColor = SEV_COLOR[finding.risk] ?? '#94A3B8'
  const mitre = MITRE_INFO[finding.finding]
  const falconUrl = `https://falcon.us-2.crowdstrike.com/activity/detections`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${sevColor}18`, border: `1px solid ${sevColor}40` }}>
              <ShieldAlert size={18} style={{ color: sevColor }} />
            </div>
            <div>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{finding.id}</p>
              <h2 className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>Risk Indicator Detail</h2>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10">
            <X size={15} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">

          {/* Risk badge */}
          <div className="flex items-center gap-3">
            <SeverityBadge severity={finding.risk} />
            {mitre && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(29,106,229,0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(29,106,229,0.3)' }}>
                {mitre.id}
              </span>
            )}
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Tag, label: 'Technique', value: finding.finding },
              { icon: Shield, label: 'Tactic', value: finding.tactic || '—' },
              { icon: Monitor, label: 'Affected Host', value: finding.host },
              { icon: Clock, label: 'Detected', value: fmtDate(finding.detected_at) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <Icon size={14} style={{ color: 'var(--accent-primary)', marginTop: 2, flexShrink: 0 }} />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-sm font-medium mt-0.5 break-words" style={{ color: 'var(--text-primary)' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* MITRE ATT&CK context */}
          {mitre ? (
            <div className="rounded-xl px-4 py-4 flex flex-col gap-2"
              style={{ background: 'rgba(29,106,229,0.08)', border: '1px solid rgba(29,106,229,0.2)' }}>
              <div className="flex items-center gap-2">
                <Shield size={14} style={{ color: 'var(--accent-primary)' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  MITRE ATT&CK — {mitre.id}
                </p>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{mitre.desc}</p>
              <a href={`https://attack.mitre.org/techniques/${mitre.id}/`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs mt-1 transition-colors"
                style={{ color: 'var(--accent-primary)' }}>
                <ExternalLink size={11} />
                View on MITRE ATT&CK
              </a>
            </div>
          ) : (
            <div className="rounded-xl px-4 py-3"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Technique derived from observed endpoint behavior. Enable CrowdStrike Spotlight for full CVE-level vulnerability data.
              </p>
            </div>
          )}

          {/* Risk level bar */}
          <div className="rounded-xl px-4 py-3 flex flex-col gap-2"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Risk Level</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-overlay)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: finding.risk === 'Critical' ? '100%' : finding.risk === 'High' ? '75%' : finding.risk === 'Medium' ? '50%' : '25%',
                    background: sevColor,
                  }} />
              </div>
              <span className="text-xs font-semibold" style={{ color: sevColor }}>{finding.risk}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border-default)' }}>
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border transition-colors"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)', background: 'transparent' }}>
            Close
          </button>
          <a href={falconUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium"
            style={{ background: 'var(--accent-primary)', color: '#fff' }}>
            <ExternalLink size={14} />
            View in Falcon
          </a>
        </div>
      </div>
    </div>
  )
}

export default function Vulnerabilities() {
  const [selected, setSelected] = useState<Finding | null>(null)
  const { data: dash } = useDashboard('crowdstrike')
  const d = (dash as typeof crowdstrikeDashboard) ?? crowdstrikeDashboard

  const sevMap: Record<string, number> = {}
  for (const s of d.severityBreakdown) sevMap[s.name] = s.value
  const total = Object.values(sevMap).reduce((a, b) => a + b, 0) || 1

  const riskScore = Math.min(100, Math.round(
    ((sevMap.Critical ?? 0) * 4 + (sevMap.High ?? 0) * 2 + (sevMap.Medium ?? 0)) / total * 25
  ))

  const TECHNIQUE_RISK: Record<string, string> = {
    'Process Injection': 'High', 'Credential Dumping': 'Critical',
    'Command & Script': 'High', 'Data Encryption': 'Critical',
    'Phishing': 'Medium', 'C2 Communication': 'High',
    'Valid Accounts': 'Medium', 'Boot Persistence': 'Low',
    'Remote Services': 'Medium', 'Brute Force': 'Low',
  }

  const findings: Finding[] = d.recentDetections.map((det, i) => {
    const parts = det.technique.split('—')
    const label = parts.length > 1 ? parts[1].trim() : det.technique
    const tactic = parts.length > 1 ? parts[0].trim() : ''
    return {
      id:          'VF-' + String(i + 1).padStart(3, '0'),
      finding:     label,
      host:        det.hostname,
      risk:        TECHNIQUE_RISK[label] ?? det.severity,
      tactic,
      detected_at: det.timestamp,
    }
  })

  return (
    <PageLayout title="Vulnerabilities" subtitle="CrowdStrike — Endpoint risk posture from observed techniques">
      {selected && <FindingModal finding={selected} onClose={() => setSelected(null)} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Risk Score" value={riskScore + '/100'}           trend={0} icon={ShieldAlert} />
        <MetricCard title="Critical"   value={sevMap.Critical ?? 0}         trend={0} icon={AlertTriangle} />
        <MetricCard title="High Risk"  value={sevMap.High ?? 0}             trend={0} icon={Activity} />
        <MetricCard title="Endpoints"  value={d.kpis.totalEndpoints.value}  trend={d.kpis.totalEndpoints.trend} icon={Cpu} />
      </div>

      <div className="rounded-lg px-4 py-3 text-xs flex items-start gap-3"
        style={{ background: 'rgba(29,106,229,0.08)', border: '1px solid rgba(29,106,229,0.25)' }}>
        <ShieldAlert size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 1 }} />
        <span style={{ color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Note:</strong> CVE-level data requires the CrowdStrike
          Spotlight module. Findings below are derived from observed attack techniques and represent active risk indicators.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PieChartWidget
          title="Alert Severity Distribution"
          subtitle="Active threat severity breakdown"
          data={d.severityBreakdown}
          height={220}
        />
        <div className="flex flex-col gap-3 p-4 rounded-xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Endpoint Risk Summary</h3>
          {d.severityBreakdown.map(({ name, value, color }) => {
            const pct = Math.round((value / total) * 100)
            return (
              <div key={name} className="flex items-center gap-3">
                <span className="w-16 text-xs" style={{ color: 'var(--text-muted)' }}>{name}</span>
                <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="h-full rounded-full" style={{ width: pct + '%', background: color }} />
                </div>
                <span className="w-16 text-xs text-right" style={{ color: 'var(--text-secondary)' }}>
                  {value} ({pct}%)
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Risk Indicators from Recent Detections
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Click any row to view technique detail and MITRE ATT&CK context</p>
        <DataTable<Finding>
          columns={[
            { key: 'id',          label: 'Finding ID',  width: '100px' },
            { key: 'finding',     label: 'Technique',   sortable: true },
            { key: 'tactic',      label: 'Tactic' },
            { key: 'host',        label: 'Affected Host' },
            { key: 'risk',        label: 'Risk Level',  width: '100px', render: (v) => <SeverityBadge severity={String(v)} /> },
            { key: 'detected_at', label: 'Detected',    sortable: true },
          ]}
          data={findings}
          onRowClick={(row) => setSelected(row)}
        />
      </div>
    </PageLayout>
  )
}
