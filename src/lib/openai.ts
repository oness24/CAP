/**
 * OpenAI integration for AI-generated executive security narratives.
 * Requires VITE_OPENAI_API_KEY to be set in .env
 */

// ─── Outpost24 Remediation AI ──────────────────────────────────────────────────

export interface OutpostCVE {
  cveId: string
  score: number
  affected: number
  product: string
}

export interface OutpostAssetRisk {
  asset: string
  ip: string
  type: string
  critical: number
  high: number
  riskScore: number
}

export interface RemediationTask {
  id: string
  cveId: string
  asset: string
  priority: string
  status: string
}

export interface RemediationRecommendation {
  priority: number
  title: string
  cveId: string
  rationale: string
  steps: string[]
  urgency: 'Critical' | 'High' | 'Medium'
}

export async function generateRemediationPlan(params: {
  topCVEs: OutpostCVE[]
  highRiskAssets: OutpostAssetRisk[]
  openTasks: RemediationTask[]
  totalVulns: string
  criticalCount: number
  patchCompliance: string
}): Promise<RemediationRecommendation[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY is not configured in .env')
  }

  const cveLines = params.topCVEs.map(
    c => `  - ${c.cveId} (CVSS ${c.score}) — ${c.product} — ${c.affected} ativos afetados`
  ).join('\n')

  const assetLines = params.highRiskAssets.slice(0, 6).map(
    a => `  - ${a.asset} (${a.ip}, ${a.type}) — Score de Risco: ${a.riskScore}, Críticos: ${a.critical}, Altos: ${a.high}`
  ).join('\n')

  const taskLines = params.openTasks.slice(0, 8).map(
    t => `  - [${t.id}] ${t.cveId} em ${t.asset} — Prioridade: ${t.priority}, Status: ${t.status}`
  ).join('\n')

  const prompt = `Você é um analista sênior de gestão de vulnerabilidades. Com base nos seguintes dados reais de varredura do Outpost24, gere exatamente 4 recomendações de remediação priorizadas. Responda TUDO em Português do Brasil.

Resumo de Vulnerabilidades:
- Total de vulnerabilidades: ${params.totalVulns}
- CVEs críticas: ${params.criticalCount}
- Conformidade de patches: ${params.patchCompliance}

CVEs Críticas Prioritárias:
${cveLines}

Ativos de Maior Risco:
${assetLines}

Tarefas de Remediação Abertas:
${taskLines}

Retorne APENAS um array JSON válido com exatamente 4 objetos. Cada objeto deve ter exatamente estes campos:
- "priority": number (1-4, 1 = mais urgente)
- "title": string (título curto da ação em português, máx 12 palavras)
- "cveId": string (o CVE ID mais relevante, ou "Múltiplos" se geral)
- "rationale": string (1-2 frases em português explicando por que é priorizado, referenciando dados reais)
- "steps": array de 3 strings (passos concretos de remediação em português)
- "urgency": string, exatamente um de: "Critical", "High", "Medium"

Sem markdown, sem explicações, sem chaves extras. Apenas o array JSON.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.55,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      `OpenAI API error (${response.status}): ${(err as { error?: { message?: string } }).error?.message ?? response.statusText}`
    )
  }

  const data = (await response.json()) as { choices: { message: { content: string } }[] }
  const raw = data.choices[0].message.content.trim()

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as RemediationRecommendation[]
  } catch {
    const match = raw.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        return JSON.parse(match[0]) as RemediationRecommendation[]
      } catch { /* fall through */ }
    }
  }
  throw new Error('Could not parse AI response as a valid remediation plan.')
}

// ─── Per-CVE Step-by-Step Remediation ─────────────────────────────────────────

export interface CVERemediationGuide {
  cveId: string
  product: string
  score: number
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  summary: string
  steps: string[]
  verification: string
  references: string[]
}

export async function generateCVERemediationSteps(
  cves: OutpostCVE[]
): Promise<CVERemediationGuide[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY is not configured in .env')
  }

  const cveList = cves.map(
    c => `- ${c.cveId} (CVSS ${c.score}) — Product: ${c.product} — ${c.affected} assets affected`
  ).join('\n')

  const prompt = `Você é um especialista sênior em gestão de vulnerabilidades. Para cada CVE listada abaixo, forneça um guia de remediação detalhado e acionável baseado em avisos reais de fabricantes e melhores práticas de segurança. Responda TUDO em Português do Brasil.

CVEs para remediar:
${cveList}

