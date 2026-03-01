import { useState, useCallback } from 'react'
import { BarChart2, FileText, Calendar, Download, Clock, Sparkles, Loader2, RefreshCw, Wifi, WifiOff, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { DataTable } from '@/components/tables/DataTable'
import { outpost24Dashboard, type OutpostReport } from '@/data/outpost24/dashboard'
import { useDashboard } from '@/hooks/useDashboard'
import { generateReportAnalysis, type ReportAnalysisResult } from '@/lib/openai'

type ReportFormat = 'PDF' | 'CSV' | 'HTML' | 'JSON'
type ReportStatus = 'Ready' | 'Running' | 'Scheduled' | 'Failed'

function statusColor(s: ReportStatus): string {
  if (s === 'Ready')     return '#22C55E'
  if (s === 'Running')   return '#F97316'
  if (s === 'Scheduled') return '#3B82F6'
  if (s === 'Failed')    return '#EF4444'
  return 'var(--text-muted)'
}

function formatBadge(f: ReportFormat) {
  const colors: Record<ReportFormat, string> = {
    PDF:  '#EA580C', CSV: '#22C55E', HTML: '#3B82F6', JSON: '#7C3AED',
  }
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{
        color: colors[f],
        background: `${colors[f]}18`,
        border: `1px solid ${colors[f]}33`,
        letterSpacing: '0.05em',
      }}
    >
      {f}
    </span>
  )
}

const priorityColor = (p: number) => p === 1 ? '#EF4444' : p === 2 ? '#F97316' : '#EAB308'

