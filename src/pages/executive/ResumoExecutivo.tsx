import { useEffect, useMemo, useRef, useState } from 'react'
import { ShieldAlert, AlertTriangle, Layers, Activity, Loader2, Wifi, WifiOff, Bot, Send, Sparkles, User } from 'lucide-react'
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

  const criticalEvents = importantEvents.filter((e) => e.severity === 'Critical').length
  const highEvents = importantEvents.filter((e) => e.severity === 'High').length
  const onlinePlatforms = Object.keys(dashboards).length

  const overallRiskScore = Math.min(100, Math.round(criticalEvents * 7 + highEvents * 2 + (6 - onlinePlatforms) * 8))
  const overallRiskLevel = levelFromScore(overallRiskScore)
  const overallTrend = criticalEvents > 8 ? 6 : criticalEvents > 4 ? 3 : -2

  const complianceSignals = useMemo(() => {
    const values: number[] = []

    const wazuhCompliance = dashboards.wazuh?.complianceBreakdown as Array<Record<string, unknown>> | undefined
    if (wazuhCompliance?.length) {
      const avgWazuh = wazuhCompliance.reduce((sum, item) => sum + toNumber(item.score), 0) / wazuhCompliance.length
      values.push(avgWazuh)
    }

    const outpostPatch = dashboards.outpost24?.kpis as Record<string, unknown> | undefined
    const patchValue = (outpostPatch?.patchCompliance as Record<string, unknown> | undefined)?.value
    const patchPercent = parsePercent(patchValue)
    if (patchPercent > 0) values.push(patchPercent)

    const keeperKpis = dashboards.keeper?.kpis as Record<string, unknown> | undefined
    const keeperSecurityScore = (keeperKpis?.securityScore as Record<string, unknown> | undefined)?.value
    const keeperPercent = parsePercent(keeperSecurityScore)
    if (keeperPercent > 0) values.push(keeperPercent)

    return values
  }, [dashboards])

  const avgCompliance = complianceSignals.length
    ? complianceSignals.reduce((sum, value) => sum + value, 0) / complianceSignals.length
    : 60

  const securityScore = clamp(Math.round((100 - overallRiskScore) * 0.65 + avgCompliance * 0.35), 0, 100)
  const securityLevel = scoreLabel(securityScore)

  const coveragePercent = Math.round((onlinePlatforms / PLATFORM_IDS.length) * 100)
  const normalizedThreatPressure = overallRiskScore
  const normalizedCompliance = Math.round(avgCompliance)

  const scoreBreakdown = useMemo(() => {
    return [
      {
        factor: 'Pressão de risco (eventos críticos/altos)',
        weight: '65%',
        value: `${100 - normalizedThreatPressure}/100`,
        source: `${criticalEvents} críticos + ${highEvents} altos nos eventos consolidados`,
      },
      {
        factor: 'Conformidade e higiene',
        weight: '35%',
        value: `${normalizedCompliance}/100`,
        source: 'SIEM compliance + patch compliance Outpost24 + security score Keeper',
      },
      {
        factor: 'Cobertura de integrações ativas',
        weight: 'informativo',
        value: `${coveragePercent}%`,
        source: `${onlinePlatforms}/${PLATFORM_IDS.length} plataformas com dashboard online`,
      },
    ]
  }, [normalizedThreatPressure, normalizedCompliance, criticalEvents, highEvents, coveragePercent, onlinePlatforms])

  const improvementRecommendations = useMemo(() => {
    const recs: Array<{ action: string; expectedGain: string; basedOn: string }> = []

    if (criticalEvents > 0) {
      recs.push({
        action: 'Reduzir eventos críticos com remediação das 5 ocorrências mais severas nas próximas 24h',
        expectedGain: '+6 a +12 pontos',
        basedOn: `${criticalEvents} eventos críticos impactam diretamente a pressão de risco`,
      })
    }

    if (highEvents > 4) {
      recs.push({
        action: 'Atacar eventos de alta prioridade recorrentes por regra/caso de uso',
        expectedGain: '+3 a +8 pontos',
        basedOn: `${highEvents} eventos de alta prioridade elevam o risco consolidado`,
      })
    }

    if (normalizedCompliance < 85) {
      recs.push({
        action: 'Elevar conformidade de patching e controles de baseline para >85%',
        expectedGain: '+4 a +10 pontos',
        basedOn: `compliance consolidada atual em ${normalizedCompliance}%`,
      })
    }

    if (onlinePlatforms < PLATFORM_IDS.length) {
      recs.push({
        action: 'Restabelecer integrações offline para cobertura total das plataformas',
        expectedGain: '+2 a +5 pontos',
        basedOn: `cobertura atual ${onlinePlatforms}/${PLATFORM_IDS.length}`,
      })
    }

    if (recs.length === 0) {
      recs.push({
        action: 'Manter rotina de hardening e resposta rápida para sustentar score alto',
        expectedGain: 'manutenção do nível atual',
        basedOn: 'não há pressão crítica acima dos limiares definidos',
      })
    }

    return recs.slice(0, 3)
  }, [criticalEvents, highEvents, normalizedCompliance, onlinePlatforms])

  const topHighlights = importantEvents.slice(0, 4)

  const assistantContext = useMemo(() => {
    const platformSummary = PLATFORM_IDS.map((platformId) => {
      const data = dashboards[platformId]
      if (!data) {
        return { platform: platformId, online: false }
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
        platform: platformId,
        online: true,
        kpis: kpiSummary,
      }
    })

    return {
      company: 'CAP',
      generatedAt: new Date().toISOString(),
      monitoredPlatforms: onlinePlatforms,
      securityScore,
      securityLevel,
      overallRiskScore,
      overallRiskLevel,
      criticalEvents,
      highEvents,
      topEvents: importantEvents.slice(0, 12),
      platformSummary,
      scoreBreakdown,
      improvementRecommendations,
      refreshedAt,
    }
  }, [onlinePlatforms, securityScore, securityLevel, overallRiskScore, overallRiskLevel, criticalEvents, highEvents, importantEvents, dashboards, scoreBreakdown, improvementRecommendations, refreshedAt])

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev
      return [
        {
          id: 'assistant-init',
          role: 'assistant',
          content: `Sou o CAP Security Assistant. Score geral atual: ${securityScore}/100 (${securityLevel}). Posso correlacionar dados entre CrowdStrike, SIEM, Safetica, Outpost24, Keeper e Zabbix para responder perguntas sobre o ambiente da empresa.`,
          createdAt: Date.now(),
        },
      ]
    })
  }, [securityScore, securityLevel])

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
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Bot size={16} style={{ color: '#A855F7' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            CAP Security Assistant
          </h2>
        </div>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {refreshedAt ? `Live • ${new Date(refreshedAt).toLocaleTimeString('pt-BR')}` : 'Escopo: ambiente CAP'}
        </span>
      </div>

      <div
        ref={chatContainerRef}
        className="rounded-lg p-3 max-h-72 overflow-y-auto flex flex-col gap-2"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className="w-full flex"
            style={{ justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}
          >
            <div
              className="rounded-lg px-3 py-2 max-w-[92%]"
              style={{
                background: message.role === 'user' ? 'rgba(59,130,246,0.12)' : 'rgba(168,85,247,0.12)',
                border: message.role === 'user' ? '1px solid rgba(59,130,246,0.28)' : '1px solid rgba(168,85,247,0.28)',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {message.role === 'user' ? <User size={12} style={{ color: '#60A5FA' }} /> : <Bot size={12} style={{ color: '#C084FC' }} />}
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {message.role === 'user' ? 'Você' : 'Assistant'}
                </span>
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {chatLoading && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={12} className="animate-spin" />
            Analisando e correlacionando dados das plataformas…
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          'Qual o score geral de segurança da CAP hoje e por quê?',
          'Quais são os maiores riscos correlacionados entre SIEM e EDR?',
          'Qual prioridade de ação nas próximas 24 horas?',
        ].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => sendQuestion(suggestion)}
            disabled={chatLoading}
            className="text-[11px] px-2.5 py-1 rounded-full disabled:opacity-50"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
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
          className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          disabled={chatLoading}
        />
        <button
          onClick={() => void sendQuestion(question)}
          disabled={chatLoading || !question.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-50"
          style={{ background: 'var(--accent-primary)', color: '#fff' }}
        >
          <Send size={12} /> Enviar
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

      {assistantPanel}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="Plataformas Monitoradas" value={onlinePlatforms} trend={onlinePlatforms - 6} icon={Layers} />
            <MetricCard title="Eventos Críticos" value={criticalEvents} trend={criticalEvents} icon={ShieldAlert} />
            <MetricCard title="Eventos Alta Prioridade" value={highEvents} trend={highEvents} icon={AlertTriangle} />
            <MetricCard title="Risco Geral CAP" value={`${overallRiskScore}/100`} trend={overallTrend} icon={Activity} />
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
                  Security Score Geral CAP
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
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Score consolidado por correlação de risco (eventos críticos/altos), cobertura de plataformas e sinais de conformidade.
              </p>
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
                  Correlação Multi-Plataforma
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                O assistente correlaciona indicadores entre EDR, SIEM, DLP, Vulnerability Management, Password Security e Monitoramento de Infraestrutura,
                priorizando perguntas sobre risco geral, incidentes críticos, cobertura e recomendações para o ambiente CAP.
              </p>
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
              O ambiente CAP apresenta {criticalEvents} eventos críticos e {highEvents} eventos de alta prioridade entre as plataformas monitoradas.
              O score geral de risco consolidado é {overallRiskScore}/100, considerando severidade dos eventos, volume de incidentes e cobertura ativa das integrações.
              A recomendação imediata é tratar os eventos críticos abaixo por ordem de prioridade e validar remediação em ciclo diário.
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
          <div
            className="rounded-xl p-4"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
            }}
          >
            <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Como o score foi calculado</h3>
            <div className="flex flex-col gap-2">
              {scoreBreakdown.map((item) => (
                <div key={item.factor} className="rounded-lg p-2.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.factor} • peso {item.weight}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{item.value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Base: {item.source}</p>
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
            <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Padrão Executivo e Governança</h3>
            <div className="flex flex-col gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <p>• Hierarquia visual: assistente no topo para acesso rápido e decisão imediata.</p>
              <p>• Contexto e rastreabilidade: score explicado por fator, peso e fonte de dados.</p>
              <p>• Ação orientada: recomendações com impacto estimado para aumentar o percentual.</p>
              <p>• Atualização contínua: refresh automático de dashboards a cada 60 segundos.</p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