Retorne APENAS um array JSON válido. Cada elemento deve ser um objeto com exatamente estes campos:
- "cveId": string (o CVE ID exato)
- "product": string (nome exato do produto da entrada)
- "score": number (score CVSS exato da entrada)
- "severity": string — exatamente um de: "Critical", "High", "Medium", "Low"
- "summary": string (1 frase em português: o que é a vulnerabilidade e seu impacto)
- "steps": array de exatamente 5 strings — passos concretos e ordenados de remediação em português (ex: "1. Identificar versões afetadas...", "2. Aplicar patch...", etc.)
- "verification": string (1 frase em português: como confirmar que a remediação foi bem-sucedida)
- "references": array de 2 strings — URLs reais de avisos de fabricantes ou NVD (use formato: "https://nvd.nist.gov/vuln/detail/${cves[0]?.cveId ?? 'CVE-XXXX-XXXX'}" como fallback)

Sem markdown, sem comentários extras, apenas o array JSON.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2500,
      temperature: 0.4,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      `OpenAI API error (${response.status}): ${(err as { error?: { message?: string } }).error?.message ?? response.statusText}`
    )
  }

  const data = (await response.json()) as { choices: { message: { content: string } }[] }
  const raw = data.choices[0].message.content.trim()

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as CVERemediationGuide[]
  } catch {
    const match = raw.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        return JSON.parse(match[0]) as CVERemediationGuide[]
      } catch { /* fall through */ }
    }
  }
  throw new Error('Could not parse AI response as CVE remediation guides.')
}

export interface IncidentDetail {
  ref: string
  category: string
  description: string
  severity: string
  status: string
}

export interface SeverityCount {
  name: string
  value: number
}

export interface OSCount {
  os: string
  count: number
}

export interface NarrativeParams {
  platform: string
  client: string
  period: string
  periodRange: string
  totalEndpoints: number | string
  activeDetections: number
  resolvedIncidents: number
  openIncidents: number
  mttr: string
  coverage: string
  criticalAlerts: number
  riskRating: string
  severityBreakdown?: SeverityCount[]
  endpointsByOS?: OSCount[]
  incidents?: IncidentDetail[]
}

export async function generateSecurityNarrative(params: NarrativeParams): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'VITE_OPENAI_API_KEY não configurada. Adicione-a ao ficheiro .env da raiz do projeto.'
    )
  }

  const sevLines = params.severityBreakdown?.length
    ? '\nDistribuição de severidade:\n' + params.severityBreakdown.map(s => `  - ${s.name}: ${s.value}`).join('\n')
    : ''

  const osLines = params.endpointsByOS?.length
    ? '\nEndpoints por sistema operativo:\n' + params.endpointsByOS.map(o => `  - ${o.os}: ${o.count}`).join('\n')
    : ''

  const incidentLines = params.incidents?.length
    ? '\nRegisto de incidentes:\n' + params.incidents.map(
        i => `  - [${i.ref}] ${i.severity} | ${i.category} | ${i.description} | Estado: ${i.status}`
      ).join('\n')
    : ''

  const prompt = `És um analista sénior de cibersegurança da empresa Contego Security a redigir um relatório executivo em português europeu (pt-PT) para um cliente MSSP.

Redige um parágrafo executivo com 3-4 frases concisas e profissionais baseado nos seguintes dados reais de segurança. Usa exatamente os valores e referências fornecidos. Não uses marcadores, cabeçalhos nem listas — apenas texto corrido.

Plataforma: ${params.platform}
Cliente: ${params.client}
Período do relatório: ${params.period} (${params.periodRange})
Endpoints geridos: ${params.totalEndpoints}
Deteções ativas: ${params.activeDetections}
Incidentes resolvidos: ${params.resolvedIncidents}
Incidentes em investigação: ${params.openIncidents}
Tempo médio de resposta (MTTR): ${params.mttr}
Cobertura de proteção: ${params.coverage}
Alertas críticos contidos: ${params.criticalAlerts}
Classificação de risco: ${params.riskRating}${sevLines}${osLines}${incidentLines}

Redige apenas o parágrafo narrativo, sem introdução nem conclusão adicionais.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.65,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      `Erro da API OpenAI (${response.status}): ${(err as { error?: { message?: string } }).error?.message ?? response.statusText}`
    )
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[]
  }
  return data.choices[0].message.content.trim()
}

// ─── Strategic Recommendations ────────────────────────────────────────────────

export interface RecommendationsParams {
  platform: string
  client: string
  period: string
  resolvedIncidents: number
  openIncidents: number
  criticalAlerts: number
  coverage: string
  riskRating: string
  incidents: IncidentDetail[]
  severityBreakdown?: SeverityCount[]
  endpointsByOS?: OSCount[]
  totalEndpoints?: number | string
}

export async function generateStrategicRecommendations(
  params: RecommendationsParams
): Promise<string[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'VITE_OPENAI_API_KEY não configurada. Adicione-a ao ficheiro .env da raiz do projeto.'
    )
  }

  const incidentLines = params.incidents.map(
    i => `  - [${i.ref}] ${i.severity} | ${i.category} | ${i.description} | Estado: ${i.status}`
  ).join('\n')

  const sevLines = params.severityBreakdown?.length
    ? '\nDistribuição de severidade:\n' + params.severityBreakdown.map(s => `  - ${s.name}: ${s.value}`).join('\n')
    : ''

  const osLines = params.endpointsByOS?.length
    ? '\nEndpoints por SO:\n' + params.endpointsByOS.map(o => `  - ${o.os}: ${o.count}`).join('\n')
    : ''

  const prompt = `És um analista sénior de cibersegurança da empresa Contego Security a elaborar recomendações estratégicas em português europeu (pt-PT) para um relatório executivo MSSP.

