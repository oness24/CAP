import { useRef, useState, useCallback } from 'react'
import {
  Shield, Printer, X, Download,
  TrendingUp, TrendingDown, Minus, ShieldAlert, AlertTriangle,
  Activity, Cpu, CheckCircle, Clock, Users, Server, BookOpen,
  Sparkles, Loader2,
} from 'lucide-react'
import { generateSecurityNarrative, generateStrategicRecommendations } from '@/lib/openai'
import { startOfWeek, endOfWeek, startOfMonth, startOfYear, subMonths } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { useReactToPrint } from 'react-to-print'
import { PageLayout } from '@/layouts/PageLayout'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'
import { useDashboard } from '@/hooks/useDashboard'
import { usePlatform } from '@/hooks/usePlatform'
import { crowdstrikeDashboard } from '@/data/crowdstrike/dashboard'
import { getWeeklyReport, getRatingStyle, type WeeklyMetric } from '@/data/executive/weeklyReports'
import { PrintReport } from '@/components/executive/PrintReport'

// Tradução dos níveis de risco para português
const RATING_PT: Record<string, string> = {
  Critical: 'CRÍTICO', Elevated: 'ELEVADO', Moderate: 'MODERADO',
  Stable: 'ESTÁVEL', Improving: 'A MELHORAR',
}

// ─── Period selector ──────────────────────────────────────────────────────────
type Period = 'semanal' | 'mensal' | '3meses' | 'anual'

const PERIOD_TABS: { id: Period; label: string; multiplier: number }[] = [
  { id: 'semanal', label: 'Semanal',  multiplier: 1  },
  { id: 'mensal',  label: 'Mensal',   multiplier: 4  },
  { id: '3meses',  label: '3 Meses',  multiplier: 13 },
  { id: 'anual',   label: 'Anual',    multiplier: 52 },
]

function getPeriodRange(period: Period): string {
  const now = new Date()
  const fmt     = (d: Date) => d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
  const fmtFull = (d: Date) => d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  switch (period) {
    case 'semanal': {
      const s = startOfWeek(now, { weekStartsOn: 1 })
      const e = endOfWeek(now, { weekStartsOn: 1 })
      return `${fmt(s)} – ${fmtFull(e)}`
    }
    case 'mensal':  return `${fmt(startOfMonth(now))} – ${fmtFull(now)}`
    case '3meses':  return `${fmt(subMonths(now, 3))} – ${fmtFull(now)}`
    case 'anual':   return `${fmt(startOfYear(now))} – ${fmtFull(now)}`
  }
}

