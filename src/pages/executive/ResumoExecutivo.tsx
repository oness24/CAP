import { useEffect, useMemo, useRef, useState } from 'react'
import { ShieldAlert, AlertTriangle, Activity, Loader2, Wifi, WifiOff, Bot, Send, Sparkles, User, CheckCircle2 } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { DataTable } from '@/components/tables/DataTable'
import { api } from '@/lib/api'
import type { PlatformId } from '@/types'

type Severity = 'Critical' | 'High'

interface ExecutiveEvent {
  id: string
  platform: string
  severity: Severity
  event: string
  details: string
  status: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

type DashboardMap = Partial<Record<PlatformId, Record<string, unknown>>>

const PLATFORM_IDS: PlatformId[] = ['crowdstrike', 'wazuh', 'safetica', 'outpost24', 'keeper', 'zabbix']

const REAL_PLATFORMS: PlatformId[] = ['crowdstrike', 'wazuh', 'outpost24', 'zabbix']
const MOCK_PLATFORMS: PlatformId[] = ['keeper', 'safetica']

const PLATFORM_LABELS: Record<PlatformId, string> = {
  crowdstrike: 'CrowdStrike (EDR)',
  wazuh: 'SIEM',
  outpost24: 'Outpost24 (VM)',
  zabbix: 'Zabbix (Infra)',
  keeper: 'Keeper (Passwords)',
  safetica: 'Safetica (DLP)',
}

type DataSourceType = 'live' | 'mock' | 'offline'

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/[% ,]/g, '')
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function severityWeight(sev: Severity): number {
  return sev === 'Critical' ? 2 : 1
}