Com base nos seguintes dados reais do período ${params.period}, gera exatamente 3 recomendações estratégicas prioritárias, concisas e acionáveis. Cada recomendação deve ter 1-2 frases, referenciar dados ou incidentes concretos quando relevante, e ser dirigida à equipa de gestão de segurança.

Plataforma: ${params.platform}
Cliente: ${params.client}
Endpoints geridos: ${params.totalEndpoints ?? 'N/A'}
Incidentes resolvidos: ${params.resolvedIncidents}
Incidentes em investigação: ${params.openIncidents}
Alertas críticos contidos: ${params.criticalAlerts}
Cobertura de proteção: ${params.coverage}
Classificação de risco: ${params.riskRating}${sevLines}${osLines}

Registo completo de incidentes:
${incidentLines}

Responde APENAS com um array JSON válido de 3 strings, sem markdown, sem comentários, sem chaves extra. Exemplo: ["Rec 1", "Rec 2", "Rec 3"]`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.6,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      `Erro da API OpenAI (${response.status}): ${(err as { error?: { message?: string } }).error?.message ?? response.statusText}`
    )
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[]
  }

  const raw = data.choices[0].message.content.trim()
  // Parse JSON array; fallback to splitting by newlines if malformed
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {
    // try extracting array portion
    const match = raw.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed)) return parsed.map(String)
      } catch { /* fall through */ }
    }
  }
  // Last resort: split non-empty lines
  return raw.split('\n').map(l => l.replace(/^[\d.\-*]+\s*/, '').trim()).filter(Boolean).slice(0, 3)
}

// ─── AI Risk Analysis (Outpost24) ─────────────────────────────────────────────

export interface RiskAnalysisResult {
  overallRiskScore: number
  riskLevel: 'Crítico' | 'Alto' | 'Médio' | 'Baixo'
  summary: string
  factors: { factor: string; impact: 'Alto' | 'Médio' | 'Baixo'; description: string }[]
  recommendations: string[]
  trend: 'Piorando' | 'Estável' | 'Melhorando'
  trendExplanation: string
}

export async function generateRiskAnalysis(params: {
  totalVulns: string
  criticalCount: number
  highCount: number
  avgCVSS: string
  assetsScanned: number
  patchCompliance: string
  criticalAssets: number
  avgRiskScore: number
  topCVEs: OutpostCVE[]
  riskBands: { label: string; count: number }[]
}): Promise<RiskAnalysisResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) throw new Error('VITE_OPENAI_API_KEY não configurada no .env')

  const cveLines = params.topCVEs.slice(0, 10).map(
    c => `  - ${c.cveId} (CVSS ${c.score}) — ${c.product} — ${c.affected} ativos`
  ).join('\n')

  const bandLines = params.riskBands.map(
    b => `  - ${b.label}: ${b.count} ativos`
  ).join('\n')

  const prompt = `Você é um analista sênior de cibersegurança especializado em gestão de risco corporativo. Com base nos dados reais de varredura do Outpost24 abaixo, calcule o risco geral da organização e forneça uma análise detalhada. Responda TUDO em Português do Brasil.

Dados de Vulnerabilidade:
- Total de vulnerabilidades: ${params.totalVulns}
- CVEs críticas: ${params.criticalCount}
- CVEs altas: ${params.highCount}
- CVSS médio: ${params.avgCVSS}
- Ativos escaneados: ${params.assetsScanned}
- Conformidade de patches: ${params.patchCompliance}
- Ativos críticos (score ≥80): ${params.criticalAssets}
- Score médio de risco dos ativos: ${params.avgRiskScore}

Distribuição por Banda de Risco:
${bandLines}

