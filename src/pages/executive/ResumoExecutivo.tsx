import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { ShieldAlert, AlertTriangle, Activity, Loader2, Wifi, WifiOff, Bot, Send, Sparkles, User, CheckCircle2, Trash2, Copy, Check, MessageSquare } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { DataTable } from '@/components/tables/DataTable'
import { api } from '@/lib/api'
import type { PlatformId } from '@/types'
import {
  collectExecutivePlatformIntel,
  EXECUTIVE_PLATFORM_IDS,
  EXECUTIVE_PLATFORM_LABELS,
  type DashboardMap,
} from '@/lib/executiveAgent'

type Severity = 'Critical' | 'High'

interface SeverityCounters {
  critical: number
  high: number
  realCritical: number
  realHigh: number
  mockCritical: number
  mockHigh: number
}

const SCORE_PLATFORM_IDS: PlatformId[] = ['crowdstrike', 'outpost24', 'keeper']

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

/** Lightweight markdown-like renderer for chat messages */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []
  let listKey = 0

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${listKey++}`} className="flex flex-col gap-0.5 ml-1 my-1">
          {listItems}
        </ul>
      )
      listItems = []
    }
  }

  const formatInline = (str: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = []
    // Regex for **bold**, `code`, and plain text
    const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.slice(lastIndex, match.index))
      }
      if (match[2]) {
        parts.push(<strong key={`b-${match.index}`} style={{ color: '#E2E8F0', fontWeight: 600 }}>{match[2]}</strong>)
      } else if (match[4]) {
        parts.push(<code key={`c-${match.index}`} className="text-[12px] px-1 py-0.5 rounded" style={{ background: '#334155', color: '#93C5FD' }}>{match[4]}</code>)
      }
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < str.length) {
      parts.push(str.slice(lastIndex))
    }
    return parts.length > 0 ? parts : [str]
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()

    if (trimmed === '') {
      flushList()
      elements.push(<div key={`br-${idx}`} className="h-1.5" />)
      return
    }

    // Bullet list items: "- text" or "• text"
    const bulletMatch = trimmed.match(/^[-•]\s+(.+)$/)
    if (bulletMatch) {
      listItems.push(
        <li key={`li-${idx}`} className="flex items-start gap-1.5 text-[12.5px] leading-relaxed" style={{ color: '#CBD5E1' }}>
          <span className="text-[8px] mt-1.5 flex-shrink-0" style={{ color: '#60A5FA' }}>●</span>
          <span>{formatInline(bulletMatch[1])}</span>
        </li>
      )
      return
    }

    // Numbered list: "1. text", "2. text"
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/)
    if (numberedMatch) {
      listItems.push(
        <li key={`li-${idx}`} className="flex items-start gap-1.5 text-[12.5px] leading-relaxed" style={{ color: '#CBD5E1' }}>
          <span className="text-[11px] font-bold flex-shrink-0" style={{ color: '#818CF8' }}>{numberedMatch[1]}.</span>
          <span>{formatInline(numberedMatch[2])}</span>
        </li>
      )
      return
    }

    flushList()
    elements.push(
      <p key={`p-${idx}`} className="text-[12.5px] leading-relaxed" style={{ color: '#E2E8F0' }}>
        {formatInline(trimmed)}
      </p>
    )
  })

  flushList()
  return elements
}

function formatChatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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
    'wazuh', 'siem', 'crowdstrike', 'outpost24', 'keeper', 'zabbix',
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

function normalizeSeverity(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function countFromCrowdstrike(data: Record<string, unknown> | undefined): { critical: number; high: number } {
  if (!data) return { critical: 0, high: 0 }

  // Use recentDetections as primary source — reflects current active state
  const detections = (data.recentDetections as Array<Record<string, unknown>> | undefined) ?? []
  if (detections.length > 0) {
    const critical = detections.filter((d) => normalizeSeverity(d.severity) === 'critical').length
    const high = detections.filter((d) => normalizeSeverity(d.severity) === 'high').length
    return { critical, high }
  }

  // Fallback: use incidents/alerts count from kpis if available
  const kpis = data.kpis as Record<string, { value?: unknown }> | undefined
  if (kpis) {
    const incidentsCritical = toNumber(kpis.criticalIncidents?.value ?? 0)
    const incidentsHigh = toNumber(kpis.highIncidents?.value ?? 0)
    if (incidentsCritical > 0 || incidentsHigh > 0) {
      return { critical: incidentsCritical, high: incidentsHigh }
    }
  }

  return { critical: 0, high: 0 }
}

function countFromOutpost24(data: Record<string, unknown> | undefined): { critical: number; high: number } {
  if (!data) return { critical: 0, high: 0 }
  const cves = (data.topCVEs as Array<Record<string, unknown>> | undefined) ?? []
  let critical = 0
  let high = 0

  cves.forEach((cve) => {
    const score = toNumber(cve.score)
    if (score >= 9) critical += 1
    else if (score >= 8.5) high += 1
  })

  return { critical, high }
}

function countFromKeeper(data: Record<string, unknown> | undefined): { critical: number; high: number } {
  if (!data) return { critical: 0, high: 0 }
  const users = (data.highRiskUsers as Array<Record<string, unknown>> | undefined) ?? []
  let critical = 0
  let high = 0

  users.forEach((u) => {
    const risk = toNumber(u.riskScore)
    if (risk >= 92) critical += 1
    else if (risk >= 85) high += 1
  })

  return { critical, high }
}

async function askExecutiveAssistant(params: {
  question: string
  context: Record<string, unknown>
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<string> {
  const { question, context, conversationHistory = [] } = params
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
    lines.push(`**Score atual CAP:** ${String(context.securityScore ?? 'N/A')}/100 (${String(context.securityLevel ?? 'N/A')})`)
    if (asksScoreReason && scoreBreakdown.length) {
      lines.push('\n**Base do cálculo:**')
      scoreBreakdown.slice(0, 5).forEach((item) => {
        lines.push(`- **${item.factor}** (${item.weight}): ${item.value} — fonte: ${item.source}`)
      })
    }
    if (asksImprove && recommendations.length) {
      lines.push('\n**Como melhorar o percentual:**')
      recommendations.slice(0, 3).forEach((item) => {
        lines.push(`- **${item.action}** (ganho estimado: ${item.expectedGain}) — base: ${item.basedOn}`)
      })
    }
    return lines.join('\n')
  }

  // --- Local handler: platform status questions ---
  const asksPlatforms = /plataforma|platform|online|offline|simulad|integra|conexão|conectad|fonte|dados reais/.test(q)
  if (asksPlatforms) {
    const ds = context.platformDataSources as { live?: string[]; mock?: string[]; offline?: string[] } | undefined
    const lines: string[] = []
    lines.push(`**Status das plataformas CAP:**`)
    if (ds?.live?.length) lines.push(`- **Dados reais (${ds.live.length}):** ${ds.live.join(', ')}`)
    if (ds?.mock?.length) lines.push(`- **Dados simulados (${ds.mock.length}):** ${ds.mock.join(', ')}`)
    if (ds?.offline?.length) lines.push(`- **Offline (${ds.offline.length}):** ${ds.offline.join(', ')}`)
    lines.push(`\nTotal monitoradas: **${Number(context.monitoredPlatforms ?? 0)}** | Score calculado com: **${Number(context.realDataPlatforms ?? 0)}/${SCORE_PLATFORM_IDS.length}** plataformas reais.`)
    return lines.join('\n')
  }

  // --- Local handler: events/incidents questions ---
  const asksEvents = /evento|incidente|alerta|detec[çc]|crític|alto|high|critical|quantos/.test(q)
  if (asksEvents) {
    const topEvents = (context.topEvents as Array<{ platform: string; severity: string; event: string; details: string }>) ?? []
    const lines: string[] = []
    lines.push(`**Eventos de segurança da CAP:**`)
    lines.push(`- **${Number(context.criticalEvents ?? 0)}** eventos críticos (${Number(context.realCritical ?? 0)} reais, ${Number(context.mockCritical ?? 0)} simulados)`)
    lines.push(`- **${Number(context.highEvents ?? 0)}** eventos altos (${Number(context.realHigh ?? 0)} reais, ${Number(context.mockHigh ?? 0)} simulados)`)
    if (topEvents.length > 0) {
      lines.push(`\n**Top eventos mais graves:**`)
      topEvents.slice(0, 5).forEach((ev) => {
        lines.push(`- **${ev.platform}** [${ev.severity}]: ${ev.event} — ${ev.details}`)
      })
    }
    return lines.join('\n')
  }

  // --- Local handler: priority / next actions questions ---
  const asksPriority = /prioridade|próxim|ação|ações|o que fazer|recomend|urgente|imediato|24 hora|plano/.test(q)
  if (asksPriority && recommendations.length) {
    const topEvents = (context.topEvents as Array<{ platform: string; severity: string; event: string }>) ?? []
    const lines: string[] = []
    lines.push(`**Prioridades de ação para a CAP:**\n`)
    recommendations.slice(0, 4).forEach((item, idx) => {
      lines.push(`**${idx + 1}.** ${item.action}\n   Ganho estimado: **${item.expectedGain}** | Base: ${item.basedOn}`)
    })
    if (topEvents.length > 0) {
      lines.push(`\n**Eventos mais urgentes para tratar agora:**`)
      topEvents.filter(ev => ev.severity === 'Critical').slice(0, 3).forEach((ev) => {
        lines.push(`- **${ev.platform}**: ${ev.event}`)
      })
    }
    return lines.join('\n')
  }

  // --- Local handler: correlation (SIEM + EDR) questions ---
  const asksCorrelation = /correla[çc]|siem.*edr|edr.*siem|wazuh.*crowdstrike|crowdstrike.*wazuh|cruzar|cruzamento|entre.*plataforma/.test(q)
  if (asksCorrelation) {
    const topEvents = (context.topEvents as Array<{ platform: string; severity: string; event: string; details: string }>) ?? []
    const csEvents = topEvents.filter(e => e.platform.toLowerCase().includes('crowdstrike'))
    const wzEvents = topEvents.filter(e => e.platform.toLowerCase().includes('wazuh'))
    const lines: string[] = []
    lines.push(`**Correlação entre plataformas CAP:**\n`)
    lines.push(`**CrowdStrike (EDR):** ${csEvents.length} eventos graves`)
    csEvents.slice(0, 3).forEach(e => lines.push(`  - [${e.severity}] ${e.event}`))
    lines.push(`\n**Wazuh (SIEM):** ${wzEvents.length} eventos graves`)
    wzEvents.slice(0, 3).forEach(e => lines.push(`  - [${e.severity}] ${e.event}`))
    if (csEvents.length > 0 && wzEvents.length > 0) {
      lines.push(`\n**Análise:** Presença simultânea de alertas em EDR e SIEM indica possível atividade maliciosa persistente. Recomenda-se investigar se os hosts afetados no CrowdStrike coincidem com os alertas do Wazuh.`)
    } else if (csEvents.length === 0 && wzEvents.length === 0) {
      lines.push(`\nAmbas plataformas sem eventos graves no momento — boa postura.`)
    }
    return lines.join('\n')
  }

  // --- Local handler: specific platform questions ---
  const asksCrowdstrike = /crowdstrike|edr|falcon|endpoint/.test(q) && !/siem|wazuh|correla/.test(q)
  const asksWazuh = /wazuh|siem/.test(q) && !/crowdstrike|edr|correla/.test(q)
  const asksOutpost = /outpost|vulnerabilidade|cve|patch/.test(q)
  const asksKeeper = /keeper|senha|password|credencial/.test(q)
  const asksZabbix = /zabbix|infra|monitoramento|uptime/.test(q)

  if (asksCrowdstrike || asksWazuh || asksOutpost || asksKeeper || asksZabbix) {
    const platformSummary = (context.platformSummary ?? {}) as Record<string, Record<string, unknown>>
    const topEvents = (context.topEvents as Array<{ platform: string; severity: string; event: string; details: string }>) ?? []
    const ds = context.platformDataSources as { live?: string[]; mock?: string[]; offline?: string[] } | undefined
    let platformName = ''
    let platformKey = ''

    if (asksCrowdstrike) { platformName = 'CrowdStrike (EDR)'; platformKey = 'crowdstrike' }
    else if (asksWazuh) { platformName = 'Wazuh (SIEM)'; platformKey = 'wazuh' }
    else if (asksOutpost) { platformName = 'Outpost24 (Vuln Mgmt)'; platformKey = 'outpost24' }
    else if (asksKeeper) { platformName = 'Keeper (Password Mgmt)'; platformKey = 'keeper' }
    else if (asksZabbix) { platformName = 'Zabbix (Infra)'; platformKey = 'zabbix' }

    const isLive = ds?.live?.some(p => p.toLowerCase().includes(platformKey))
    const isMock = ds?.mock?.some(p => p.toLowerCase().includes(platformKey))
    const dataStatus = isLive ? '✅ Dados reais' : isMock ? '⚠️ Dados simulados' : '❌ Offline'

    const platEvents = topEvents.filter(e => e.platform.toLowerCase().includes(platformKey))
    const summary = platformSummary[platformKey]

    const lines: string[] = []
    lines.push(`**${platformName}** — ${dataStatus}\n`)

    if (summary) {
      const summaryEntries = Object.entries(summary).slice(0, 6)
      summaryEntries.forEach(([key, val]) => {
        lines.push(`- **${key}:** ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`)
      })
    }

    if (platEvents.length > 0) {
      lines.push(`\n**Eventos ativos (${platEvents.length}):**`)
      platEvents.slice(0, 4).forEach(e => lines.push(`- [${e.severity}] ${e.event} — ${e.details}`))
    } else {
      lines.push(`\nNenhum evento grave registrado nesta plataforma no momento.`)
    }

    return lines.join('\n')
  }

  // --- Generic local fallback when no API key ---
  if (!apiKey) {
    const securityScore = Number(context.securityScore ?? 0)
    const riskLevel = String(context.overallRiskLevel ?? 'N/A')
    const criticalEvents = Number(context.criticalEvents ?? 0)
    const highEvents = Number(context.highEvents ?? 0)
    const ds = context.platformDataSources as { live?: string[]; mock?: string[] } | undefined

    const lines: string[] = []
    lines.push(`**Análise local CAP** (sem IA externa):\n`)
    lines.push(`- **Score:** ${securityScore}/100 | **Risco:** ${riskLevel}`)
    lines.push(`- **Eventos críticos:** ${criticalEvents} | **Eventos altos:** ${highEvents}`)
    if (ds?.live?.length) lines.push(`- **Dados reais de:** ${ds.live.join(', ')}`)
    lines.push(`\n💡 Configure \`VITE_OPENAI_API_KEY\` para respostas analíticas mais detalhadas e correlações avançadas.`)
    return lines.join('\n')
  }

  const prompt = `Você é o CAP Security Assistant — assistente executivo de cibersegurança da empresa CAP (Club Athletico Paulistano), operado pela Contego Security (MSSP).

Regras obrigatórias:
1) Responda APENAS perguntas relacionadas ao ambiente da CAP e aos dados fornecidos.
2) Se a pergunta estiver fora desse escopo, responda exatamente: "Só posso responder sobre o ambiente e os dados de segurança da CAP."
3) Não invente números. Use apenas o contexto JSON abaixo.
4) Seja direto, técnico e objetivo, em português do Brasil. Use **negrito** para métricas e plataformas.
5) Sempre que útil, correlacione plataformas: **CrowdStrike** (EDR), **Wazuh** (SIEM), **Outpost24** (Vuln Mgmt), **Keeper** (Password Mgmt) e **Zabbix** (Infra).
6) IMPORTANTE: Diferencie dados REAIS, SIMULADOS e OFFLINE usando o campo platformDataSources do contexto. Sempre cite a confiabilidade da resposta.
7) Formate a resposta usando markdown: **negrito** para destaques, listas com "- " para itens, e quebre em parágrafos curtos.

Algoritmo do Score de Segurança:
- 30% Ameaças ativas (CrowdStrike — incidentes e detecções por severidade)
- 15% Exposição a vulnerabilidades (Outpost24 CVEs + Keeper high-risk users, curva logarítmica)
- 25% Compliance (Outpost24 patching + Keeper security score)
- 15% Cobertura (quantas das 3 plataformas de score têm dados reais)
- 15% Saúde de endpoints (CrowdStrike — % de endpoints com sensor ativo)
Nota: Wazuh (SIEM) e Zabbix (Infra) NÃO entram no cálculo do score, mas seus alertas aparecem nos eventos.

Contexto consolidado CAP (JSON):
${JSON.stringify(context, null, 2)}

Pergunta do usuário:
${question}

Responda de forma clara e estruturada em até 8 linhas. Use markdown.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system' as const, content: prompt },
        // Include last 6 conversation turns for context
        ...conversationHistory.slice(-6).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: question },
      ],
      max_tokens: 600,
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
          EXECUTIVE_PLATFORM_IDS.map(async (platformId) => {
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

  const platformIntel = useMemo(() => collectExecutivePlatformIntel(dashboards), [dashboards])

  const platformStatus = platformIntel.statusMap
  const livePlatformCount = platformIntel.liveCount
  const mockPlatformCount = platformIntel.mockCount
  const offlinePlatformCount = platformIntel.offlineCount
  const onlinePlatforms = platformIntel.onlineCount

  const severityCounters = useMemo<SeverityCounters>(() => {
    const counters: SeverityCounters = {
      critical: 0,
      high: 0,
      realCritical: 0,
      realHigh: 0,
      mockCritical: 0,
      mockHigh: 0,
    }

    const addCounts = (platformId: PlatformId, counts: { critical: number; high: number }) => {
      const critical = Math.max(0, Math.round(counts.critical))
      const high = Math.max(0, Math.round(counts.high))
      const status = platformStatus[platformId]

      counters.critical += critical
      counters.high += high

      if (status === 'live') {
        counters.realCritical += critical
        counters.realHigh += high
      } else {
        counters.mockCritical += critical
        counters.mockHigh += high
      }
    }

    addCounts('crowdstrike', countFromCrowdstrike(dashboards.crowdstrike))
    addCounts('outpost24', countFromOutpost24(dashboards.outpost24))
    addCounts('keeper', countFromKeeper(dashboards.keeper))

    return counters
  }, [dashboards, platformStatus])

  const criticalEvents = severityCounters.critical
  const highEvents = severityCounters.high
  const realCritical = severityCounters.realCritical
  const realHigh = severityCounters.realHigh
  const mockCritical = severityCounters.mockCritical
  const mockHigh = severityCounters.mockHigh

  // ── IMPROVED SCORE ALGORITHM ──
  // Separate active threats (CrowdStrike = incidents/detections)
  // from vulnerability exposure (Outpost24 CVEs + Keeper risk users)

  // Per-platform severity for active vs vulnerability split
  const csCounts = useMemo(() => countFromCrowdstrike(dashboards.crowdstrike), [dashboards.crowdstrike])
  const opCounts = useMemo(() => countFromOutpost24(dashboards.outpost24), [dashboards.outpost24])
  const kepCounts = useMemo(() => countFromKeeper(dashboards.keeper), [dashboards.keeper])

  // Active threats: real-time incidents from CrowdStrike
  const activeCritical = (platformStatus.crowdstrike === 'live' ? csCounts.critical : 0)
  const activeHigh = (platformStatus.crowdstrike === 'live' ? csCounts.high : 0)

  // Vulnerability exposure: CVEs + credential risk from Outpost24 + Keeper
  const vulnCritical = (platformStatus.outpost24 === 'live' ? opCounts.critical : 0)
    + (platformStatus.keeper === 'live' ? kepCounts.critical : 0)
  const vulnHigh = (platformStatus.outpost24 === 'live' ? opCounts.high : 0)
    + (platformStatus.keeper === 'live' ? kepCounts.high : 0)

  // Factor 1: Active Threat Pressure (weight: 30%)
  // Active incidents/detections — linear, each critical is impactful
  const activeThreatRaw = Math.min(100, Math.round(activeCritical * 12 + activeHigh * 3))
  const activeThreatScore = 100 - activeThreatRaw

  // Factor 2: Vulnerability Exposure (weight: 15%)
  // CVEs and risk users — logarithmic curve (many CVEs are normal, diminishing impact)
  const vulnRaw = Math.min(100, Math.round(Math.log(vulnCritical + 1) * 16 + Math.log(vulnHigh + 1) * 6))
  const vulnScore = 100 - vulnRaw

  // Factor 3: Compliance & Hygiene from real sources (weight: 25%)
  const complianceSignals = useMemo(() => {
    const values: { value: number; weight: number; source: string; isReal: boolean }[] = []

    const outpostPatch = dashboards.outpost24?.kpis as Record<string, unknown> | undefined
    const patchValue = (outpostPatch?.patchCompliance as Record<string, unknown> | undefined)?.value
    const patchPercent = parsePercent(patchValue)
    // Outpost24 patch compliance — lower weight because it can be extremely low
    if (patchPercent >= 0) values.push({ value: Math.max(patchPercent, 10), weight: 1, source: 'Outpost24 patch compliance', isReal: platformStatus.outpost24 === 'live' })

    const keeperKpis = dashboards.keeper?.kpis as Record<string, unknown> | undefined
    const keeperSecurityScore = (keeperKpis?.securityScore as Record<string, unknown> | undefined)?.value
    const keeperPercent = parsePercent(keeperSecurityScore)
    // Keeper security score — higher weight (more reliable indicator)
    if (keeperPercent > 0) values.push({ value: keeperPercent, weight: 2, source: 'Keeper security score', isReal: platformStatus.keeper === 'live' })

    return values
  }, [dashboards, platformStatus])

  const realComplianceSignals = complianceSignals.filter((s) => s.isReal)
  const mockComplianceSignals = complianceSignals.filter((s) => !s.isReal)
  const avgRealCompliance = realComplianceSignals.length
    ? realComplianceSignals.reduce((sum, s) => sum + s.value * s.weight, 0) / realComplianceSignals.reduce((sum, s) => sum + s.weight, 0)
    : 55
  const avgMockCompliance = mockComplianceSignals.length
    ? mockComplianceSignals.reduce((sum, s) => sum + s.value * s.weight, 0) / mockComplianceSignals.reduce((sum, s) => sum + s.weight, 0)
    : 60
  void avgMockCompliance // used for context only

  // Factor 4: Coverage (weight: 15%)
  const liveScorePlatformCount = SCORE_PLATFORM_IDS.filter((pid) => platformStatus[pid] === 'live').length
  const coverageScore = Math.round((liveScorePlatformCount / SCORE_PLATFORM_IDS.length) * 100)

  // Factor 5: CrowdStrike Endpoint Health (weight: 15%)
  const csData = dashboards.crowdstrike
  const csKpis = csData?.kpis as Record<string, { value?: unknown }> | undefined
  const csDeviceCount = toNumber(csKpis?.totalDevices?.value ?? 0)
  // When CrowdStrike is live but totalDevices=0 (API edge case), assume good health (80)
  const csOnlinePercent = csDeviceCount > 0
    ? Math.min(100, toNumber(csKpis?.onlineDevices?.value ?? 0) / csDeviceCount * 100)
    : (platformStatus.crowdstrike === 'live' ? 80 : 50)
  const csHealthScore = platformStatus.crowdstrike === 'live' ? Math.round(csOnlinePercent) : 50

  // Combined security score
  const securityScore = clamp(Math.round(
    activeThreatScore * 0.30 +
    vulnScore * 0.15 +
    avgRealCompliance * 0.25 +
    coverageScore * 0.15 +
    csHealthScore * 0.15
  ), 0, 100)
  const securityLevel = scoreLabel(securityScore)

  const overallRiskScore = Math.min(100, Math.round(activeCritical * 10 + activeHigh * 3 + vulnCritical * 2 + vulnHigh * 1 + offlinePlatformCount * 5))
  const overallRiskLevel = levelFromScore(overallRiskScore)
  const overallTrend = criticalEvents > 8 ? 6 : criticalEvents > 4 ? 3 : -2

  const normalizedCompliance = Math.round(avgRealCompliance)

  const scoreBreakdown = useMemo(() => {
    return [
      {
        factor: 'Ameaças ativas (CrowdStrike)',
        weight: '30%',
        value: `${activeThreatScore}/100`,
        source: `${activeCritical} incidentes críticos + ${activeHigh} altos (detecções e violações ativas)`,
        isReal: true,
      },
      {
        factor: 'Exposição a vulnerabilidades (Outpost24 + Keeper)',
        weight: '15%',
        value: `${vulnScore}/100`,
        source: `${vulnCritical} CVEs/riscos críticos + ${vulnHigh} altos (escala logarítmica)`,
        isReal: true,
      },
      {
        factor: 'Compliance e higiene',
        weight: '25%',
        value: `${normalizedCompliance}/100`,
        source: realComplianceSignals.map((s) => s.source).join(' + ') || 'Outpost24 + Keeper',
        isReal: true,
      },
      {
        factor: 'Cobertura de integrações reais',
        weight: '15%',
        value: `${coverageScore}/100`,
        source: `${liveScorePlatformCount}/${SCORE_PLATFORM_IDS.length} plataformas do score com dados reais`,
        isReal: true,
      },
      {
        factor: 'Saúde dos endpoints (CrowdStrike)',
        weight: '15%',
        value: `${csHealthScore}/100`,
        source: platformStatus.crowdstrike === 'live' ? `${Math.round(csOnlinePercent)}% dos devices online` : 'Estimado (dados mock)',
        isReal: platformStatus.crowdstrike === 'live',
      },
    ]
  }, [activeThreatScore, vulnScore, normalizedCompliance, coverageScore, csHealthScore, activeCritical, activeHigh, vulnCritical, vulnHigh, liveScorePlatformCount, realComplianceSignals, csOnlinePercent, platformStatus])

  const improvementRecommendations = useMemo(() => {
    const recs: Array<{ action: string; expectedGain: string; basedOn: string }> = []

    if (activeCritical > 0) {
      recs.push({
        action: 'Remediar incidentes críticos ativos (CrowdStrike) nas próximas 24h',
        expectedGain: '+10 a +18 pontos',
        basedOn: `${activeCritical} incidentes críticos ativos`,
      })
    }

    if (activeHigh > 3) {
      recs.push({
        action: 'Reduzir alertas de alta prioridade por regra/automação de resposta',
        expectedGain: '+4 a +10 pontos',
        basedOn: `${activeHigh} alertas altos ativos de CrowdStrike`,
      })
    }

    if (vulnCritical > 5) {
      recs.push({
        action: 'Priorizar remediação das CVEs críticas do Outpost24 e usuários de alto risco no Keeper',
        expectedGain: '+3 a +8 pontos',
        basedOn: `${vulnCritical} CVEs/riscos críticos de vulnerabilidade`,
      })
    }

    if (normalizedCompliance < 80) {
      recs.push({
        action: 'Elevar compliance e patching para >80% nos controles monitorados',
        expectedGain: '+5 a +12 pontos',
        basedOn: `compliance real atual em ${normalizedCompliance}%, baseado em Outpost24 + Keeper`,
      })
    }

    if (liveScorePlatformCount < SCORE_PLATFORM_IDS.length) {
      recs.push({
        action: `Ativar integração real nas ${SCORE_PLATFORM_IDS.length - liveScorePlatformCount} plataformas de score ainda sem dados reais`,
        expectedGain: '+3 a +8 pontos',
        basedOn: `cobertura real ${liveScorePlatformCount}/${SCORE_PLATFORM_IDS.length} no score — faltam dados reais`,
      })
    }

    if (recs.length === 0) {
      recs.push({
        action: 'Manter rotina de hardening e resposta rápida para sustentar score alto',
        expectedGain: 'manutenção do nível atual',
        basedOn: 'não há pressão crítica acima dos limiares definidos',
      })
    }

    return recs.slice(0, 4)
  }, [activeCritical, activeHigh, vulnCritical, normalizedCompliance, liveScorePlatformCount])

  const topHighlights = importantEvents.slice(0, 4)

  const assistantContext = useMemo(() => {
    const confidenceNote = [
      platformIntel.livePlatforms.length ? `Reais: ${platformIntel.livePlatforms.join(', ')}` : '',
      platformIntel.mockPlatforms.length ? `Simulados: ${platformIntel.mockPlatforms.join(', ')}` : '',
      platformIntel.offlinePlatforms.length ? `Offline: ${platformIntel.offlinePlatforms.join(', ')}` : '',
    ].filter(Boolean).join(' | ')

    return {
      company: 'CAP',
      generatedAt: new Date().toISOString(),
      monitoredPlatforms: onlinePlatforms,
      realDataPlatforms: livePlatformCount,
      mockDataPlatforms: mockPlatformCount,
      offlinePlatforms: offlinePlatformCount,
      platformDataSources: {
        live: platformIntel.livePlatforms,
        mock: platformIntel.mockPlatforms,
        offline: platformIntel.offlinePlatforms,
      },
      scoreAlgorithm: {
        description: 'Score calculado com fatores diferenciados: 30% ameaças ativas (CrowdStrike) + 15% vulnerabilidades (Outpost24+Keeper, curva log) + 25% compliance + 15% cobertura + 15% saúde endpoints. Sem Zabbix e sem SIEM.',
        activeThreatsWeight: '30%',
        vulnExposureWeight: '15%',
        complianceWeight: '25%',
        coverageWeight: '15%',
        endpointHealthWeight: '15%',
        excludedFromScore: ['SIEM', 'Zabbix'],
        note: confidenceNote || 'Todas as plataformas estão com dados reais',
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
      platformSummary: platformIntel.platformSummary,
      scoreBreakdown,
      improvementRecommendations,
      refreshedAt,
    }
  }, [onlinePlatforms, livePlatformCount, mockPlatformCount, offlinePlatformCount, securityScore, securityLevel, overallRiskScore, overallRiskLevel, criticalEvents, highEvents, realCritical, realHigh, mockCritical, mockHigh, importantEvents, platformIntel, scoreBreakdown, improvementRecommendations, refreshedAt])

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev
      return [
        {
          id: 'assistant-init',
          role: 'assistant',
          content: `Sou o CAP Security Assistant. Score geral: ${securityScore}/100 (${securityLevel}). Fontes atuais: ${platformIntel.livePlatforms.length} reais, ${platformIntel.mockPlatforms.length} simuladas e ${platformIntel.offlinePlatforms.length} offline. Posso correlacionar os dados e explicar o score com base no que está online agora.`,
          createdAt: Date.now(),
        },
      ]
    })
  }, [securityScore, securityLevel, platformIntel.livePlatforms.length, platformIntel.mockPlatforms.length, platformIntel.offlinePlatforms.length])

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
      // Build conversation history from existing messages (exclude system init)
      const history = messages
        .filter(m => m.id !== 'assistant-init')
        .map(m => ({ role: m.role, content: m.content }))

      const answer = await askExecutiveAssistant({
        question: trimmed,
        context: assistantContext,
        conversationHistory: history,
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

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: 'assistant-init',
        role: 'assistant',
        content: `Sou o CAP Security Assistant. Score geral: ${securityScore}/100 (${securityLevel}). Fontes atuais: ${platformIntel.livePlatforms.length} reais, ${platformIntel.mockPlatforms.length} simuladas e ${platformIntel.offlinePlatforms.length} offline. Posso correlacionar os dados e explicar o score com base no que está online agora.`,
        createdAt: Date.now(),
      },
    ])
  }, [securityScore, securityLevel, platformIntel.livePlatforms.length, platformIntel.mockPlatforms.length, platformIntel.offlinePlatforms.length])

  const copyMessage = useCallback((messageId: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(messageId)
      setTimeout(() => setCopiedId(null), 2000)
    }).catch(() => { /* clipboard not available */ })
  }, [])

  const suggestedQuestions = useMemo(() => {
    const base = [
      { icon: '📊', text: 'Qual o score geral de segurança da CAP hoje e por quê?' },
      { icon: '🔗', text: 'Quais são os maiores riscos correlacionados entre SIEM e EDR?' },
      { icon: '⚡', text: 'Qual a prioridade de ação nas próximas 24 horas?' },
    ]
    const extras = [
      { icon: '🔐', text: 'Como está o CrowdStrike (EDR)?' },
      { icon: '📡', text: 'Quais plataformas estão online com dados reais?' },
      { icon: '🛡️', text: 'Quantos eventos críticos temos agora e onde?' },
      { icon: '🔑', text: 'Como está o Keeper e a segurança de senhas?' },
      { icon: '📈', text: 'O que fazer para melhorar a pontuação de segurança?' },
      { icon: '🔍', text: 'Quais vulnerabilidades críticas foram encontradas?' },
    ]
    // Show the 3 base + 2 random extras, rotating
    const shuffled = extras.sort(() => Math.random() - 0.5).slice(0, 2)
    return [...base, ...shuffled]
  }, [])

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
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #2563EB)' }}>
            <Bot size={16} style={{ color: '#FFFFFF' }} />
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
        <div className="flex items-center gap-2">
          {messages.length > 1 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-all hover:brightness-125"
              style={{ background: '#1E293B', border: '1px solid #475569', color: '#94A3B8' }}
              title="Limpar conversa"
            >
              <Trash2 size={10} /> Limpar
            </button>
          )}
          <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#065F46', color: '#6EE7B7' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="p-4 overflow-y-auto flex flex-col gap-3"
        style={{ background: '#0B1120', maxHeight: '480px', minHeight: '200px' }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className="w-full flex group"
            style={{ justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}
          >
            <div
              className="rounded-xl px-3.5 py-2.5 max-w-[92%] relative"
              style={{
                background: message.role === 'user' ? '#1D4ED8' : '#1E293B',
                border: message.role === 'user' ? '1px solid #3B82F6' : '1px solid #334155',
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  {message.role === 'user'
                    ? <User size={11} style={{ color: '#BFDBFE' }} />
                    : <Bot size={11} style={{ color: '#C4B5FD' }} />}
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: message.role === 'user' ? '#93C5FD' : '#A78BFA' }}>
                    {message.role === 'user' ? 'Você' : 'Assistant'}
                  </span>
                  <span className="text-[9px]" style={{ color: '#475569' }}>{formatChatTime(message.createdAt)}</span>
                </div>
                {message.role === 'assistant' && message.id !== 'assistant-init' && (
                  <button
                    onClick={() => copyMessage(message.id, message.content)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/5"
                    title="Copiar resposta"
                  >
                    {copiedId === message.id
                      ? <Check size={10} style={{ color: '#22C55E' }} />
                      : <Copy size={10} style={{ color: '#64748B' }} />
                    }
                  </button>
                )}
              </div>
              <div className="text-[12.5px] leading-relaxed" style={{ color: '#F8FAFC' }}>
                {message.role === 'assistant' ? renderMarkdown(message.content) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {chatLoading && (
          <div className="flex items-start gap-2" style={{ color: '#93C5FD' }}>
            <div className="rounded-xl px-3.5 py-2.5" style={{ background: '#1E293B', border: '1px solid #334155' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Bot size={11} style={{ color: '#C4B5FD' }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#A78BFA' }}>
                  Assistant
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span className="text-[11px]" style={{ color: '#64748B' }}>Analisando dados das plataformas…</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="flex flex-col gap-1.5 px-4 py-2.5" style={{ borderTop: '1px solid #1E293B' }}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <MessageSquare size={10} style={{ color: '#64748B' }} />
          <span className="text-[10px] font-medium" style={{ color: '#64748B' }}>Perguntas sugeridas</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {suggestedQuestions.map((suggestion) => (
            <button
              key={suggestion.text}
              onClick={() => sendQuestion(suggestion.text)}
              disabled={chatLoading}
              className="text-[10.5px] px-2.5 py-1.5 rounded-lg disabled:opacity-40 transition-all hover:brightness-125 hover:border-blue-500/50 text-left"
              style={{ background: '#1E293B', border: '1px solid #334155', color: '#CBD5E1' }}
            >
              <span className="mr-1">{suggestion.icon}</span>{suggestion.text}
            </button>
          ))}
        </div>
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
          className="flex-1 rounded-lg px-3 py-2.5 text-[13px] outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500/50"
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
                {livePlatformCount} com dados reais &bull; {mockPlatformCount} com dados simulados &bull; {offlinePlatformCount} offline
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
              {EXECUTIVE_PLATFORM_IDS.map((pid) => {
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
                        {EXECUTIVE_PLATFORM_LABELS[pid].split(' (')[0]}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{statusText}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="Plataformas Online" value={onlinePlatforms} trend={onlinePlatforms - EXECUTIVE_PLATFORM_IDS.length} icon={CheckCircle2} />
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
                  Score CAP
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
              <div className="mt-3">
                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${securityScore}%`,
                      background: securityScoreColor(securityScore),
                    }}
                  />
                </div>
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
                  <span><strong>Dados reais</strong> — {platformIntel.livePlatforms.join(', ') || 'Nenhuma plataforma no momento'}.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: '#F59E0B' }} />
                  <span><strong>Dados simulados</strong> — {platformIntel.mockPlatforms.join(', ') || 'Nenhuma plataforma simulada'}.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: '#EF4444' }} />
                  <span><strong>Offline</strong> — {platformIntel.offlinePlatforms.join(', ') || 'Nenhuma plataforma offline'}.</span>
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


        </div>
      </div>
    </PageLayout>
  )
}