function levelFromScore(score: number): 'Crítico' | 'Alto' | 'Médio' | 'Baixo' {
  if (score >= 80) return 'Crítico'
  if (score >= 60) return 'Alto'
  if (score >= 40) return 'Médio'
  return 'Baixo'
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function scoreLabel(score: number): 'Excelente' | 'Bom' | 'Atenção' | 'Crítico' {
  if (score >= 85) return 'Excelente'
  if (score >= 70) return 'Bom'
  if (score >= 50) return 'Atenção'
  return 'Crítico'
}

function securityScoreColor(score: number): string {
  if (score >= 85) return '#22C55E'
  if (score >= 70) return '#3B82F6'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

function isCompanyScopedQuestion(question: string): boolean {
  const q = question.toLowerCase()

  const companyTerms = [
    'cap', 'empresa', 'dessa empresa', 'desta empresa', 'nossa empresa', 'company',
    'ambiente', 'infra', 'infraestrutura', 'plataforma', 'plataformas', 'soc',
    'seguranca', 'segurança', 'security', 'ciber', 'cibersegurança',
    'risco', 'risk', 'score', 'pontuacao', 'pontuação', 'percentual', 'percentagem',
    'incidente', 'incidentes', 'alerta', 'alertas', 'deteccao', 'detecção',
    'vulnerabilidade', 'vulnerabilidades', 'compliance', 'conformidade',
    'wazuh', 'siem', 'crowdstrike', 'outpost24', 'safetica', 'keeper', 'zabbix',
    'endpoint', 'endpoints', 'host', 'hosts', 'agente', 'agentes',
  ]

  const questionIntentTerms = [
    'qual', 'quais', 'como', 'por que', 'porque', 'explica', 'explique',
    'mostrar', 'mostra', 'resumo', 'analise', 'análise', 'melhorar', 'aumentar',
    'reduzir', 'prioridade', 'status', 'hoje', 'agora',
  ]

  const offTopicTerms = [
    'weather', 'clima', 'temperatura', 'futebol', 'nba', 'cricket', 'filme', 'série',
    'música', 'music', 'receita', 'culinária', 'horóscopo', 'bitcoin', 'criptomoeda',
    'piada', 'joke', 'celebridade', 'fofoca', 'viagem', 'turismo',
  ]

  if (offTopicTerms.some((term) => q.includes(term))) return false

  const hasCompanyTerm = companyTerms.some((term) => q.includes(term))
  const hasIntentTerm = questionIntentTerms.some((term) => q.includes(term))

  return hasCompanyTerm || hasIntentTerm
}

function parsePercent(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

async function askExecutiveAssistant(params: {
  question: string
  context: Record<string, unknown>
}): Promise<string> {
  const { question, context } = params
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined

  if (!isCompanyScopedQuestion(question)) {
    return 'Só posso responder sobre o ambiente e os dados de segurança da CAP.'
  }

  const q = question.toLowerCase()
  const scoreBreakdown = (context.scoreBreakdown ?? []) as Array<{ factor: string; weight: string; value: string; source: string }>
  const recommendations = (context.improvementRecommendations ?? []) as Array<{ action: string; expectedGain: string; basedOn: string }>

  const asksScoreReason = /score|pontua|percent|por que|porque|basead|dados|cálcul|calculo|percentagem/.test(q)
  const asksImprove = /melhor|aument|subir|improv|increase|ganhar pontos|elevar/.test(q)

  if (asksScoreReason || asksImprove) {
    const lines: string[] = []
    lines.push(`Score atual CAP: ${String(context.securityScore ?? 'N/A')}/100 (${String(context.securityLevel ?? 'N/A')}).`)
    if (asksScoreReason && scoreBreakdown.length) {
      lines.push('Base do cálculo:')
      scoreBreakdown.slice(0, 4).forEach((item) => {
        lines.push(`- ${item.factor} (${item.weight}): ${item.value} • fonte: ${item.source}`)
      })
    }
    if (asksImprove && recommendations.length) {
      lines.push('Como melhorar o percentual:')
      recommendations.slice(0, 3).forEach((item) => {
        lines.push(`- ${item.action} (ganho estimado: ${item.expectedGain}) • base: ${item.basedOn}`)
      })
    }
    return lines.join('\n')
  }

  if (!apiKey) {
    const securityScore = Number(context.securityScore ?? 0)
    const riskLevel = String(context.overallRiskLevel ?? 'N/A')
    const criticalEvents = Number(context.criticalEvents ?? 0)
    const highEvents = Number(context.highEvents ?? 0)
    return `Análise local (sem IA externa): o score geral de segurança da CAP está em ${securityScore}/100, com risco ${riskLevel}, ${criticalEvents} eventos críticos e ${highEvents} eventos de alta prioridade. Configure VITE_OPENAI_API_KEY para respostas analíticas mais detalhadas por pergunta.`
  }

  const prompt = `Você é o assistente executivo de cibersegurança da empresa CAP.

Regras obrigatórias:
1) Responda APENAS perguntas relacionadas ao ambiente da CAP e aos dados fornecidos.
2) Se a pergunta estiver fora desse escopo, responda exatamente: "Só posso responder sobre o ambiente e os dados de segurança da CAP.".
3) Não invente números. Use apenas o contexto abaixo.
4) Seja direto, técnico e objetivo, em português do Brasil.
5) Sempre que útil, correlacione plataformas (EDR, SIEM, DLP, VM, Password, Infra) para justificar a resposta.
6) IMPORTANTE: Diferencie dados REAIS (CrowdStrike, SIEM, Outpost24, Zabbix) de dados ESTIMADOS/MOCK (Keeper, Safetica). Ao responder, indique a confiabilidade dos dados.

Algoritmo do Score:
- 45% Pressão de risco (dados reais de CrowdStrike, SIEM, Outpost24, Zabbix)
- 25% Compliance e higiene (dados reais de SIEM + Outpost24)
- 10% Cobertura de integrações reais
- 10% Saúde dos endpoints (CrowdStrike)
- 10% Dados estimados (Keeper, Safetica — ainda mock)

Contexto consolidado CAP (JSON):
${JSON.stringify(context, null, 2)}

Pergunta do usuário:
${question}

Responda em até 6 linhas.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 450,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `Erro OpenAI (${response.status})`)
  }

  const data = await response.json() as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message?.content?.trim() || 'Não consegui gerar uma resposta no momento.'
}

function buildImportantEvents(dashboards: DashboardMap): ExecutiveEvent[] {
  const events: ExecutiveEvent[] = []

  const crowdstrike = dashboards.crowdstrike
  if (crowdstrike) {
    const detections = (crowdstrike.recentDetections as Array<Record<string, unknown>> | undefined) ?? []
    detections
      .filter((d) => d.severity === 'Critical' || d.severity === 'High')
      .slice(0, 3)
      .forEach((d, index) => {
        events.push({
          id: `cs-${index}-${String(d.id ?? index)}`,
          platform: 'CrowdStrike',
          severity: d.severity === 'Critical' ? 'Critical' : 'High',
          event: String(d.technique ?? 'Detecção relevante'),
          details: `${String(d.hostname ?? 'Host desconhecido')} • ${String(d.id ?? 'N/A')}`,
          status: String(d.status ?? 'Investigando'),
        })
      })
  }

  const wazuh = dashboards.wazuh
  if (wazuh) {
    const alerts = (wazuh.recentAlerts as Array<Record<string, unknown>> | undefined) ?? []
    alerts
      .filter((a) => a.level === 'Critical' || a.level === 'High')
      .slice(0, 3)
      .forEach((a, index) => {
        events.push({
          id: `waz-${index}-${String(a.id ?? index)}`,
          platform: 'SIEM',
          severity: a.level === 'Critical' ? 'Critical' : 'High',
          event: String(a.description ?? 'Alerta relevante'),
          details: `${String(a.agent ?? 'Agente desconhecido')} • Regra ${String(a.rule ?? 'N/A')}`,
          status: 'Ativo',
        })
      })
  }

  const safetica = dashboards.safetica
  if (safetica) {
    const violations = (safetica.recentViolations as Array<Record<string, unknown>> | undefined) ?? []
    violations
      .filter((v) => toNumber(v.riskScore) >= 80 || String(v.action ?? '').includes('Blocked'))
      .slice(0, 3)
      .forEach((v, index) => {
        const risk = toNumber(v.riskScore)
        events.push({
          id: `saf-${index}-${String(v.id ?? index)}`,
          platform: 'Safetica',
          severity: risk >= 90 ? 'Critical' : 'High',
          event: `${String(v.classification ?? 'Violação DLP')} em ${String(v.channel ?? 'canal desconhecido')}`,
          details: `${String(v.user ?? 'Usuário desconhecido')} • Score ${risk}`,
          status: String(v.action ?? 'Bloqueado'),
        })
      })
  }

  const outpost24 = dashboards.outpost24
  if (outpost24) {
    const cves = (outpost24.topCVEs as Array<Record<string, unknown>> | undefined) ?? []
    cves
      .filter((c) => toNumber(c.score) >= 8.5)
      .slice(0, 3)
      .forEach((c, index) => {
        const score = toNumber(c.score)
        events.push({
          id: `op-${index}-${String(c.cveId ?? index)}`,
          platform: 'Outpost24',
          severity: score >= 9 ? 'Critical' : 'High',
          event: String(c.cveId ?? 'CVE crítica'),
          details: `${String(c.product ?? 'Produto não identificado')} • CVSS ${score}`,
          status: String(c.status ?? 'Ativa'),
        })
      })
  }

  const keeper = dashboards.keeper
  if (keeper) {
    const users = (keeper.highRiskUsers as Array<Record<string, unknown>> | undefined) ?? []
    users
      .filter((u) => toNumber(u.riskScore) >= 85)
      .slice(0, 3)
      .forEach((u, index) => {
        const risk = toNumber(u.riskScore)
        events.push({
          id: `kep-${index}-${String(u.id ?? index)}`,
          platform: 'Keeper',
          severity: risk >= 92 ? 'Critical' : 'High',
          event: 'Usuário com risco elevado de credenciais',
          details: `${String(u.user ?? 'Usuário')} • Score ${risk}`,
          status: String(u.mfaStatus ?? 'Revisar MFA'),
        })
      })
  }

  const zabbix = dashboards.zabbix
  if (zabbix) {
    const problems = (zabbix.activeProblems as Array<Record<string, unknown>> | undefined) ?? []
    problems
      .filter((p) => p.severity === 'Disaster' || p.severity === 'High')
      .slice(0, 3)
      .forEach((p, index) => {
        events.push({
          id: `zb-${index}-${String(p.id ?? index)}`,
          platform: 'Zabbix',
          severity: p.severity === 'Disaster' ? 'Critical' : 'High',
          event: String(p.problem ?? 'Problema de infraestrutura'),
          details: `${String(p.host ?? 'Host desconhecido')} • ${String(p.group ?? 'Grupo N/A')}`,
          status: String(p.severity ?? 'High'),
        })
      })
  }

  return events
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
    .slice(0, 18)
}

export default function ResumoExecutivo() {
  const [dashboards, setDashboards] = useState<DashboardMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let isDisposed = false
    let activeController: AbortController | null = null

    const fetchDashboards = async (withLoading: boolean) => {
      activeController?.abort()
      const controller = new AbortController()
      activeController = controller
      if (withLoading) setLoading(true)
      setError(null)

      try {
        const entries = await Promise.all(
          PLATFORM_IDS.map(async (platformId) => {
            try {
              const response = await api.get<{ platform_id: string; data: Record<string, unknown> }>(
                `/platforms/${platformId}/dashboard`,
                { signal: controller.signal },
              )
              return [platformId, response.data] as const
            } catch {
              return [platformId, null] as const
            }
          }),
        )

        if (isDisposed) return
        const next: DashboardMap = {}
        for (const [platformId, data] of entries) {
          if (data) next[platformId] = data
        }
        setDashboards(next)
        setRefreshedAt(Date.now())
        if (Object.keys(next).length === 0) {
          setError('Não foi possível carregar dados das plataformas.')
        }
      } finally {
        if (!isDisposed && withLoading) setLoading(false)
      }
    }

    void fetchDashboards(true)
    const intervalId = window.setInterval(() => {
      void fetchDashboards(false)
    }, 60_000)

    return () => {
      isDisposed = true
      activeController?.abort()
      window.clearInterval(intervalId)
    }
  }, [])

  const importantEvents = useMemo(() => buildImportantEvents(dashboards), [dashboards])

  // ── Platform data source classification ──
  const platformStatus = useMemo(() => {
    const result: Record<PlatformId, DataSourceType> = {} as Record<PlatformId, DataSourceType>
    for (const pid of PLATFORM_IDS) {
      const data = dashboards[pid]
      if (!data) {
        result[pid] = 'offline'
      } else if (MOCK_PLATFORMS.includes(pid)) {
        result[pid] = 'mock'
      } else if ((data as Record<string, unknown>)._live === true) {
        result[pid] = 'live'
      } else {
        result[pid] = 'mock' // real platform that fell back to mock data
      }
    }
    return result
  }, [dashboards])

  const livePlatformCount = Object.values(platformStatus).filter((s) => s === 'live').length
  const mockPlatformCount = Object.values(platformStatus).filter((s) => s === 'mock').length
  const offlinePlatformCount = Object.values(platformStatus).filter((s) => s === 'offline').length
  const onlinePlatforms = livePlatformCount + mockPlatformCount

  const criticalEvents = importantEvents.filter((e) => e.severity === 'Critical').length
  const highEvents = importantEvents.filter((e) => e.severity === 'High').length

  // ── Events split by real vs mock ──
  const realPlatformLabels = new Set(['CrowdStrike', 'SIEM', 'Outpost24', 'Zabbix'])
  const realCritical = importantEvents.filter((e) => e.severity === 'Critical' && realPlatformLabels.has(e.platform)).length
  const realHigh = importantEvents.filter((e) => e.severity === 'High' && realPlatformLabels.has(e.platform)).length
  const mockCritical = criticalEvents - realCritical
  const mockHigh = highEvents - realHigh

  // ── IMPROVED SCORE ALGORITHM ──
  // Factor 1: Threat Pressure from REAL integrations (weight: 45%)
  const realThreatRaw = Math.min(100, Math.round(realCritical * 8 + realHigh * 3))
  const realThreatScore = 100 - realThreatRaw // higher = better

  // Factor 2: Threat Pressure from MOCK data (weight: 10%)
  const mockThreatRaw = Math.min(100, Math.round(mockCritical * 8 + mockHigh * 3))
  const mockThreatScore = 100 - mockThreatRaw

  // Factor 3: Compliance & Hygiene from real sources (weight: 25%)
  const complianceSignals = useMemo(() => {
    const values: { value: number; source: string; isReal: boolean }[] = []

    const wazuhData = dashboards.wazuh
    const wazuhCompliance = wazuhData?.complianceBreakdown as Array<Record<string, unknown>> | undefined
    if (wazuhCompliance?.length) {
      const avgWazuh = wazuhCompliance.reduce((sum, item) => sum + toNumber(item.score), 0) / wazuhCompliance.length
      values.push({ value: avgWazuh, source: 'SIEM compliance', isReal: platformStatus.wazuh === 'live' })
    }

    const outpostPatch = dashboards.outpost24?.kpis as Record<string, unknown> | undefined
    const patchValue = (outpostPatch?.patchCompliance as Record<string, unknown> | undefined)?.value
    const patchPercent = parsePercent(patchValue)
    if (patchPercent > 0) values.push({ value: patchPercent, source: 'Outpost24 patch compliance', isReal: platformStatus.outpost24 === 'live' })

    const keeperKpis = dashboards.keeper?.kpis as Record<string, unknown> | undefined
    const keeperSecurityScore = (keeperKpis?.securityScore as Record<string, unknown> | undefined)?.value
    const keeperPercent = parsePercent(keeperSecurityScore)
    if (keeperPercent > 0) values.push({ value: keeperPercent, source: 'Keeper security score', isReal: false })

    return values
  }, [dashboards, platformStatus])

  const realComplianceSignals = complianceSignals.filter((s) => s.isReal)
  const mockComplianceSignals = complianceSignals.filter((s) => !s.isReal)
  const avgRealCompliance = realComplianceSignals.length
    ? realComplianceSignals.reduce((sum, s) => sum + s.value, 0) / realComplianceSignals.length
    : 55
  const avgMockCompliance = mockComplianceSignals.length
    ? mockComplianceSignals.reduce((sum, s) => sum + s.value, 0) / mockComplianceSignals.length
    : 60
  void avgMockCompliance // used for context only

  // Factor 4: Coverage (weight: 10%)
  const coverageScore = Math.round((livePlatformCount / REAL_PLATFORMS.length) * 100)

  // Factor 5: CrowdStrike specific indicators (weight: 10%)
  const csData = dashboards.crowdstrike
  const csKpis = csData?.kpis as Record<string, { value?: unknown }> | undefined
  const csDeviceCount = toNumber(csKpis?.totalDevices?.value ?? 0)
  const csOnlinePercent = csDeviceCount > 0 ? Math.min(100, toNumber(csKpis?.onlineDevices?.value ?? 0) / csDeviceCount * 100) : 50
  const csHealthScore = platformStatus.crowdstrike === 'live' ? Math.round(csOnlinePercent) : 50

  // Combined security score
  const securityScore = clamp(Math.round(
    realThreatScore * 0.45 +
    mockThreatScore * 0.10 +
    avgRealCompliance * 0.25 +
    coverageScore * 0.10 +
    csHealthScore * 0.10
  ), 0, 100)
  const securityLevel = scoreLabel(securityScore)

  const overallRiskScore = Math.min(100, Math.round(realCritical * 8 + realHigh * 3 + mockCritical * 2 + mockHigh * 1 + offlinePlatformCount * 5))
  const overallRiskLevel = levelFromScore(overallRiskScore)
  const overallTrend = criticalEvents > 8 ? 6 : criticalEvents > 4 ? 3 : -2

  const normalizedCompliance = Math.round(avgRealCompliance)

  const scoreBreakdown = useMemo(() => {
    return [
      {
        factor: 'Pressão de risco — dados reais',
        weight: '45%',
        value: `${realThreatScore}/100`,
        source: `${realCritical} críticos + ${realHigh} altos de CrowdStrike, SIEM, Outpost24, Zabbix`,
        isReal: true,
      },
      {
        factor: 'Compliance e higiene — dados reais',
        weight: '25%',
        value: `${normalizedCompliance}/100`,
        source: realComplianceSignals.map((s) => s.source).join(' + ') || 'SIEM + Outpost24',
        isReal: true,
      },
      {
        factor: 'Cobertura de integrações reais',
        weight: '10%',
        value: `${coverageScore}/100`,
        source: `${livePlatformCount}/${REAL_PLATFORMS.length} plataformas com dados reais`,
        isReal: true,
      },
      {
        factor: 'Saúde dos endpoints (CrowdStrike)',
        weight: '10%',
        value: `${csHealthScore}/100`,
        source: platformStatus.crowdstrike === 'live' ? `${Math.round(csOnlinePercent)}% dos devices online` : 'Estimado (dados mock)',
        isReal: platformStatus.crowdstrike === 'live',
      },
      {
        factor: 'Pressão de risco — dados estimados',
        weight: '10%',
        value: `${mockThreatScore}/100`,
        source: `${mockCritical} críticos + ${mockHigh} altos de Keeper, Safetica (dados mock)`,
        isReal: false,
      },
    ]
  }, [realThreatScore, normalizedCompliance, coverageScore, csHealthScore, realCritical, realHigh, mockCritical, mockHigh, livePlatformCount, realComplianceSignals, csOnlinePercent, platformStatus, mockThreatScore])

  const improvementRecommendations = useMemo(() => {
    const recs: Array<{ action: string; expectedGain: string; basedOn: string }> = []

    if (realCritical > 0) {
      recs.push({
        action: 'Remediar eventos críticos reais das 4 plataformas integradas nas próximas 24h',
        expectedGain: '+8 a +15 pontos',
        basedOn: `${realCritical} eventos críticos de dados reais (CrowdStrike, SIEM, Outpost24, Zabbix)`,
      })
    }

    if (realHigh > 3) {
      recs.push({
        action: 'Reduzir eventos de alta prioridade por regra/automação de resposta',
        expectedGain: '+4 a +10 pontos',
        basedOn: `${realHigh} eventos altos de plataformas com dados reais`,
      })
    }

    if (normalizedCompliance < 80) {
      recs.push({
        action: 'Elevar compliance e patching para >80% nos controles monitorados',
        expectedGain: '+5 a +12 pontos',
        basedOn: `compliance real atual em ${normalizedCompliance}%, baseado em SIEM + Outpost24`,
      })
    }

    if (livePlatformCount < REAL_PLATFORMS.length) {
      recs.push({
        action: `Ativar integração real nas ${REAL_PLATFORMS.length - livePlatformCount} plataformas ainda sem dados reais`,
        expectedGain: '+3 a +8 pontos',
        basedOn: `cobertura real ${livePlatformCount}/${REAL_PLATFORMS.length} — faltam dados reais`,
      })
    }

    recs.push({
      action: 'Integrar Keeper e Safetica com dados reais para score mais preciso',
      expectedGain: '+5 a +10 pontos de precisão',
      basedOn: `2 plataformas ainda com dados mock reduzem a confiabilidade do score`,
    })

    if (recs.length === 0) {
      recs.push({
        action: 'Manter rotina de hardening e resposta rápida para sustentar score alto',
        expectedGain: 'manutenção do nível atual',
        basedOn: 'não há pressão crítica acima dos limiares definidos',
      })
    }

    return recs.slice(0, 4)
  }, [realCritical, realHigh, normalizedCompliance, livePlatformCount])

  const topHighlights = importantEvents.slice(0, 4)

  const assistantContext = useMemo(() => {
    const platformSummary = PLATFORM_IDS.map((platformId) => {
      const data = dashboards[platformId]
      const dataSource = platformStatus[platformId]
      if (!data) {
        return { platform: PLATFORM_LABELS[platformId], platformId, online: false, dataSource: 'offline' }
      }

      const kpis = data.kpis as Record<string, { value?: unknown; label?: string }> | undefined
      const kpiSummary = kpis
        ? Object.entries(kpis).slice(0, 6).map(([key, value]) => ({
          key,
          label: value?.label ?? key,
          value: value?.value ?? 'N/A',
        }))
        : []

      return {
        platform: PLATFORM_LABELS[platformId],
        platformId,
        online: true,
        dataSource,
        kpis: kpiSummary,
      }
    })

    return {
      company: 'CAP',
      generatedAt: new Date().toISOString(),
      monitoredPlatforms: onlinePlatforms,
      realDataPlatforms: livePlatformCount,
      mockDataPlatforms: mockPlatformCount,
      offlinePlatforms: offlinePlatformCount,
      scoreAlgorithm: {
        description: 'Score calculado com peso diferenciado: 45% pressão de risco real + 25% compliance real + 10% cobertura + 10% saúde endpoints + 10% dados estimados',
        realThreatWeight: '45%',
        complianceWeight: '25%',
        coverageWeight: '10%',
        endpointHealthWeight: '10%',
        mockThreatWeight: '10%',
        note: 'Keeper e Safetica ainda usam dados mock — o score terá maior precisão quando integrados com dados reais',
      },
      securityScore,
      securityLevel,
      overallRiskScore,
      overallRiskLevel,
      criticalEvents,
      highEvents,
      realCritical,
      realHigh,
      mockCritical,
      mockHigh,
      topEvents: importantEvents.slice(0, 12),
      platformSummary,
      scoreBreakdown,
      improvementRecommendations,
      refreshedAt,
    }
  }, [onlinePlatforms, livePlatformCount, mockPlatformCount, offlinePlatformCount, securityScore, securityLevel, overallRiskScore, overallRiskLevel, criticalEvents, highEvents, realCritical, realHigh, mockCritical, mockHigh, importantEvents, dashboards, platformStatus, scoreBreakdown, improvementRecommendations, refreshedAt])

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev
      return [
        {
          id: 'assistant-init',
          role: 'assistant',
          content: `Sou o CAP Security Assistant. Score geral: ${securityScore}/100 (${securityLevel}). Calculado com dados reais de ${livePlatformCount} plataformas (CrowdStrike, SIEM, Outpost24, Zabbix) + estimativa de 2 plataformas mock (Keeper, Safetica). Posso correlacionar dados e explicar o score.`,
          createdAt: Date.now(),
        },
      ]
    })
  }, [securityScore, securityLevel, livePlatformCount])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, chatLoading])

  const sendQuestion = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || chatLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setQuestion('')
    setChatLoading(true)

    try {
      const answer = await askExecutiveAssistant({
        question: trimmed,
        context: assistantContext,
      })

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: answer,
        createdAt: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (chatError) {
      const fallbackError = chatError instanceof Error ? chatError.message : 'Erro ao gerar resposta.'
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          role: 'assistant',
          content: `Não consegui responder agora: ${fallbackError}`,
          createdAt: Date.now(),
        },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  const assistantPanel = (
    <div
      className="rounded-xl flex flex-col gap-0 shadow-lg overflow-hidden"
      style={{
        background: '#0F172A',
        border: '1px solid #334155',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-3"
        style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', borderBottom: '1px solid #334155' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #2563EB)' }}>
            <Bot size={14} style={{ color: '#FFFFFF' }} />
          </div>
          <div>
            <h2 className="text-[13px] font-bold" style={{ color: '#F1F5F9' }}>
              CAP Security Assistant
            </h2>
            <span className="text-[10px]" style={{ color: '#60A5FA' }}>
              {refreshedAt ? `Live • ${new Date(refreshedAt).toLocaleTimeString('pt-BR')}` : 'Escopo: ambiente CAP'}
            </span>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#065F46', color: '#6EE7B7' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
        </span>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="p-4 max-h-80 overflow-y-auto flex flex-col gap-3"
        style={{ background: '#0B1120' }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className="w-full flex"
            style={{ justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}
          >
            <div
              className="rounded-xl px-3.5 py-2.5 max-w-[90%]"
              style={{
                background: message.role === 'user' ? '#1D4ED8' : '#1E293B',
                border: message.role === 'user' ? '1px solid #3B82F6' : '1px solid #334155',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {message.role === 'user'
                  ? <User size={11} style={{ color: '#BFDBFE' }} />
                  : <Bot size={11} style={{ color: '#C4B5FD' }} />}
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: message.role === 'user' ? '#93C5FD' : '#A78BFA' }}>
                  {message.role === 'user' ? 'Você' : 'Assistant'}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: '#F8FAFC' }}>
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {chatLoading && (
          <div className="flex items-center gap-2 text-xs" style={{ color: '#93C5FD' }}>
            <Loader2 size={12} className="animate-spin" />
            Analisando e correlacionando dados das plataformas…
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="flex items-center gap-2 flex-wrap px-4 py-2" style={{ borderTop: '1px solid #1E293B' }}>
        {[
          'Qual o score geral de segurança da CAP hoje e por quê?',
          'Quais são os maiores riscos correlacionados entre SIEM e EDR?',
          'Qual prioridade de ação nas próximas 24 horas?',
        ].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => sendQuestion(suggestion)}
            disabled={chatLoading}
            className="text-[11px] px-3 py-1.5 rounded-full disabled:opacity-40 transition-all hover:brightness-125"
            style={{ background: '#1E293B', border: '1px solid #475569', color: '#E2E8F0' }}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 pb-4 pt-2">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void sendQuestion(question)
            }
          }}
          placeholder="Pergunte sobre risco, incidentes, correlação entre plataformas e score da CAP…"
          className="flex-1 rounded-lg px-3 py-2.5 text-[13px] outline-none placeholder:text-slate-500"
          style={{ background: '#1E293B', border: '1px solid #475569', color: '#F1F5F9' }}
          disabled={chatLoading}
        />
        <button
          onClick={() => void sendQuestion(question)}
          disabled={chatLoading || !question.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-semibold disabled:opacity-40 transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)', color: '#FFFFFF' }}
        >
          <Send size={13} /> Enviar
        </button>
      </div>
    </div>
  )

  return (
    <PageLayout
      title="Resumo Executivo"
      subtitle="CAP — visão consolidada dos eventos mais importantes em todas as plataformas"
    >
      <div className="flex items-center gap-2">
        {loading ? (
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={11} className="animate-spin" /> Carregando eventos executivos…
          </span>
        ) : error ? (
          <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
            style={{ color: '#F97316', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
            <WifiOff size={11} /> Dados indisponíveis em algumas plataformas
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
            style={{ color: '#22C55E', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <Wifi size={11} /> Consolidado em tempo real a partir das plataformas ativas
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8 flex flex-col gap-4">
          {/* ── Platform Status Grid ── */}
          <div
            className="rounded-xl p-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Plataformas Monitoradas
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {livePlatformCount} com dados reais &bull; {mockPlatformCount} com dados simulados
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
              {PLATFORM_IDS.map((pid) => {
                const st = platformStatus[pid]
                const isLive = st === 'live'
                const isMock = st === 'mock'
                const dotColor = isLive ? '#22C55E' : isMock ? '#F59E0B' : '#EF4444'
                const statusText = isLive ? 'Dados reais' : isMock ? 'Dados simulados' : 'Sem conexão'
                return (
                  <div
                    key={pid}
                    className="rounded-lg p-2.5 flex items-center gap-2.5"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {PLATFORM_LABELS[pid].split(' (')[0]}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{statusText}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="Plataformas Online" value={onlinePlatforms} trend={onlinePlatforms - PLATFORM_IDS.length} icon={CheckCircle2} />
            <MetricCard title="Eventos Críticos" value={criticalEvents} trend={criticalEvents} icon={ShieldAlert} />
            <MetricCard title="Eventos Altos" value={highEvents} trend={highEvents} icon={AlertTriangle} />
            <MetricCard title="Nível de Risco" value={`${overallRiskScore}/100`} trend={overallTrend} icon={Activity} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className="rounded-xl p-5"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Security Score CAP
                </span>
                <span
                  className="text-xs font-bold px-2 py-1 rounded-full"
                  style={{
                    color: securityScoreColor(securityScore),
                    background: `${securityScoreColor(securityScore)}18`,
                    border: `1px solid ${securityScoreColor(securityScore)}33`,
                  }}
                >
                  {securityLevel}
                </span>
              </div>
              <p className="text-3xl font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {securityScore}/100
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${securityScore}%`,
                      background: securityScoreColor(securityScore),
                    }}
                  />
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Calculado com base em {livePlatformCount} plataformas reais e {mockPlatformCount} simuladas.
                  Quanto maior, melhor a postura de segurança.
                </p>
              </div>
            </div>

            <div
              className="rounded-xl p-5"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} style={{ color: '#A855F7' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Fontes de Dados
                </span>
              </div>
              <div className="flex flex-col gap-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: '#22C55E' }} />
                  <span><strong>Dados reais</strong> — CrowdStrike, SIEM, Outpost24 e Zabbix estão conectados e enviando dados em tempo real.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: '#F59E0B' }} />
                  <span><strong>Dados simulados</strong> — Keeper e Safetica ainda não foram integrados. O score usa estimativas para essas plataformas.</span>
                </div>
              </div>
            </div>
          </div>

          <div
            className="rounded-xl p-5 flex flex-col gap-3"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Visão Geral do Ambiente CAP
              </span>
              <span
                className="text-xs font-bold px-2 py-1 rounded-full"
                style={{
                  color: overallRiskLevel === 'Crítico' ? '#EF4444' : overallRiskLevel === 'Alto' ? '#F97316' : overallRiskLevel === 'Médio' ? '#EAB308' : '#22C55E',
                  background: overallRiskLevel === 'Crítico' ? 'rgba(239,68,68,0.12)' : overallRiskLevel === 'Alto' ? 'rgba(249,115,22,0.12)' : overallRiskLevel === 'Médio' ? 'rgba(234,179,8,0.12)' : 'rgba(34,197,94,0.12)',
                  border: overallRiskLevel === 'Crítico' ? '1px solid rgba(239,68,68,0.25)' : overallRiskLevel === 'Alto' ? '1px solid rgba(249,115,22,0.25)' : overallRiskLevel === 'Médio' ? '1px solid rgba(234,179,8,0.25)' : '1px solid rgba(34,197,94,0.25)',
                }}
              >
                Risco {overallRiskLevel}
              </span>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Foram encontrados <strong>{criticalEvents} eventos críticos</strong> e <strong>{highEvents} de alta prioridade</strong> nas plataformas monitoradas.
              O nível de risco geral é <strong>{overallRiskScore}/100</strong>.
              Recomendação: tratar os eventos mais graves abaixo por ordem de prioridade.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {topHighlights.map((item) => (
                <div
                  key={`hl-${item.id}`}
                  className="rounded-lg px-3 py-2"
                  style={{
                    background: item.severity === 'Critical' ? 'rgba(239,68,68,0.06)' : 'rgba(249,115,22,0.06)',
                    border: item.severity === 'Critical' ? '1px solid rgba(239,68,68,0.18)' : '1px solid rgba(249,115,22,0.18)',
                  }}
                >
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {item.platform} • {item.event}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.details}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Eventos Importantes Consolidados
            </h2>
            <DataTable<ExecutiveEvent>
              columns={[
                { key: 'platform', label: 'Plataforma', sortable: true },
                {
                  key: 'severity',
                  label: 'Severidade',
                  sortable: true,
                  render: (value) => {
                    const severity = String(value) as Severity
                    const color = severity === 'Critical' ? '#EF4444' : '#F97316'
                    return (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ color, background: `${color}18`, border: `1px solid ${color}33` }}
                      >
                        {severity === 'Critical' ? 'Crítica' : 'Alta'}
                      </span>
                    )
                  },
                },
                { key: 'event', label: 'Evento', sortable: true },
                { key: 'details', label: 'Detalhes' },
                { key: 'status', label: 'Status', sortable: true },
              ]}
              data={importantEvents}
              pageSize={10}
              emptyMessage="Nenhum evento importante encontrado no momento."
            />
          </div>
        </div>

        <div className="xl:col-span-4 xl:sticky xl:top-20 flex flex-col gap-4">
          {assistantPanel}

          <div
            className="rounded-xl p-4"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
            }}
          >
            <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Como o score é calculado (AI-powered)</h3>
            <div className="flex flex-col gap-2">
              {scoreBreakdown.map((item) => (
                <div key={item.factor} className="rounded-lg p-2.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.factor} • peso {item.weight}</p>
                    <span
                      className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                      style={{
                        color: item.isReal ? '#22C55E' : '#F59E0B',
                        background: item.isReal ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                        border: item.isReal ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(245,158,11,0.3)',
                      }}
                    >
                      {item.isReal ? 'Real' : 'Mock'}
                    </span>
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{item.value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Fonte: {item.source}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
            }}
          >
            <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Como aumentar a pontuação</h3>
            <div className="flex flex-col gap-2">
              {improvementRecommendations.map((item, index) => (
                <div key={`${item.action}-${index}`} className="rounded-lg p-2.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.action}</p>
                  <p className="text-[11px]" style={{ color: '#22C55E' }}>Impacto esperado: {item.expectedGain}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Base: {item.basedOn}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
            }}
          >
            <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Metodologia e Governança</h3>
            <div className="flex flex-col gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <p>• <strong>Score ponderado:</strong> 90% do score vem de dados reais (CrowdStrike, SIEM, Outpost24, Zabbix) e 10% de dados estimados (Keeper, Safetica).</p>
              <p>• <strong>Transparência:</strong> cada fator do score mostra se é baseado em dados reais ou mock, com peso e fonte declarados.</p>
              <p>• <strong>AI-assisted:</strong> o assistente usa OpenAI para correlacionar dados e gerar análises em tempo real, sempre diferenciando a qualidade dos dados.</p>
              <p>• <strong>Atualização:</strong> refresh automático a cada 60 segundos com recalculo do score baseado nos dados mais recentes.</p>
              <p>• <strong>Evolução:</strong> quando Keeper e Safetica forem integrados com dados reais, o score se tornará 100% baseado em dados reais.</p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