Top CVEs Encontradas:
${cveLines}

Retorne APENAS um objeto JSON válido com exatamente estes campos:
- "overallRiskScore": number (0-100, calculado com base na severidade, quantidade, exposição e conformidade)
- "riskLevel": string (exatamente um de: "Crítico", "Alto", "Médio", "Baixo")
- "summary": string (2-3 frases em português resumindo a postura de risco da organização)
- "factors": array de 4 objetos, cada um com: { "factor": string (nome do fator), "impact": string ("Alto"|"Médio"|"Baixo"), "description": string (1 frase explicando) }
- "recommendations": array de 3 strings (recomendações prioritárias em português para reduzir o risco)
- "trend": string (exatamente um de: "Piorando", "Estável", "Melhorando")
- "trendExplanation": string (1 frase explicando a tendência)

Sem markdown, sem explicações extras. Apenas o objeto JSON.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.45,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Erro da API OpenAI (${response.status}): ${(err as { error?: { message?: string } }).error?.message ?? response.statusText}`)
  }

  const data = (await response.json()) as { choices: { message: { content: string } }[] }
  const raw = data.choices[0].message.content.trim()

  try {
    return JSON.parse(raw) as RiskAnalysisResult
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) as RiskAnalysisResult } catch { /* fall through */ }
    }
  }
  throw new Error('Não foi possível interpretar a resposta da IA como análise de risco.')
}

// ─── AI Report Analysis (Outpost24) ──────────────────────────────────────────

export interface ReportAnalysisResult {
  executiveSummary: string
  keyFindings: string[]
  riskOverview: string
  complianceStatus: string
  actionItems: { priority: number; action: string; deadline: string }[]
  conclusion: string
}

export async function generateReportAnalysis(params: {
  totalVulns: string
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  avgCVSS: string
  assetsScanned: number
  patchCompliance: string
  topCVEs: OutpostCVE[]
  topProducts: { label: string; count: number }[]
  totalFindings: number
  scanSchedules: number
}): Promise<ReportAnalysisResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) throw new Error('VITE_OPENAI_API_KEY não configurada no .env')

  const cveLines = params.topCVEs.slice(0, 8).map(
    c => `  - ${c.cveId} (CVSS ${c.score}) — ${c.product} — ${c.affected} ativos`
  ).join('\n')

  const productLines = params.topProducts.slice(0, 6).map(
    p => `  - ${p.label}: ${p.count} vulnerabilidades`
  ).join('\n')

  const prompt = `Você é um analista sênior de cibersegurança da empresa CAP elaborando um relatório executivo completo de gestão de vulnerabilidades. Com base nos dados reais do Outpost24 abaixo, gere uma análise completa do relatório. Responda TUDO em Português do Brasil.

Dados do Período:
- Total de vulnerabilidades: ${params.totalVulns}
- CVEs Críticas: ${params.criticalCount}
- CVEs Altas: ${params.highCount}
- CVEs Médias: ${params.mediumCount}
- CVEs Baixas: ${params.lowCount}
- CVSS médio: ${params.avgCVSS}
- Ativos escaneados: ${params.assetsScanned}
- Conformidade de patches: ${params.patchCompliance}
- Total de achados: ${params.totalFindings}
- Agendamentos de varredura: ${params.scanSchedules}

Top CVEs:
${cveLines}

Produtos Mais Afetados:
${productLines}

Retorne APENAS um objeto JSON válido com exatamente estes campos:
- "executiveSummary": string (3-4 frases em português — resumo executivo profissional da postura de segurança)
- "keyFindings": array de 4 strings (principais descobertas em português, cada uma com 1-2 frases)
- "riskOverview": string (2 frases sobre o panorama geral de risco em português)
- "complianceStatus": string (1-2 frases sobre conformidade e patches em português)
- "actionItems": array de 3 objetos: { "priority": number (1-3), "action": string (ação em português), "deadline": string (prazo sugerido, ex: "Imediato", "7 dias", "30 dias") }
- "conclusion": string (1-2 frases — conclusão e próximos passos em português)

Sem markdown, sem explicações extras. Apenas o objeto JSON.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.5,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Erro da API OpenAI (${response.status}): ${(err as { error?: { message?: string } }).error?.message ?? response.statusText}`)
  }

  const data = (await response.json()) as { choices: { message: { content: string } }[] }
  const raw = data.choices[0].message.content.trim()

  try {
    return JSON.parse(raw) as ReportAnalysisResult
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) as ReportAnalysisResult } catch { /* fall through */ }
    }
  }
  throw new Error('Não foi possível interpretar a resposta da IA como análise de relatório.')
}
