import { useMemo, useState, useCallback } from 'react'
import { Sparkles, Loader2, FileText, AlertTriangle, RefreshCw } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { zabbixDashboard } from '@/data/zabbix/dashboard'
import { PageLayout } from '@/layouts/PageLayout'
import { generateSecurityNarrative, generateStrategicRecommendations } from '@/lib/openai'

function parsePct(v: string | number | undefined): number {
	if (typeof v === 'number') return v
	if (!v) return 0
	return Number(String(v).replace('%', '').trim()) || 0
}

function getRiskRating(availability: number, hostsDown: number, critical: number): string {
	if (critical > 0 || availability < 95 || hostsDown > 20) return 'Critical'
	if (availability < 97 || hostsDown > 10) return 'Elevated'
	if (availability < 99 || hostsDown > 0) return 'Moderate'
	return 'Stable'
}

export default function Reports() {
	const { data, isLoading } = useDashboard('zabbix')
	const d = (data as typeof zabbixDashboard) ?? zabbixDashboard

	const [narrative, setNarrative] = useState<string | null>(null)
	const [recommendations, setRecommendations] = useState<string[] | null>(null)
	const [loadingNarrative, setLoadingNarrative] = useState(false)
	const [loadingRecs, setLoadingRecs] = useState(false)
	const [errorNarrative, setErrorNarrative] = useState<string | null>(null)
	const [errorRecs, setErrorRecs] = useState<string | null>(null)

	const totalHosts = Number(d.kpis.totalHosts?.value ?? 0)
	const hostsDown = Number(d.kpis.hostsDown?.value ?? 0)
	const hostsDisabled = Number((d.kpis as Record<string, { value: string | number }>).hostsDisabled?.value ?? 0)
	const activeTriggers = Number(d.kpis.activeTriggers?.value ?? 0)
	const availability = parsePct(d.kpis.avgAvailability?.value)

	const criticalCount = useMemo(() => {
		return (d.triggersBySeverity ?? [])
			.filter(s => s.name.toLowerCase() === 'disaster' || s.name.toLowerCase() === 'high')
			.reduce((sum, s) => sum + s.value, 0)
	}, [d.triggersBySeverity])

	const riskRating = getRiskRating(availability, hostsDown, criticalCount)

	const incidents = useMemo(() => {
		return (d.activeProblems ?? []).slice(0, 15).map(p => ({
			ref: p.id,
			category: 'Infrastructure Monitoring',
			description: p.problem,
			severity: p.severity,
			status: 'Open',
		}))
	}, [d.activeProblems])

	const periodLabel = 'Semanal'
	const now = new Date()
	const periodRange = `${new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT')} – ${now.toLocaleDateString('pt-PT')}`

	const defaultNarrative =
		`No período ${periodLabel.toLowerCase()} (${periodRange}), a monitorização Zabbix da infraestrutura CAP reportou ` +
		`${totalHosts} hosts no escopo, com ${hostsDown} indisponíveis e ${hostsDisabled} desativados, mantendo disponibilidade média de ${availability.toFixed(2)}%. ` +
		`Foram registados ${activeTriggers} triggers ativos e ${criticalCount} eventos de severidade elevada/crítica, priorizados pela equipa SOC. ` +
		`A classificação atual de risco operacional é ${riskRating}, com foco na redução do backlog de indisponibilidades e hardening dos ativos críticos.`

	const handleGenerateNarrative = useCallback(async () => {
		setLoadingNarrative(true)
		setErrorNarrative(null)
		try {
			const text = await generateSecurityNarrative({
				platform: 'Zabbix Infrastructure Monitoring',
				client: 'CAP',
				period: periodLabel,
				periodRange,
				totalEndpoints: totalHosts,
				activeDetections: activeTriggers,
				resolvedIncidents: 0,
				openIncidents: incidents.length,
				mttr: 'N/A',
				coverage: `${availability.toFixed(2)}%`,
				criticalAlerts: criticalCount,
				riskRating,
				severityBreakdown: (d.triggersBySeverity ?? []).map(s => ({ name: s.name, value: s.value })),
				incidents,
			})
			setNarrative(text)
		} catch (err) {
			setErrorNarrative(err instanceof Error ? err.message : 'Erro ao gerar narrativa')
		} finally {
			setLoadingNarrative(false)
		}
	}, [periodLabel, periodRange, totalHosts, activeTriggers, incidents.length, availability, criticalCount, riskRating, d.triggersBySeverity, incidents])

	const handleGenerateRecommendations = useCallback(async () => {
		setLoadingRecs(true)
		setErrorRecs(null)
		try {
			const recs = await generateStrategicRecommendations({
				platform: 'Zabbix Infrastructure Monitoring',
				client: 'CAP',
				period: periodLabel,
				resolvedIncidents: 0,
				openIncidents: incidents.length,
				criticalAlerts: criticalCount,
				coverage: `${availability.toFixed(2)}%`,
				riskRating,
				incidents,
				severityBreakdown: (d.triggersBySeverity ?? []).map(s => ({ name: s.name, value: s.value })),
				totalEndpoints: totalHosts,
			})
			setRecommendations(recs)
		} catch (err) {
			setErrorRecs(err instanceof Error ? err.message : 'Erro ao gerar recomendações')
		} finally {
			setLoadingRecs(false)
		}
	}, [periodLabel, incidents, criticalCount, availability, riskRating, d.triggersBySeverity, totalHosts])

	return (
		<PageLayout
			title="Reports"
			subtitle="Zabbix — Executive infrastructure report with AI narrative"
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
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
				{[
					{ label: 'Total Hosts', value: totalHosts },
					{ label: 'Hosts Down', value: hostsDown },
					{ label: 'Disabled', value: hostsDisabled },
					{ label: 'Active Triggers', value: activeTriggers },
					{ label: 'Availability', value: `${availability.toFixed(2)}%` },
				].map(item => (
					<div
						key={item.label}
						className="rounded-xl px-4 py-4"
						style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
					>
						<p className="text-xl font-bold tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
						<p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
					</div>
				))}
			</div>

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
						Use “Generate Recommendations” to produce AI-based action items from current Zabbix risk posture.
					</p>
				)}
			</div>
		</PageLayout>
	)
}
