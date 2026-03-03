import { useState, useCallback, useMemo, useEffect } from 'react'
import { Wrench, CheckCircle2, Clock, AlertTriangle, Users, Sparkles, Loader2, RefreshCw, ShieldAlert, ChevronDown, ChevronUp, ExternalLink, Wifi, WifiOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'
import { PieChartWidget } from '@/components/charts/PieChartWidget'
import { DataTable } from '@/components/tables/DataTable'
import { outpost24Dashboard } from '@/data/outpost24/dashboard'
import { useDashboard } from '@/hooks/useDashboard'
import { generateRemediationPlan, generateCVERemediationSteps, type RemediationRecommendation, type CVERemediationGuide } from '@/lib/openai'

const ASSIGNEES = ['SecOps Team', 'Vuln Mgmt Team', 'Infra Team', 'SOC Team', 'Platform Team']

type TaskRow = {
  id: string
  cveId: string
  asset: string
  priority: 'P1' | 'P2' | 'P3' | 'P4'
  assignee: string
  status: 'Open' | 'In Progress' | 'Verified' | 'Closed'
  dueDate: string
  created: string
  effort: string
}

function fmtShortDate(value: string | number | Date): string {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return String(value)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function mapPriority(score: number): TaskRow['priority'] {
  if (score >= 9) return 'P1'
  if (score >= 8) return 'P2'
  if (score >= 7) return 'P3'
  return 'P4'
}

function mapStatus(status: string): TaskRow['status'] {
  const s = (status || '').toLowerCase()
  if (s === 'patched') return 'Closed'
  if (s === 'mitigated') return 'Verified'
  if (s === 'accepted') return 'In Progress'
  return 'Open'
}

function buildRemediationTasks(d: typeof outpost24Dashboard): TaskRow[] {
  const cves = (d.topCVEs || []).slice(0, 22)
  const assets = d.assetRiskRankings || []
  const now = new Date()
  return cves.map((cve, idx) => {
    const priority = mapPriority(Number(cve.score))
    const status = mapStatus(String(cve.status))
    const dueDays = priority === 'P1' ? 2 : priority === 'P2' ? 5 : priority === 'P3' ? 8 : 12
    const dueDate = new Date(now)
    dueDate.setDate(now.getDate() + dueDays)
    const effortHours = Math.min(8, Math.max(1, Math.ceil(Number(cve.affected) / 6)))
    const asset = assets[idx % Math.max(assets.length, 1)]
    return {
      id: `REM-${String(200 + idx).padStart(4, '0')}`,
      cveId: cve.cveId,
      asset: asset?.asset || asset?.ip || `asset-${idx + 1}`,
      priority,
      assignee: ASSIGNEES[idx % ASSIGNEES.length],
      status,
      dueDate: fmtShortDate(dueDate),
      created: fmtShortDate(cve.published),
      effort: `${effortHours}h`,
    }
  })
}

function buildBaseRecommendations(d: typeof outpost24Dashboard): RemediationRecommendation[] {
  const top = [...(d.topCVEs || [])].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 4)
  return top.map((cve, idx) => {
    const urgency: RemediationRecommendation['urgency'] =
      Number(cve.score) >= 9 ? 'Critical' : Number(cve.score) >= 8 ? 'High' : 'Medium'
    return {
      priority: idx + 1,
      title: `Remediar ${cve.product} (${cve.cveId})`,
      cveId: cve.cveId,
      rationale: `CVSS ${cve.score} com ${cve.affected} ativos afetados no ambiente Outpost24. Priorização baseada em dados reais coletados da API.`,
      steps: [
        `Identificar ativos impactados por ${cve.cveId} no inventário e validar exposição externa.`,
        `Aplicar patch/mitigação oficial do fornecedor para ${cve.product} na janela de mudança apropriada.`,
        'Executar nova varredura de validação e atualizar o status da remediação no CAP Dash.',
      ],
      urgency,
    }
  })
}

function buildGuideFallback(cve: { cveId: string; product: string; score: number }): CVERemediationGuide {
  const severity: CVERemediationGuide['severity'] =
    cve.score >= 9 ? 'Critical' : cve.score >= 7 ? 'High' : cve.score >= 4 ? 'Medium' : 'Low'
  return {
    cveId: cve.cveId,
    product: cve.product,
    score: cve.score,
    severity,
    summary: `${cve.cveId} afeta ${cve.product} e deve ser tratada conforme criticidade e exposição dos ativos impactados.`,
    steps: [
      `Confirmar versão e exposição dos ativos afetados por ${cve.cveId}.`,
      'Baixar e validar patch/hotfix oficial do fornecedor em ambiente controlado.',
      'Aplicar correção em produção com janela aprovada e plano de rollback.',
      'Reforçar controles compensatórios temporários (segmentação, ACL, hardening) até conclusão total.',
      'Executar nova varredura e registrar evidências de correção no processo de mudança.',
    ],
    verification: `A remediação é confirmada quando ${cve.cveId} não aparece mais nas varreduras e o risco do ativo é reduzido.`,
    references: [
      `https://nvd.nist.gov/vuln/detail/${cve.cveId}`,
      `https://www.google.com/search?q=${encodeURIComponent(cve.product + ' ' + cve.cveId + ' advisory')}`,
    ],
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function priorityColor(p: string): string {
  if (p === 'P1') return '#EF4444'
  if (p === 'P2') return '#F97316'
  if (p === 'P3') return '#EAB308'
  return '#22C55E'
}
function statusColor(s: string): string {
  if (s === 'Open')        return '#EF4444'
  if (s === 'In Progress') return '#F97316'
  if (s === 'Verified')    return '#3B82F6'
  if (s === 'Closed')      return '#22C55E'
  return 'var(--text-muted)'
}
function urgencyColor(u: string): string {
  if (u === 'Critical') return '#EF4444'
  if (u === 'High')     return '#F97316'
  return '#EAB308'
}

// ─── AI Recommendation Card ───────────────────────────────────────────────────
function RecommendationCard({ rec, index }: { rec: RemediationRecommendation; index: number }) {
  const uc = urgencyColor(rec.urgency)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 0% 0%, ${uc}08 0%, var(--bg-elevated) 65%)`,
        border: `1px solid ${uc}28`,
        boxShadow: `0 0 30px rgba(0,0,0,0.2), 0 0 0 1px var(--border-subtle)`,
      }}
    >
      {/* Left accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: uc, borderRadius: '12px 0 0 12px' }} />

      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black"
            style={{ background: `${uc}18`, color: uc, border: `1px solid ${uc}33` }}
          >
            {rec.priority}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{rec.title}</p>
            <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{rec.cveId}</p>
          </div>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ color: uc, background: `${uc}18`, border: `1px solid ${uc}33` }}
        >
          {rec.urgency}
        </span>
      </div>

      <p className="text-xs leading-relaxed pl-3" style={{ color: 'var(--text-secondary)' }}>
        {rec.rationale}
      </p>

      <div className="flex flex-col gap-1.5 pl-3">
        {rec.steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2">
            <div
              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-[9px] font-bold mt-0.5"
              style={{ background: `${uc}15`, color: uc }}
            >
              {i + 1}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{step}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Per-CVE Step-by-Step Guide Card ─────────────────────────────────────────
function CVEGuideCard({ guide }: { guide: CVERemediationGuide }) {
  const [expanded, setExpanded] = useState(false)
  const uc = urgencyColor(guide.severity)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-elevated)', border: `1px solid ${uc}22` }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ background: 'var(--bg-elevated)', border: 'none', cursor: 'pointer' }}
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: uc, boxShadow: `0 0 6px ${uc}` }}
        />
        <span className="font-mono text-xs font-semibold flex-shrink-0" style={{ color: 'var(--accent-primary)', minWidth: 140 }}>
          {guide.cveId}
        </span>
        <span className="text-xs font-medium truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
          {guide.product}
        </span>
        <span className="text-xs font-bold flex-shrink-0" style={{ color: uc }}>
          CVSS {guide.score}
        </span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ color: uc, background: `${uc}18`, border: `1px solid ${uc}30` }}
        >
          {guide.severity}
        </span>
        {expanded
          ? <ChevronUp size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          : <ChevronDown size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="px-4 pb-4 flex flex-col gap-3"
              style={{ borderTop: `1px solid ${uc}18` }}
            >
              {/* Summary */}
              <p className="text-xs leading-relaxed pt-3" style={{ color: 'var(--text-secondary)' }}>
                {guide.summary}
              </p>

              {/* Steps */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Passos de Remediação
                </p>
                {guide.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                      style={{ background: `${uc}18`, color: uc, border: `1px solid ${uc}30`, marginTop: 1 }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step}</p>
                  </div>
                ))}
              </div>

              {/* Verification */}
              <div
                className="rounded-lg px-3 py-2 flex items-start gap-2"
                style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
              >
                <CheckCircle2 size={12} style={{ color: '#22C55E', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#22C55E' }}>Verificação</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{guide.verification}</p>
                </div>
              </div>

              {/* References */}
              {guide.references?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {guide.references.map((ref, i) => (
                    <a
                      key={i}
                      href={ref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded"
                      style={{ color: 'var(--accent-primary)', background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.2)', textDecoration: 'none' }}
                    >
                      <ExternalLink size={9} />
                      {ref.includes('nvd.nist') ? 'NVD Advisory' : `Vendor Advisory ${i + 1}`}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Remediation() {
  // Live data from backend API — falls back to static mock if API is unavailable
  const { data: apiData, isLoading: apiLoading, error: apiError } = useDashboard<typeof outpost24Dashboard>('outpost24')
  const d = apiData ?? outpost24Dashboard
  const isLive = apiData !== null && !apiError

  const tasks = useMemo(() => buildRemediationTasks(d), [d])
  const remVelocity = useMemo(
    () => (d.findingsTrend || []).map((row) => ({ time: row.time, value: Math.max(0, Math.round(Number(row.value) * 0.35)) })),
    [d],
  )
  const statusPie = useMemo(() => [
    { name: 'Open', value: tasks.filter((t) => t.status === 'Open').length, color: '#EF4444' },
    { name: 'In Progress', value: tasks.filter((t) => t.status === 'In Progress').length, color: '#F97316' },
    { name: 'Verified', value: tasks.filter((t) => t.status === 'Verified').length, color: '#3B82F6' },
    { name: 'Closed', value: tasks.filter((t) => t.status === 'Closed').length, color: '#22C55E' },
  ], [tasks])
  const closedCount = tasks.filter((t) => t.status === 'Closed').length
  const openCount = tasks.filter((t) => t.status === 'Open').length
  const inProgressCount = tasks.filter((t) => t.status === 'In Progress').length
  const completionPct = tasks.length ? Math.round((closedCount / tasks.length) * 100) : 0
  const baseRecs = useMemo(() => buildBaseRecommendations(d), [d])

  const [aiRecs, setAiRecs] = useState<RemediationRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAI, setIsAI] = useState(false)

  const [cveGuides, setCveGuides] = useState<CVERemediationGuide[] | null>(null)
  const [guidesLoading, setGuidesLoading] = useState(false)
  const [guidesError, setGuidesError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAI) {
      setAiRecs(baseRecs)
    }
  }, [baseRecs, isAI])

  const handleGenerateAI = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const recs = await generateRemediationPlan({
        topCVEs: d.topCVEs.map(c => ({
          cveId:    c.cveId,
          score:    c.score,
          affected: c.affected,
          product:  c.product,
        })),
        highRiskAssets: d.assetRiskRankings.map(a => ({
          asset:     a.asset,
          ip:        a.ip,
          type:      a.type,
          critical:  a.critical,
          high:      a.high,
          riskScore: a.riskScore,
        })),
        openTasks: tasks
          .filter(t => t.status === 'Open' || t.status === 'In Progress')
          .map(t => ({ id: t.id, cveId: t.cveId, asset: t.asset, priority: t.priority, status: t.status })),
        totalVulns:      d.kpis.totalVulns.value as string,
        criticalCount:   d.kpis.criticalCVEs.value as number,
        patchCompliance: d.kpis.patchCompliance.value as string,
      })
      setAiRecs(recs)
      setIsAI(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiData])

  const handleReset = useCallback(() => {
    setAiRecs(baseRecs)
    setIsAI(false)
    setError(null)
  }, [baseRecs])

  const handleGenerateGuides = useCallback(async () => {
    setGuidesLoading(true)
    setGuidesError(null)
    try {
      const sourceCVEs = d.topCVEs.map((c) => ({
        cveId: c.cveId,
        score: Number(c.score),
        affected: Number(c.affected),
        product: c.product,
      }))
      const allowed = new Map(sourceCVEs.map((c) => [c.cveId, c]))
      const aiGuides = await generateCVERemediationSteps(sourceCVEs)

      const normalized: CVERemediationGuide[] = aiGuides
        .filter((g) => allowed.has(g.cveId))
        .map((g) => {
          const src = allowed.get(g.cveId)!
          return {
            ...g,
            product: src.product,
            score: src.score,
            severity: src.score >= 9 ? 'Critical' : src.score >= 7 ? 'High' : src.score >= 4 ? 'Medium' : 'Low',
          }
        })

      const existing = new Set(normalized.map((g) => g.cveId))
      const missingFallbacks = sourceCVEs
        .filter((c) => !existing.has(c.cveId))
        .map((c) => buildGuideFallback(c))

      setCveGuides([...normalized, ...missingFallbacks])
    } catch (err) {
      setGuidesError(err instanceof Error ? err.message : 'Unknown error occurred')
      const fallbackGuides = d.topCVEs.map((c) => buildGuideFallback({ cveId: c.cveId, product: c.product, score: Number(c.score) }))
      setCveGuides(fallbackGuides)
    } finally {
      setGuidesLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiData])

  return (
    <PageLayout
      title="Remediação"
      subtitle="Outpost24 — Gestão de patches com IA, rastreamento de correções e velocidade de remediação"
    >
      {/* Data source indicator */}
      <div className="flex items-center gap-2">
        {apiLoading ? (
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={11} className="animate-spin" /> Carregando dados ao vivo…
          </span>
        ) : isLive ? (
          <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
            style={{ color: '#22C55E', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <Wifi size={11} /> Dados ao vivo da API — IA analisará dados reais de vulnerabilidades
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
            style={{ color: '#F97316', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
            <WifiOff size={11} /> Backend offline — usando dados mock (inicie o backend para dados ao vivo)
          </span>
        )}
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Tarefas Abertas"   value={openCount}            trend={-8}           icon={AlertTriangle} />
        <MetricCard title="Em Progresso"      value={inProgressCount}      trend={3}            icon={Clock} />
        <MetricCard title="Fechadas (30d)"    value={closedCount}          trend={34}           icon={CheckCircle2} />
        <MetricCard title="Taxa de Conclusão" value={`${completionPct}%`}  trend={completionPct - 60} icon={Wrench} trendLabel="%" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AreaChartWidget
          title="Velocidade de Remediação — Últimos 14 Dias"
          subtitle="Tarefas fechadas por dia"
          data={remVelocity}
          height={210}
        />
        <PieChartWidget
          title="Tarefas por Status"
          subtitle="Distribuição atual de todos os itens de remediação"
          data={statusPie}
          height={210}
        />
      </div>

      {/* Progress bar */}
      <div
        className="rounded-xl p-5 flex flex-col gap-3"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Progresso Geral de Remediação
          </span>
          <span className="text-sm font-bold" style={{ color: 'var(--accent-primary)' }}>
            {completionPct}% concluído
          </span>
        </div>
        <div className="w-full h-2 rounded-full" style={{ background: 'var(--bg-overlay)' }}>
          <div
            className="h-2 rounded-full"
            style={{
              width: `${completionPct}%`,
              background: 'linear-gradient(90deg, #EA580C, #F97316)',
              boxShadow: '0 0 10px rgba(234,88,12,0.5)',
            }}
          />
        </div>
        <div className="flex gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{closedCount} fechadas</span>
          <span>{inProgressCount} em progresso</span>
          <span>{openCount} abertas</span>
          <span className="ml-auto flex items-center gap-1.5">
            <Users size={12} /> {ASSIGNEES.length} responsáveis
          </span>
        </div>
      </div>

      {/* ── AI Remediation Recommendations ─────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-5 py-3"
          style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}
        >
          <ShieldAlert size={14} style={{ color: '#A855F7' }} />
          <span className="text-xs font-semibold uppercase tracking-wider flex-1" style={{ color: 'var(--text-secondary)' }}>
            Recomendações de Remediação com IA
          </span>

          <div className="flex items-center gap-2">
            {isAI && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(168,85,247,0.12)', color: '#C084FC', border: '1px solid rgba(168,85,247,0.25)' }}>
                Gerado por IA
              </span>
            )}
            {isAI && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-[11px]"
                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <RefreshCw size={10} /> Reset
              </button>
            )}
            <button
              onClick={handleGenerateAI}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'rgba(168,85,247,0.12)',
                border: '1px solid rgba(168,85,247,0.3)',
                color: '#C084FC',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? <><Loader2 size={11} className="animate-spin" /> Analisando vulnerabilidades…</>
                : <><Sparkles size={11} /> {isAI ? 'Regenerar com IA' : 'Analisar com IA'}</>  
              }
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-3">
          {/* AI context strip */}
          <div
            className="rounded-lg px-4 py-2.5 flex items-start gap-3"
            style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}
          >
            <Sparkles size={13} style={{ color: '#A855F7', flexShrink: 0, marginTop: 1 }} />
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {isAI
                ? `A IA analisou ${d.kpis.totalVulns.value} vulnerabilidades em ${d.kpis.assetsScanned.value} ativos — incluindo ${d.kpis.criticalCVEs.value} CVEs críticas — e gerou o plano de remediação priorizado abaixo${isLive ? ' usando dados ao vivo do backend' : ' usando dados mock'}.`
                : `Clique em "Analisar com IA" para que o GPT-4o-mini analise seus dados ${isLive ? 'ao vivo' : 'mock'} de vulnerabilidades do Outpost24 (${d.kpis.totalVulns.value} vulns, ${d.kpis.criticalCVEs.value} CVEs críticas em ${d.kpis.assetsScanned.value} ativos) e gere um plano de remediação personalizado.`
              }
            </p>
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#F87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={isAI ? 'ai' : 'default'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              {aiRecs.map((rec, i) => (
                <RecommendationCard key={`${rec.cveId}-${i}`} rec={rec} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Per-CVE Step-by-Step Guide ─────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <div
          className="flex items-center gap-2.5 px-5 py-3"
          style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}
        >
          <Wrench size={14} style={{ color: '#EA580C' }} />
          <span className="text-xs font-semibold uppercase tracking-wider flex-1" style={{ color: 'var(--text-secondary)' }}>
            Guia de Remediação CVE Passo a Passo
          </span>
          <div className="flex items-center gap-2">
            {cveGuides && (
              <button
                onClick={() => { setCveGuides(null); setGuidesError(null) }}
                className="flex items-center gap-1 text-[11px]"
                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <RefreshCw size={10} /> Reset
              </button>
            )}
            <button
              onClick={handleGenerateGuides}
              disabled={guidesLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: 'rgba(234,88,12,0.12)',
                border: '1px solid rgba(234,88,12,0.3)',
                color: '#EA580C',
                cursor: guidesLoading ? 'not-allowed' : 'pointer',
                opacity: guidesLoading ? 0.7 : 1,
              }}
            >
              {guidesLoading
                ? <><Loader2 size={11} className="animate-spin" /> Gerando guias…</>
                : <><Sparkles size={11} /> {cveGuides ? 'Regenerar' : 'Gerar Guias com IA'}</>  
              }
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Clique em "Gerar Guias com IA" para obter um procedimento detalhado de remediação passo a passo para cada uma das {d.topCVEs.length} CVEs críticas em seu ambiente{isLive ? ' (dados ao vivo da API do backend)' : ' (dados mock — inicie o backend para dados ao vivo)'}, incluindo etapas de verificação e links de avisos de fabricantes.
          </p>

          {guidesError && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#F87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {guidesError}
            </p>
          )}

          {!cveGuides && !guidesLoading && (
            /* Placeholder cards showing CVE IDs from live or mock data */
            <div className="flex flex-col gap-2">
              {d.topCVEs.map((cve) => (
                <div
                  key={cve.cveId}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', opacity: 0.7 }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cve.score >= 9 ? '#EF4444' : '#F97316' }} />
                  <span className="font-mono text-xs font-semibold" style={{ color: 'var(--accent-primary)', minWidth: 140 }}>{cve.cveId}</span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{cve.product}</span>
                  <span className="text-xs font-bold ml-auto" style={{ color: cve.score >= 9 ? '#EF4444' : '#F97316' }}>CVSS {cve.score}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Clique para gerar guia</span>
                </div>
              ))}
            </div>
          )}

          {cveGuides && (
            <div className="flex flex-col gap-2">
              {cveGuides.map((guide) => (
                <CVEGuideCard key={guide.cveId} guide={guide} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task table */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Tarefas de Remediação</h2>
        <DataTable<TaskRow>
          columns={[
            {
              key: 'id', label: 'Task ID',
              render: (v) => (
                <span className="font-mono text-xs" style={{ color: 'var(--accent-primary)' }}>{String(v)}</span>
              ),
            },
            {
              key: 'cveId', label: 'CVE',
              render: (v) => (
                <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{String(v)}</span>
              ),
            },
            { key: 'asset', label: 'Asset', sortable: true },
            {
              key: 'priority', label: 'Priority',
              render: (v) => (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{
                    color: priorityColor(String(v)),
                    background: `${priorityColor(String(v))}18`,
                    border: `1px solid ${priorityColor(String(v))}33`,
                  }}
                >
                  {String(v)}
                </span>
              ),
            },
            { key: 'assignee', label: 'Assignee', sortable: true },
            {
              key: 'status', label: 'Status',
              render: (v) => (
                <span style={{ color: statusColor(String(v)), fontWeight: 600, fontSize: '12px' }}>
                  {String(v)}
                </span>
              ),
            },
            { key: 'dueDate', label: 'Due Date', sortable: true },
            { key: 'effort',  label: 'Est. Effort' },
            { key: 'created', label: 'Created',  sortable: true },
          ]}
          data={tasks}
        />
      </div>
    </PageLayout>
  )
}
