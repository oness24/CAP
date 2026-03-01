import { useMemo, useState, useCallback } from 'react'
import { Sparkles, Loader2, FileText, AlertTriangle, RefreshCw } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { wazuhDashboard } from '@/data/wazuh/dashboard'
import { PageLayout } from '@/layouts/PageLayout'
import { generateSecurityNarrative, generateStrategicRecommendations } from '@/lib/openai'

function fmtNum(n: number | string): string {
  const v = typeof n === 'string' ? parseInt(n.replace(/,/g, ''), 10) : n
  if (isNaN(v)) return String(n)
  return v.toLocaleString()
}

export default function Reports() {
  const { data, isLoading } = useDashboard('wazuh')
  const d = (data as any) ?? wazuhDashboard

  const [narrative, setNarrative] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<string[] | null>(null)
  const [loadingNarrative, setLoadingNarrative] = useState(false)
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [errorNarrative, setErrorNarrative] = useState<string | null>(null)
  const [errorRecs, setErrorRecs] = useState<string | null>(null)

  const agentSummary = d.agentSummary ?? { total: 0, active: 0, disconnected: 0, neverConnected: 0 }
  const totalAgents = agentSummary.total
  const activeAgents = agentSummary.active
  const vol = d.alertVolume ?? {} as Record<string, number>
  const alerts24h = vol['24h'] ?? 0
  const sev24 = d.severityBreakdown24h ?? []
  const critHigh = useMemo(() => {
    return (sev24 as any[]).filter(s => s.severity === 'Critical' || s.severity === 'High').reduce((s: number, r: any) => s + r.count, 0)
  }, [sev24])

  const coverage = totalAgents > 0 ? `${((activeAgents / totalAgents) * 100).toFixed(1)}%` : 'N/A'
  const riskRating = critHigh > 1000 ? 'Elevated' : critHigh > 100 ? 'Moderate' : 'Stable'

  const incidents = useMemo(() => {
    return (d.recentAlerts ?? []).slice(0, 15).map((a: any) => ({
      ref: a.id ?? a.rule,
      category: 'SIEM Alert',
      description: a.description ?? '',
      severity: a.level ?? 'Medium',
      status: 'Open',
    }))
  }, [d.recentAlerts])

  const periodLabel = 'Semanal'
  const now = new Date()
  const periodRange = `${new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT')} – ${now.toLocaleDateString('pt-PT')}`

  const defaultNarrative =
    `No período ${periodLabel.toLowerCase()} (${periodRange}), a monitorização Wazuh SIEM da infraestrutura CAP registou ` +
    `${totalAgents} agentes no escopo (${activeAgents} ativos), com ${fmtNum(alerts24h)} alertas nas últimas 24 horas. ` +
    `Foram detetados ${fmtNum(critHigh)} eventos de severidade elevada/crítica, priorizados pela equipa SOC. ` +
    `A classificação atual de risco é ${riskRating}, com cobertura de agentes de ${coverage}.`

  const handleGenerateNarrative = useCallback(async () => {
    setLoadingNarrative(true)
    setErrorNarrative(null)
    try {
      const text = await generateSecurityNarrative({
        platform: 'Wazuh SIEM',
        client: 'CAP',
        period: periodLabel,
        periodRange,
        totalEndpoints: totalAgents,
        activeDetections: alerts24h,
        resolvedIncidents: 0,
        openIncidents: incidents.length,
        mttr: 'N/A',
        coverage,
        criticalAlerts: critHigh,
        riskRating,
        severityBreakdown: (sev24 as any[]).map((s: any) => ({ name: s.severity, value: s.count })),
        incidents,
      })
      setNarrative(text)
    } catch (err) {
      setErrorNarrative(err instanceof Error ? err.message : 'Erro ao gerar narrativa')
    } finally {
      setLoadingNarrative(false)
    }
  }, [periodLabel, periodRange, totalAgents, alerts24h, incidents, coverage, critHigh, riskRating, sev24])

  const handleGenerateRecommendations = useCallback(async () => {
    setLoadingRecs(true)
    setErrorRecs(null)
    try {
      const recs = await generateStrategicRecommendations({
        platform: 'Wazuh SIEM',
        client: 'CAP',
        period: periodLabel,
        resolvedIncidents: 0,
        openIncidents: incidents.length,
        criticalAlerts: critHigh,
        coverage,
        riskRating,
        incidents,
        severityBreakdown: (sev24 as any[]).map((s: any) => ({ name: s.severity, value: s.count })),
        totalEndpoints: totalAgents,
      })
      setRecommendations(recs)
    } catch (err) {
      setErrorRecs(err instanceof Error ? err.message : 'Erro ao gerar recomendações')
    } finally {
      setLoadingRecs(false)
    }
  }, [periodLabel, incidents, critHigh, coverage, riskRating, sev24, totalAgents])

  return (
    <PageLayout
      title="Reports"
      subtitle="Wazuh — Executive SIEM report with AI-powered narrative"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateNarrative}
            disabled={loadingNarrative || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border disabled:opacity-50"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
          >
            {loadingNarrative ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loadingNarrative ? 'Generating...' : 'Generate AI Narrative'}
          </button>
          <button
            onClick={handleGenerateRecommendations}
            disabled={loadingRecs || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border disabled:opacity-50"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
          >
            {loadingRecs ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {loadingRecs ? 'Generating...' : 'Generate Recommendations'}
          </button>
        </div>
      }
    >
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Agents', value: totalAgents },
          { label: 'Active Agents', value: activeAgents },
          { label: 'Alerts (24h)', value: fmtNum(alerts24h) },
          { label: 'Critical+High', value: fmtNum(critHigh) },
          { label: 'Coverage', value: coverage },
        ].map(item => (
          <div key={item.label} className="rounded-xl px-4 py-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <p className="text-xl font-bold tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
            <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Executive Narrative */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={14} style={{ color: 'var(--text-secondary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Executive Narrative</h3>
        </div>
        {errorNarrative ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: '#EF4444' }}>
            <AlertTriangle size={14} />
            <span>{errorNarrative}</span>
          </div>
        ) : (
          <p className="text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>
            {narrative ?? defaultNarrative}
          </p>
        )}
      </div>

      {/* Strategic Recommendations */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} style={{ color: '#A855F7' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Strategic Recommendations</h3>
        </div>
        {errorRecs ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: '#EF4444' }}>
            <AlertTriangle size={14} />
            <span>{errorRecs}</span>
          </div>
        ) : recommendations?.length ? (
          <ul className="space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {i + 1}. {rec}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Use "Generate Recommendations" to produce AI-based action items from current Wazuh risk posture.
          </p>
        )}
      </div>
    </PageLayout>
  )
}