// ─── Print Modal ──────────────────────────────────────────────────────────────
function PrintModal({
  isOpen, onClose, printRef, onPrint, periodLabel, periodRange, metrics, narrative, recommendations,
}: {
  isOpen: boolean
  onClose: () => void
  printRef: React.RefObject<HTMLDivElement>
  onPrint: () => void
  periodLabel: string
  periodRange: string
  metrics: WeeklyMetric[]
  narrative: string
  recommendations?: string[]
}) {
  const { config } = usePlatform()
  const { data: dash } = useDashboard('crowdstrike')
  const d = (dash as typeof crowdstrikeDashboard) ?? crowdstrikeDashboard
  const report = getWeeklyReport('crowdstrike')

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              position: 'fixed', inset: '24px', zIndex: 1000,
              display: 'flex', flexDirection: 'column', borderRadius: '16px',
              overflow: 'hidden', background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              boxShadow: '0 40px 120px rgba(0,0,0,0.8)',
            }}
          >
            {/* Cabeçalho do modal */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Printer size={17} color="white" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Relatório Executivo de Segurança — Pré-visualização PDF
                  </h2>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                    {config.name} · Relatório {periodLabel} · {periodRange} · CONFIDENCIAL
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={onPrint}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 20px', borderRadius: '9px', cursor: 'pointer',
                    background: 'var(--accent-gradient)', border: 'none', color: 'white',
                    fontSize: '13px', fontWeight: 600, boxShadow: '0 0 20px var(--accent-glow)',
                    letterSpacing: '0.01em',
                  }}
                >
                  <Download size={14} />
                  Baixar
                </button>
                <button
                  onClick={onClose}
                  style={{
                    width: 34, height: 34, borderRadius: 9, cursor: 'pointer', border: 'none',
                    background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Área de pré-visualização */}
            <div style={{ flex: 1, overflow: 'auto', padding: '32px', background: '#d1d5db' }}>
              <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 8px 40px rgba(0,0,0,0.25)', overflow: 'hidden', maxWidth: '860px', margin: '0 auto' }}>
                <PrintReport
                  ref={printRef}
                  report={report}
                  weekLabel={periodRange}
                  platformId="crowdstrike"
                  dashboardData={d}
                  metrics={metrics}
                  periodLabel={periodLabel}
                  narrative={narrative}
                  recommendations={recommendations}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Cartão de secção ─────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, accent = 'var(--accent-primary)', action, children }: {
  title: string; icon: typeof Shield; accent?: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center gap-2.5 px-5 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
        <Icon size={14} style={{ color: accent }} />
        <span className="text-xs font-semibold uppercase tracking-wider flex-1" style={{ color: 'var(--text-secondary)' }}>{title}</span>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

const SEV_COLORS: Record<string, string> = {
  Critical: '#EF4444', High: '#F97316', Medium: '#EAB308', Low: '#22C55E',
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Reports() {
  const [period, setPeriod] = useState<Period>('semanal')
  const [printOpen, setPrintOpen] = useState(false)
  const printRef = useRef<HTMLDivElement>(null!)
  const [aiNarrative, setAiNarrative] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiRecs, setAiRecs] = useState<string[] | null>(null)
  const [aiRecsLoading, setAiRecsLoading] = useState(false)
  const [aiRecsError, setAiRecsError] = useState<string | null>(null)

  const { config } = usePlatform()
  const { data: dash } = useDashboard('crowdstrike')
  const d = (dash as typeof crowdstrikeDashboard) ?? crowdstrikeDashboard

  const report      = getWeeklyReport('crowdstrike')
  const ratingStyle = getRatingStyle(report.riskRating)
  const color       = config.colors.primary

  const tab         = PERIOD_TABS.find(t => t.id === period)!
  const mult        = tab.multiplier
  const periodRange = getPeriodRange(period)

  // Count resolved vs open from actual incident row statuses
  const RESOLVED_STATUSES = ['resolvido', 'resolved', 'closed', 'contained', 'patched', 'blocked', 'quarantined']
  const resolvedIncidents = report.incidentRows.filter(r =>
    RESOLVED_STATUSES.some(s => r.status.toLowerCase().includes(s))
  ).length
  const openFromRows = report.incidentRows.length - resolvedIncidents

  const criticalAlerts = typeof d.kpis.criticalAlerts.value === 'number' ? d.kpis.criticalAlerts.value : 3
  const dynamicMetrics: WeeklyMetric[] = [
    {
      label: 'Incidentes Resolvidos',
      value: (resolvedIncidents * mult).toLocaleString('pt-PT'),
      delta: period === 'semanal'
        ? `${openFromRows} em aberto`
        : `${(resolvedIncidents * mult).toLocaleString('pt-PT')} no período`,
      direction: 'up', positive: true,
    },
    {
      label: 'Incidentes em Aberto',
      value: openFromRows.toLocaleString('pt-PT'),
      delta: period === 'semanal' ? '–3 vs. sem. anterior' : `${(openFromRows * mult).toLocaleString('pt-PT')} acumulados`,
      direction: 'down', positive: openFromRows === 0,
    },
    {
      label: 'Tempo Médio de Resposta',
      value: String(d.kpis.mttr?.value ?? '4,2m').replace('.', ','),
      delta: '–16% vs. período anterior',
      direction: 'down', positive: true,
    },
    {
      label: 'Cobertura de Endpoints',
      value: String(d.kpis.protectionCoverage?.value ?? '98,6%').replace('.', ','),
      delta: '+0,4pp',
      direction: 'up', positive: true,
    },
  ]

  // Build narrative dynamically from live data so it always matches the KPI cards
  const totalEndpoints  = d.kpis.totalEndpoints.value
  const activeDetections = d.kpis.activeDetections.value ?? 34
  const mttr    = String(d.kpis.mttr?.value ?? '4,2m').replace('.', ',')
  const coverage = String(d.kpis.protectionCoverage?.value ?? '98,6%').replace('.', ',')

  const weeklyNarrative =
    `Esta semana, o Club Paulistano manteve uma proteção robusta dos endpoints em ${totalEndpoints} ativos geridos, ` +
    `com o desempenho de resposta a deteções a operar dentro dos parâmetros de SLA estabelecidos pela Contego Security. ` +
    `A equipa SOC registou ${activeDetections} deteções ativas e resolveu com sucesso ${resolvedIncidents} incidentes escalados` +
    (openFromRows > 0 ? `, com ${openFromRows} ainda em investigação ativa` : '') + `, ` +
    `alcançando um tempo médio de resposta de ${mttr} — uma melhoria de 16% face ao período anterior. ` +
    `${criticalAlerts} ameaças de severidade crítica foram totalmente contidas; não foi confirmado movimento lateral nem exfiltração de dados. ` +
    `A postura de risco dos endpoints é classificada como Estável, com uma cobertura de aplicação de políticas de ${coverage} em toda a frota gerida.`

  const periodNarrative = period === 'semanal'
    ? weeklyNarrative
    : `No período de relatório ${tab.label.toLowerCase()} (${periodRange}), o Club Paulistano registou ` +
      `${(resolvedIncidents * mult).toLocaleString('pt-PT')} incidentes resolvidos` +
      (openFromRows * mult > 0 ? ` e ${(openFromRows * mult).toLocaleString('pt-PT')} em investigação` : '') +
      ` pela equipa SOC da Contego Security. A frota de ${totalEndpoints} endpoints geridos manteve uma cobertura de proteção de ` +
      `${coverage} durante todo o período, sem confirmação de movimento lateral ou exfiltração de dados. ` +
      `O tempo médio de resposta manteve-se em ${mttr} por evento.`

  const sevMap: Record<string, number> = {}
  for (const s of d.severityBreakdown) sevMap[s.name] = s.value
  const totalSev = Object.values(sevMap).reduce((a, b) => a + b, 0) || 1

  const typeMap: Record<string, number> = {}
  const endpointsByType = (d as typeof crowdstrikeDashboard & { endpointsByType?: { type: string; count: number }[] }).endpointsByType ?? []
  for (const e of endpointsByType) typeMap[e.type] = e.count

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Relatório Executivo CrowdStrike — Club Paulistano — ${tab.label} — ${periodRange}`,
    pageStyle: `
      @page { size: A4; margin: 0; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #executive-print-report { padding: 32px 40px !important; }
      }
    `,
  })

  const openPrint  = useCallback(() => setPrintOpen(true),  [])
  const closePrint = useCallback(() => setPrintOpen(false), [])

  const handleGenerateAI = useCallback(async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const text = await generateSecurityNarrative({
        platform:          'CrowdStrike Falcon EDR',
        client:            'Club Paulistano',
        period:            tab.label,
        periodRange,
        totalEndpoints:    d.kpis.totalEndpoints.value,
        activeDetections,
        resolvedIncidents: resolvedIncidents * mult,
        openIncidents:     openFromRows,
        mttr,
        coverage,
        criticalAlerts,
        riskRating:        report.riskRating,
        severityBreakdown: d.severityBreakdown.map(s => ({ name: s.name, value: s.value })),
        endpointsByOS:     d.endpointsByOS,
        incidents:         report.incidentRows.map(r => ({
          ref: r.ref, category: r.category,
          description: r.description, severity: r.severity, status: r.status,
        })),
      })
      setAiNarrative(text)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setAiLoading(false)
    }
  }, [tab, periodRange, d, activeDetections, resolvedIncidents, mult, openFromRows, mttr, coverage, criticalAlerts, report.riskRating])

  const handleGenerateRecommendations = useCallback(async () => {
    setAiRecsLoading(true)
    setAiRecsError(null)
    try {
      const recs = await generateStrategicRecommendations({
        platform:          'CrowdStrike Falcon EDR',
        client:            'Club Paulistano',
        period:            tab.label,
        resolvedIncidents: resolvedIncidents * mult,
        openIncidents:     openFromRows,
        criticalAlerts,
        coverage,
        riskRating:        report.riskRating,
        totalEndpoints:    d.kpis.totalEndpoints.value,
        severityBreakdown: d.severityBreakdown.map(s => ({ name: s.name, value: s.value })),
        endpointsByOS:     d.endpointsByOS,
        incidents:         report.incidentRows.map(r => ({
          ref: r.ref, category: r.category,
          description: r.description, severity: r.severity, status: r.status,
        })),
      })
      setAiRecs(recs)
    } catch (err) {
      setAiRecsError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setAiRecsLoading(false)
    }
  }, [tab, resolvedIncidents, mult, openFromRows, criticalAlerts, coverage, report])

  const reportDate = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <PageLayout title="Relatórios" subtitle="CrowdStrike — Relatório executivo de postura de segurança">

      <PrintModal
        isOpen={printOpen}
        onClose={closePrint}
        printRef={printRef}
        onPrint={handlePrint}
        periodLabel={tab.label}
        periodRange={periodRange}
        metrics={dynamicMetrics}
        narrative={aiNarrative ?? periodNarrative}
        recommendations={aiRecs ?? undefined}
      />

      {/* ── Cabeçalho do Relatório ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: `linear-gradient(135deg, ${color}12 0%, var(--bg-elevated) 50%, var(--bg-elevated) 100%)`,
          border: `1px solid ${color}30`,
          boxShadow: `0 0 60px rgba(0,0,0,0.3), inset 0 1px 0 ${color}15`,
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}CC 30%, ${color} 50%, ${color}CC 70%, transparent)` }} />

        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Esquerda */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                <Shield size={22} style={{ color }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                    Relatório Executivo de Segurança
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded font-semibold tracking-wide"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                    CONFIDENCIAL
                  </span>
                </div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  CrowdStrike Falcon EDR · Club Paulistano
                </h1>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Relatório {tab.label} · {periodRange} · Preparado em {reportDate} · Contego Security
                </p>
              </div>
            </div>

            {/* Direita: controlos */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Seletor de período */}
              <div className="flex items-center gap-1 rounded-xl p-1"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-default)' }}>
                {PERIOD_TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setPeriod(t.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: period === t.id ? color : 'transparent',
                      color: period === t.id ? '#fff' : 'var(--text-muted)',
                      border: 'none', cursor: 'pointer',
                      boxShadow: period === t.id ? `0 0 12px ${color}60` : undefined,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Nível de risco */}
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: ratingStyle.bg, color: ratingStyle.text, border: `1px solid ${ratingStyle.border}` }}>
                <span className="w-2 h-2 rounded-full" style={{ background: ratingStyle.text, boxShadow: `0 0 6px ${ratingStyle.text}` }} />
                {RATING_PT[report.riskRating] ?? report.riskRating.toUpperCase()}
              </span>

              {/* Botão exportar */}
              <button
                onClick={openPrint}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: 'var(--accent-gradient)', color: '#fff', boxShadow: '0 0 20px var(--accent-glow)', border: 'none' }}>
                <Printer size={14} />
                Exportar Relatório PDF
              </button>
            </div>
          </div>

          <div className="mt-5 mb-4" style={{ height: 1, background: `linear-gradient(90deg, ${color}50, transparent)` }} />

          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {report.headline}
          </p>

          {/* Narrative + AI controls */}
          <div className="flex flex-col gap-2">
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)', maxWidth: '820px' }}>
              {aiNarrative ?? periodNarrative}
            </p>

            {aiError && (
              <p className="text-xs" style={{ color: '#F87171' }}>{aiError}</p>
            )}

            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={handleGenerateAI}
                disabled={aiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: 'rgba(168,85,247,0.12)',
                  border: '1px solid rgba(168,85,247,0.3)',
                  color: '#C084FC',
                  cursor: aiLoading ? 'not-allowed' : 'pointer',
                  opacity: aiLoading ? 0.7 : 1,
                }}
              >
                {aiLoading
                  ? <><Loader2 size={11} className="animate-spin" /> A gerar…</>
                  : <><Sparkles size={11} /> Regenerar com IA</>
                }
              </button>
              {aiNarrative && (
                <button
                  onClick={() => { setAiNarrative(null); setAiError(null) }}
                  className="text-[10px] transition-opacity"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Repor original
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Indicadores KPI ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {dynamicMetrics.map((m, i) => {
          const icons = [ShieldAlert, AlertTriangle, Clock, CheckCircle]
          const Icon = icons[i] ?? Activity
          const valueColor = m.positive ? '#4ADE80' : '#F97316'
          const DirI = m.direction === 'up' ? TrendingUp : m.direction === 'down' ? TrendingDown : Minus
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden"
              style={{
                background: 'var(--bg-surface)',
                border: `1px solid ${m.positive ? 'rgba(74,222,128,0.2)' : 'rgba(249,115,22,0.2)'}`,
                boxShadow: `0 0 30px rgba(0,0,0,0.2), inset 0 0 40px ${m.positive ? 'rgba(74,222,128,0.03)' : 'rgba(249,115,22,0.03)'}`,
              }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>{m.label}</span>
                <Icon size={14} style={{ color: m.positive ? '#4ADE80' : '#F97316', opacity: 0.7 }} />
              </div>
              <span className="text-3xl font-black tabular-nums" style={{ color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {m.value}
              </span>
              <div className="flex items-center gap-1">
                <DirI size={11} style={{ color: valueColor }} />
                <span className="text-[11px] font-medium" style={{ color: valueColor }}>{m.delta}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${m.positive ? '#4ADE80' : '#F97316'}40, transparent)` }} />
            </motion.div>
          )
        })}
      </div>

      {/* ── Panorama de Ameaças ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Distribuição de Severidade de Ameaças" icon={ShieldAlert} accent="#EF4444">
          <div className="flex flex-col gap-3">
            {d.severityBreakdown.map(({ name, value, color: c }) => {
              const pct = Math.round((value / totalSev) * 100)
              return (
                <div key={name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold tabular-nums" style={{ color: c }}>{value}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: c }} />
                  </div>
                </div>
              )
            })}
            <div className="mt-3 pt-3 flex items-center justify-between border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Total de Alertas Ativos</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{totalSev}</span>
            </div>
          </div>
        </SectionCard>

        <AreaChartWidget
          title="Atividade de Deteção (24h)"
          subtitle="Contagem de deteções não resolvidas por hora"
          data={d.detectionTrend}
          height={220}
        />
      </div>

      {/* ── Saúde dos Endpoints ───────────────────────────────────────── */}
      <SectionCard title="Resumo de Saúde dos Endpoints" icon={Cpu} accent="#3B82F6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Gerido',           value: d.kpis.totalEndpoints.value,                 icon: Cpu,          color: '#3B82F6', sub: 'Em todas as plataformas' },
            { label: 'Estações de Trabalho',   value: typeMap['Workstation'] ?? 397,               icon: Activity,     color: '#06B6D4', sub: '88% da frota' },
            { label: 'Servidores',             value: typeMap['Server'] ?? 56,                     icon: Server,       color: '#8B5CF6', sub: '12% da frota' },
            { label: 'Cobertura',              value: String(d.kpis.protectionCoverage?.value ?? '98,6%'), icon: CheckCircle, color: '#22C55E', sub: 'Política aplicada' },
          ].map(({ label, value, icon: Icon, color: c, sub }) => (
            <div key={label} className="flex items-start gap-3 rounded-xl p-3"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${c}18`, border: `1px solid ${c}30` }}>
                <Icon size={14} style={{ color: c }} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="text-lg font-bold tabular-nums leading-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {d.endpointsByOS.map(({ os, count }) => {
            const pct = Math.round((count / (d.kpis.totalEndpoints.value as unknown as number || 453)) * 100)
            const c = os === 'Windows' ? '#3B82F6' : os === 'macOS' ? '#9CA3AF' : '#F97316'
            return (
              <div key={os} className="flex flex-col gap-1.5 p-3 rounded-xl"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{os}</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: c }}>{count}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-overlay)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{pct}% da frota</span>
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* ── Registo de Incidentes ─────────────────────────────────────── */}
      <SectionCard title={`Registo de Incidentes e Eventos — ${tab.label}`} icon={AlertTriangle} accent="#F97316">
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border-subtle)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
                {['Referência', 'Data', 'Categoria', 'Descrição', 'Severidade', 'Estado', 'Responsável'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.incidentRows.map((row, i) => {
                const sev = SEV_COLORS[row.severity] ?? '#94A3B8'
                return (
                  <tr key={i} style={{ borderBottom: i < report.incidentRows.length - 1 ? '1px solid var(--border-subtle)' : undefined }}>
                    <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--text-muted)', fontSize: '10px', whiteSpace: 'nowrap' }}>{row.ref}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{row.date}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{row.category}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)', maxWidth: '280px' }}>{row.description}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: `${sev}18`, color: sev, border: `1px solid ${sev}30` }}>
                        {row.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{row.status}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{row.owner}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ── Recomendações Estratégicas ────────────────────────────────── */}
      <SectionCard
        title="Recomendações Estratégicas — Consultoria SOC · Contego Security"
        icon={BookOpen}
        accent="#A855F7"
        action={
          <div className="flex items-center gap-2">
            {aiRecs && (
              <button
                onClick={() => { setAiRecs(null); setAiRecsError(null) }}
                className="text-[10px]"
                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Repor original
              </button>
            )}
            <button
              onClick={handleGenerateRecommendations}
              disabled={aiRecsLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
              style={{
                background: 'rgba(168,85,247,0.12)',
                border: '1px solid rgba(168,85,247,0.3)',
                color: '#C084FC',
                cursor: aiRecsLoading ? 'not-allowed' : 'pointer',
                opacity: aiRecsLoading ? 0.7 : 1,
              }}
            >
              {aiRecsLoading
                ? <><Loader2 size={10} className="animate-spin" /> A gerar…</>
                : <><Sparkles size={10} /> Gerar com IA</>
              }
            </button>
          </div>
        }
      >
        {aiRecsError && (
          <p className="text-xs mb-3" style={{ color: '#F87171' }}>{aiRecsError}</p>
        )}
        <div className="flex flex-col gap-3">
          {(aiRecs ?? report.recommendations).map((rec, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs"
                style={{ background: 'rgba(168,85,247,0.15)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.3)' }}>
                {i + 1}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{rec}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Assinaturas ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Preparado por', name: report.preparedBy, icon: Users },
          { label: 'Revisto e Aprovado por', name: report.reviewedBy, icon: CheckCircle },
        ].map(({ label, name, icon: Icon }) => (
          <div key={label} className="rounded-xl p-5 flex items-start gap-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <div className="h-8 rounded" style={{ borderBottom: '1px solid var(--border-default)', marginBottom: '6px' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{name}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Data: _______________</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Rodapé ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-xl px-6 py-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            CONFIDENCIAL · APENAS PARA USO EXECUTIVO
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Dados obtidos da API CrowdStrike Falcon (us-2) · Gerado em {reportDate} · Contego Security — CAP Dash
          </p>
        </div>
        <button
          onClick={openPrint}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--accent-gradient)', color: '#fff', boxShadow: '0 0 24px var(--accent-glow)', border: 'none' }}>
          <Printer size={15} />
          Exportar Relatório PDF Completo
        </button>
      </div>

    </PageLayout>
  )
}
