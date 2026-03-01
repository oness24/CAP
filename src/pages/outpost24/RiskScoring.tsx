import { useState, useCallback } from 'react'
import { Target, TrendingDown, ShieldAlert, Server, Sparkles, Loader2, RefreshCw, Wifi, WifiOff, TrendingUp, Minus, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { DataTable } from '@/components/tables/DataTable'
import { outpost24Dashboard } from '@/data/outpost24/dashboard'
import { useDashboard } from '@/hooks/useDashboard'
import { generateRiskAnalysis, type RiskAnalysisResult } from '@/lib/openai'

const bandColors: Record<string, string> = {
  'Critical (80–100)': '#EF4444',
  'High (60–79)':      '#F97316',
  'Medium (40–59)':    '#EAB308',
  'Low (0–39)':        '#22C55E',
}

function bandColor(b: string): string {
  if (b === 'Critical') return '#EF4444'
  if (b === 'High')     return '#F97316'
  if (b === 'Medium')   return '#EAB308'
  return '#22C55E'
}

type AssetRow = typeof outpost24Dashboard.assetRiskRankings[number]

export default function RiskScoring() {
  const { data: apiData, isLoading: apiLoading, error: apiError } = useDashboard('outpost24')
  const d = (apiData as typeof outpost24Dashboard) ?? outpost24Dashboard
  const isLive = apiData !== null && !apiError

  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyse = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cvssDistrib = d.cvssDistribution || []
      const highCount = cvssDistrib.find(c => c.label === 'High')?.count ?? 0

      const result = await generateRiskAnalysis({
        totalVulns: String(d.kpis.totalVulns.value),
        criticalCount: Number(d.kpis.criticalCVEs.value),
        highCount,
        avgCVSS: String(d.kpis.avgCVSS?.value ?? '0'),
        assetsScanned: Number(d.kpis.assetsScanned.value),
        patchCompliance: String(d.kpis.patchCompliance?.value ?? '0%'),
        criticalAssets: Number(d.riskKpis.criticalAssets.value),
        avgRiskScore: Number(d.riskKpis.avgRiskScore.value),
        topCVEs: d.topCVEs.map(c => ({ cveId: c.cveId, score: c.score, affected: c.affected, product: c.product })),
        riskBands: d.riskBands.map(b => ({ label: b.label, count: b.count })),
      })
      setRiskAnalysis(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [apiData])

  const riskScoreColor = (score: number) =>
    score >= 80 ? '#EF4444' : score >= 60 ? '#F97316' : score >= 40 ? '#EAB308' : '#22C55E'

  const trendIcon = (trend: string) => {
    if (trend === 'Piorando') return <TrendingUp size={14} style={{ color: '#EF4444' }} />
    if (trend === 'Melhorando') return <TrendingDown size={14} style={{ color: '#22C55E' }} />
    return <Minus size={14} style={{ color: '#EAB308' }} />
  }

  const impactColor = (impact: string) =>
    impact === 'Alto' ? '#EF4444' : impact === 'Médio' ? '#F97316' : '#22C55E'

  return (
    <PageLayout
      title="Pontuação de Risco"
      subtitle="Outpost24 — Scores de risco dos ativos, distribuição por faixa e cálculo de risco com IA"
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
            <Wifi size={11} /> Dados ao vivo da API — análise de risco baseada em dados reais
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
        <MetricCard title={d.riskKpis.assetsScored.label}   value={d.riskKpis.assetsScored.value}   trend={d.riskKpis.assetsScored.trend}   icon={Server} />
        <MetricCard title={d.riskKpis.avgRiskScore.label}   value={d.riskKpis.avgRiskScore.value}   trend={d.riskKpis.avgRiskScore.trend}   icon={Target} />
        <MetricCard title={d.riskKpis.criticalAssets.label} value={d.riskKpis.criticalAssets.value} trend={d.riskKpis.criticalAssets.trend} icon={ShieldAlert} />
        <MetricCard title={d.riskKpis.scoreImproved.label}  value={d.riskKpis.scoreImproved.value}  trend={d.riskKpis.scoreImproved.trend}  icon={TrendingDown} trendLabel="%" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AreaChartWidget
          title="Score de Risco Médio — Últimos 30 Dias"
          subtitle="Menor é melhor — tendência mostra melhoria na postura"
          data={d.riskTrend}
          height={210}
        />
        <BarChartWidget
          title="Distribuição por Faixa de Risco"
          subtitle="Número de ativos em cada faixa de risco"
          data={d.riskBands}
          dataKey="count"
          labelKey="label"
          colorMap={bandColors}
          height={210}
        />
      </div>

      {/* ── AI Risk Analysis ─────────────────────────────────────────── */}
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
            Cálculo de Risco Geral com IA
          </span>
          <div className="flex items-center gap-2">
            {riskAnalysis && (
              <button
                onClick={() => { setRiskAnalysis(null); setError(null) }}
                className="flex items-center gap-1 text-[11px]"
                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <RefreshCw size={10} /> Resetar
              </button>
            )}
            <button
              onClick={handleAnalyse}
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
                ? <><Loader2 size={11} className="animate-spin" /> Calculando risco…</>
                : <><Sparkles size={11} /> {riskAnalysis ? 'Recalcular Risco' : 'Calcular Risco com IA'}</>
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
              {riskAnalysis
                ? `A IA analisou ${d.kpis.totalVulns.value} vulnerabilidades em ${d.kpis.assetsScanned.value} ativos e calculou o score de risco geral da organização${isLive ? ' com dados ao vivo' : ' com dados mock'}.`
                : `Clique em "Calcular Risco com IA" para que a IA analise seus dados ${isLive ? 'ao vivo' : 'mock'} do Outpost24 e calcule o risco geral da organização com recomendações.`
              }
            </p>
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#F87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}

          <AnimatePresence mode="wait">
            {riskAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-4"
              >
                {/* Score principal */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    className="rounded-xl p-6 flex flex-col items-center justify-center gap-2 relative overflow-hidden"
                    style={{
                      background: `radial-gradient(ellipse at 50% 0%, ${riskScoreColor(riskAnalysis.overallRiskScore)}12 0%, var(--bg-elevated) 70%)`,
                      border: `1px solid ${riskScoreColor(riskAnalysis.overallRiskScore)}30`,
                    }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Score de Risco Geral
                    </p>
                    <p
                      className="text-5xl font-black"
                      style={{ color: riskScoreColor(riskAnalysis.overallRiskScore), textShadow: `0 0 30px ${riskScoreColor(riskAnalysis.overallRiskScore)}40` }}
                    >
                      {riskAnalysis.overallRiskScore}
                    </p>
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{
                        color: riskScoreColor(riskAnalysis.overallRiskScore),
                        background: `${riskScoreColor(riskAnalysis.overallRiskScore)}18`,
                        border: `1px solid ${riskScoreColor(riskAnalysis.overallRiskScore)}33`,
                      }}
                    >
                      {riskAnalysis.riskLevel}
                    </span>
                  </div>

                  {/* Tendência */}
                  <div
                    className="rounded-xl p-5 flex flex-col gap-3"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Tendência
                    </p>
                    <div className="flex items-center gap-2">
                      {trendIcon(riskAnalysis.trend)}
                      <span className="text-sm font-bold" style={{
                        color: riskAnalysis.trend === 'Piorando' ? '#EF4444' : riskAnalysis.trend === 'Melhorando' ? '#22C55E' : '#EAB308'
                      }}>
                        {riskAnalysis.trend}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {riskAnalysis.trendExplanation}
                    </p>
                  </div>

                  {/* Resumo */}
                  <div
                    className="rounded-xl p-5 flex flex-col gap-3"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Resumo da Postura de Risco
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {riskAnalysis.summary}
                    </p>
                  </div>
                </div>

                {/* Fatores de risco */}
                <div
                  className="rounded-xl p-5"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                    Fatores de Risco Identificados
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {riskAnalysis.factors.map((f, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="rounded-lg p-3 flex items-start gap-3"
                        style={{
                          background: `${impactColor(f.impact)}06`,
                          border: `1px solid ${impactColor(f.impact)}20`,
                        }}
                      >
                        <AlertTriangle size={14} style={{ color: impactColor(f.impact), flexShrink: 0, marginTop: 1 }} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{f.factor}</span>
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{ color: impactColor(f.impact), background: `${impactColor(f.impact)}15`, border: `1px solid ${impactColor(f.impact)}25` }}
                            >
                              Impacto {f.impact}
                            </span>
                          </div>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{f.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Recomendações */}
                <div
                  className="rounded-xl p-5"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                    Recomendações Prioritárias
                  </p>
                  <div className="flex flex-col gap-2">
                    {riskAnalysis.recommendations.map((rec, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 rounded-lg p-3"
                        style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)' }}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}
                        >
                          {i + 1}
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{rec}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Scoring methodology info strip */}
      <div
        className="rounded-xl p-4 flex flex-col sm:flex-row gap-4 sm:items-center"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex-1">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Metodologia de Pontuação</p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Os scores de risco são calculados como uma combinação ponderada de severidade CVSS, exposição do ativo,
            índice de explorabilidade e idade do patch. CVEs Críticas contribuem ×18, Altas ×4, Médias ×0.5.
            Scores variam de 0–100 onde maior = maior risco.
          </p>
        </div>
        <div className="flex gap-4 flex-shrink-0">
          {[
            { label: 'Crítico', color: '#EF4444', range: '80–100' },
            { label: 'Alto',    color: '#F97316', range: '60–79' },
            { label: 'Médio',   color: '#EAB308', range: '40–59' },
            { label: 'Baixo',   color: '#22C55E', range: '0–39' },
          ].map(b => (
            <div key={b.label} className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ background: b.color, boxShadow: `0 0 6px ${b.color}` }} />
              <span className="text-[10px] font-semibold" style={{ color: b.color }}>{b.label}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{b.range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Asset risk table */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Scores de Risco dos Ativos</h2>
        <DataTable<AssetRow>
          columns={[
            { key: 'asset', label: 'Ativo', sortable: true },
            { key: 'ip',    label: 'Endereço IP' },
            { key: 'type',  label: 'Tipo', sortable: true },
            { key: 'os',    label: 'SO' },
            {
              key: 'riskScore', label: 'Score de Risco', sortable: true,
              render: (v) => (
                <span
                  className="font-bold text-sm"
                  style={{ color: Number(v) >= 80 ? '#EF4444' : Number(v) >= 60 ? '#F97316' : Number(v) >= 40 ? '#EAB308' : '#22C55E' }}
                >
                  {String(v)}
                </span>
              ),
            },
            {
              key: 'band', label: 'Faixa',
              render: (v) => (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    color: bandColor(String(v)),
                    background: `${bandColor(String(v))}18`,
                    border: `1px solid ${bandColor(String(v))}33`,
                  }}
                >
                  {String(v)}
                </span>
              ),
            },
            {
              key: 'critical', label: 'Crít', sortable: true,
              render: (v) => (
                <span style={{ color: Number(v) > 0 ? '#EF4444' : 'var(--text-muted)', fontWeight: 700 }}>
                  {String(v)}
                </span>
              ),
            },
            {
              key: 'high', label: 'Alto', sortable: true,
              render: (v) => <span style={{ color: '#F97316', fontWeight: 600 }}>{String(v)}</span>,
            },
            {
              key: 'medium', label: 'Méd', sortable: true,
              render: (v) => <span style={{ color: '#EAB308', fontWeight: 600 }}>{String(v)}</span>,
            },
            { key: 'lastScanned', label: 'Última Varredura', sortable: true },
          ]}
          data={d.assetRiskRankings}
        />
      </div>
    </PageLayout>
  )
}