export default function Reports() {
  const { data: apiData, isLoading: apiLoading, error: apiError } = useDashboard('outpost24')
  const d = (apiData as typeof outpost24Dashboard) ?? outpost24Dashboard
  const isLive = apiData !== null && !apiError

  const [reportAnalysis, setReportAnalysis] = useState<ReportAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cvssDistrib = d.cvssDistribution || []
      const result = await generateReportAnalysis({
        totalVulns: String(d.kpis.totalVulns.value),
        criticalCount: Number(d.kpis.criticalCVEs.value),
        highCount: cvssDistrib.find(c => c.label === 'High')?.count ?? 0,
        mediumCount: cvssDistrib.find(c => c.label === 'Medium')?.count ?? 0,
        lowCount: cvssDistrib.find(c => c.label === 'Low')?.count ?? 0,
        avgCVSS: String(d.kpis.avgCVSS?.value ?? '0'),
        assetsScanned: Number(d.kpis.assetsScanned.value),
        patchCompliance: String(d.kpis.patchCompliance?.value ?? '0%'),
        topCVEs: d.topCVEs.map(c => ({ cveId: c.cveId, score: c.score, affected: c.affected, product: c.product })),
        topProducts: d.topAffectedProducts || [],
        totalFindings: Number(d.scanKpis?.totalFindings?.value?.toString().replace(/,/g, '') || 0),
        scanSchedules: d.scans?.length || 0,
      })
      setReportAnalysis(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [apiData])

  return (
    <PageLayout
      title="Relatórios"
      subtitle="Outpost24 — Relatórios de gestão de vulnerabilidades, agendamentos e análise com IA"
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
            <Wifi size={11} /> Dados ao vivo da API — relatórios baseados em dados reais
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
            style={{ color: '#F97316', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
            <WifiOff size={11} /> Backend offline — usando dados mock
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title={d.reportKpis.totalReports.label}  value={d.reportKpis.totalReports.value}  trend={d.reportKpis.totalReports.trend}  icon={FileText} />
        <MetricCard title={d.reportKpis.readyExport.label}   value={d.reportKpis.readyExport.value}   trend={d.reportKpis.readyExport.trend}   icon={Download} />
        <MetricCard title={d.reportKpis.scheduled.label}     value={d.reportKpis.scheduled.value}     trend={d.reportKpis.scheduled.trend}     icon={Calendar} />
        <MetricCard title={d.reportKpis.generated30d.label}  value={d.reportKpis.generated30d.value}  trend={d.reportKpis.generated30d.trend}  icon={BarChart2} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BarChartWidget
          title="Volume Mensal de Relatórios"
          subtitle="Relatórios gerados por mês (últimos 6 meses)"
          data={d.reportVolume}
          dataKey="count"
          labelKey="label"
          height={200}
        />
        <BarChartWidget
          title="Relatórios por Tipo"
          subtitle="Distribuição entre categorias de relatórios"
          data={d.reportsByType}
          dataKey="count"
          labelKey="label"
          layout="vertical"
          height={200}
        />
      </div>

      {/* ── AI Report Analysis ─────────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <div
          className="flex items-center gap-2.5 px-5 py-3"
          style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}
        >
          <ShieldAlert size={14} style={{ color: '#A855F7' }} />
          <span className="text-xs font-semibold uppercase tracking-wider flex-1" style={{ color: 'var(--text-secondary)' }}>
            Análise de Relatório com IA
          </span>
          <div className="flex items-center gap-2">
            {reportAnalysis && (
              <button
                onClick={() => { setReportAnalysis(null); setError(null) }}
                className="flex items-center gap-1 text-[11px]"
                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <RefreshCw size={10} /> Resetar
              </button>
            )}
            <button
              onClick={handleGenerateReport}
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
                ? <><Loader2 size={11} className="animate-spin" /> Gerando análise…</>
                : <><Sparkles size={11} /> {reportAnalysis ? 'Regenerar Análise' : 'Gerar Análise com IA'}</>
              }
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Info strip */}
          <div
            className="rounded-lg px-4 py-2.5 flex items-start gap-3"
            style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}
          >
            <Sparkles size={13} style={{ color: '#A855F7', flexShrink: 0, marginTop: 1 }} />
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {reportAnalysis
                ? `A IA analisou ${d.kpis.totalVulns.value} vulnerabilidades e gerou um relatório executivo completo${isLive ? ' com dados ao vivo do Outpost24' : ' com dados mock'}.`
                : `Clique em "Gerar Análise com IA" para que a IA produza um relatório executivo completo com resumo, descobertas-chave, panorama de risco e itens de ação${isLive ? ' baseado em dados ao vivo' : ' baseado em dados mock'}.`
              }
            </p>
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#F87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}

          <AnimatePresence mode="wait">
            {reportAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-4"
              >
                {/* Executive Summary */}
                <div
                  className="rounded-xl p-5 relative overflow-hidden"
                  style={{
                    background: 'radial-gradient(ellipse at 0% 0%, rgba(168,85,247,0.06) 0%, var(--bg-elevated) 65%)',
                    border: '1px solid rgba(168,85,247,0.2)',
                  }}
                >
                  <div className="absolute top-0 left-0 bottom-0 w-1 rounded-l-xl" style={{ background: '#A855F7' }} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 pl-3" style={{ color: '#A855F7' }}>
                    Resumo Executivo
                  </p>
                  <p className="text-sm leading-relaxed pl-3" style={{ color: 'var(--text-secondary)' }}>
                    {reportAnalysis.executiveSummary}
                  </p>
                </div>

                {/* Key Findings & Risk Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className="rounded-xl p-5"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                      Principais Descobertas
                    </p>
                    <div className="flex flex-col gap-2.5">
                      {reportAnalysis.keyFindings.map((finding, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-start gap-2.5"
                        >
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[9px] font-bold mt-0.5"
                            style={{ background: 'rgba(234,88,12,0.12)', color: '#EA580C', border: '1px solid rgba(234,88,12,0.25)' }}
                          >
                            {i + 1}
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{finding}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div
                      className="rounded-xl p-5"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        Panorama de Risco
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {reportAnalysis.riskOverview}
                      </p>
                    </div>
                    <div
                      className="rounded-xl p-5"
                      style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={12} style={{ color: '#22C55E' }} />
                        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#22C55E' }}>
                          Status de Conformidade
                        </p>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {reportAnalysis.complianceStatus}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Items */}
                <div
                  className="rounded-xl p-5"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                    Itens de Ação Prioritários
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {reportAnalysis.actionItems.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="rounded-lg p-3.5 flex items-start gap-3"
                        style={{
                          background: `${priorityColor(item.priority)}06`,
                          border: `1px solid ${priorityColor(item.priority)}20`,
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                          style={{
                            background: `${priorityColor(item.priority)}15`,
                            color: priorityColor(item.priority),
                            border: `1px solid ${priorityColor(item.priority)}30`,
                          }}
                        >
                          P{item.priority}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {item.action}
                          </p>
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            color: priorityColor(item.priority),
                            background: `${priorityColor(item.priority)}12`,
                            border: `1px solid ${priorityColor(item.priority)}25`,
                          }}
                        >
                          {item.deadline}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Conclusion */}
                <div
                  className="rounded-xl p-5 relative overflow-hidden"
                  style={{
                    background: 'radial-gradient(ellipse at 100% 100%, rgba(34,197,94,0.05) 0%, var(--bg-elevated) 65%)',
                    border: '1px solid rgba(34,197,94,0.2)',
                  }}
                >
                  <div className="absolute top-0 right-0 bottom-0 w-1 rounded-r-xl" style={{ background: '#22C55E' }} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#22C55E' }}>
                    Conclusão e Próximos Passos
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {reportAnalysis.conclusion}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Report catalogue table */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Catálogo de Relatórios</h2>
          <button
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: 'var(--accent-primary)',
              background: 'rgba(234,88,12,0.12)',
              border: '1px solid rgba(234,88,12,0.3)',
            }}
          >
            <Clock size={12} /> Agendar Novo
          </button>
        </div>
        <DataTable<OutpostReport>
          columns={[
            {
              key: 'id', label: 'ID do Relatório',
              render: (v) => (
                <span className="font-mono text-xs" style={{ color: 'var(--accent-primary)' }}>{String(v)}</span>
              ),
            },
            { key: 'name',     label: 'Nome',        sortable: true },
            { key: 'type',     label: 'Tipo',        sortable: true },
            { key: 'schedule', label: 'Agendamento' },
            {
              key: 'format', label: 'Formato',
              render: (v) => formatBadge(v as ReportFormat),
            },
            {
              key: 'status', label: 'Status',
              render: (v) => (
                <span style={{ color: statusColor(v as ReportStatus), fontWeight: 600, fontSize: '12px' }}>
                  {String(v)}
                </span>
              ),
            },
            { key: 'lastRun', label: 'Última Exec.',  sortable: true },
            { key: 'nextRun', label: 'Próxima Exec.', sortable: true },
            { key: 'pages',   label: 'Páginas',       sortable: true },
            {
              key: 'status', label: 'Ação',
              render: (_v, row) => (
                <button
                  disabled={row.status !== 'Ready'}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-opacity disabled:opacity-30"
                  style={{
                    color: '#EA580C',
                    background: 'rgba(234,88,12,0.1)',
                    border: '1px solid rgba(234,88,12,0.25)',
                  }}
                >
                  <Download size={11} /> Exportar
                </button>
              ),
            },
          ]}
          data={d.reports}
        />
      </div>
    </PageLayout>
  )
}
