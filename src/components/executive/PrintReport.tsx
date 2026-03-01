import { forwardRef } from 'react'
import type { PlatformWeeklyReport, RiskRating, WeeklyMetric } from '@/data/executive/weeklyReports'
import { PLATFORM_REGISTRY } from '@/constants/platforms'
import type { PlatformId } from '@/types'
import { crowdstrikeDashboard } from '@/data/crowdstrike/dashboard'

interface Props {
  report: PlatformWeeklyReport
  weekLabel: string
  platformId: PlatformId
  dashboardData?: typeof crowdstrikeDashboard
  metrics?: WeeklyMetric[]
  periodLabel?: string
  narrative?: string
  recommendations?: string[]
}

const ratingDot: Record<RiskRating, string> = {
  Critical:  '#C00000',
  Elevated:  '#E05C00',
  Moderate:  '#CC8800',
  Stable:    '#15803D',
  Improving: '#15803D',
}

const ratingBg: Record<RiskRating, string> = {
  Critical:  '#FFF0F0',
  Elevated:  '#FFF5ED',
  Moderate:  '#FFFBE6',
  Stable:    '#F0FDF4',
  Improving: '#F0FDF4',
}

const ratingPT: Record<RiskRating, string> = {
  Critical:  'CRÍTICO',
  Elevated:  'ELEVADO',
  Moderate:  'MODERADO',
  Stable:    'ESTÁVEL',
  Improving: 'A MELHORAR',
}

const severityColor: Record<string, string> = {
  Critical: '#C00000',
  High:     '#E05C00',
  Average:  '#CC8800',
  Medium:   '#CC8800',
  Low:      '#15803D',
  Disaster: '#7030A0',
}

export const PrintReport = forwardRef<HTMLDivElement, Props>(function PrintReport(
  { report, weekLabel, platformId, dashboardData, metrics, periodLabel, narrative, recommendations }, ref
) {
  const displayMetrics = metrics ?? report.metrics
  const displayNarrative = narrative ?? report.narrative
  const displayRecommendations = recommendations ?? report.recommendations
  const config = PLATFORM_REGISTRY[platformId]
  const printDate = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
  const d = dashboardData

  const sevMap: Record<string, number> = {}
  if (d) for (const s of d.severityBreakdown) sevMap[s.name] = s.value
  const totalSev = Object.values(sevMap).reduce((a, b) => a + b, 0) || 1

  const typeMap: Record<string, number> = {}
  const endpointsByType = (d as typeof crowdstrikeDashboard & { endpointsByType?: { type: string; count: number }[] })?.endpointsByType ?? []
  for (const e of endpointsByType) typeMap[e.type] = e.count

  return (
    <div
      ref={ref}
      id="executive-print-report"
      style={{
        fontFamily: '"Segoe UI", -apple-system, Arial, sans-serif',
        color: '#1e293b',
        background: '#ffffff',
        maxWidth: '860px',
        margin: '0 auto',
        lineHeight: 1.5,
      }}
    >

      {/* ═══ CABEÇALHO DE CAPA ═════════════════════════════════════════ */}
      <div style={{
        background: `linear-gradient(135deg, ${config.colors.primary}18 0%, #f8fafc 60%)`,
        borderBottom: `3px solid ${config.colors.primary}`,
        padding: '40px 48px 32px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Esquerda: Identidade Visual */}
          <div>
            {/* Contego Security + CAP */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: config.colors.primary, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>
                Contego Security
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Serviços de Segurança Gerida · CAP
              </div>
            </div>

            {/* Plataforma */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: config.colors.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: 'white', display: 'flex' }}><config.Logo size={20} /></span>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: config.colors.primary, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {config.name}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', letterSpacing: '0.04em' }}>
                  {config.category}
                </div>
              </div>
            </div>

            <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              Relatório Executivo de Segurança
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569', fontWeight: 500 }}>
              Relatório {periodLabel ?? 'Semanal'} de Postura · {weekLabel}
            </p>
          </div>

          {/* Direita: Estado + CONFIDENCIAL */}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            {/* Risco */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '24px',
              background: ratingBg[report.riskRating],
              border: `1.5px solid ${ratingDot[report.riskRating]}40`,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: ratingDot[report.riskRating] }} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: ratingDot[report.riskRating], letterSpacing: '0.06em' }}>
                RISCO {ratingPT[report.riskRating]}
              </span>
            </div>
            {/* Metadados */}
            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.8 }}>
              <div><strong>Preparado em:</strong> {printDate}</div>
              <div><strong>Período:</strong> {weekLabel}</div>
              <div style={{ marginTop: '4px' }}>
                <span style={{
                  display: 'inline-block', padding: '2px 10px', borderRadius: '4px',
                  background: '#fef2f2', border: '1px solid #fecaca',
                  fontSize: '10px', fontWeight: 800, color: '#dc2626', letterSpacing: '0.08em',
                }}>
                  CONFIDENCIAL
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CORPO ═════════════════════════════════════════════════════ */}
      <div style={{ padding: '36px 48px' }}>

        {/* ── Sumário Executivo ───────────────────────────────────────── */}
        <Section color={config.colors.primary} title="Sumário Executivo">
          <div style={{
            background: '#f8fafc',
            borderLeft: `4px solid ${config.colors.primary}`,
            borderRadius: '0 6px 6px 0',
            padding: '16px 20px',
            marginBottom: '14px',
          }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a', fontStyle: 'italic', lineHeight: 1.7 }}>
              "{report.headline}"
            </p>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.85 }}>
            {displayNarrative}
          </p>
        </Section>

        {/* ── Indicadores Chave de Desempenho ────────────────────────── */}
        <Section color={config.colors.primary} title={`Indicadores Chave de Desempenho — ${periodLabel ?? 'Semanal'} · ${weekLabel}`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {displayMetrics.map((m, i) => {
              const isPositive = m.positive
              const valueColor = isPositive ? '#15803d' : '#c2410c'
              return (
                <div key={i} style={{
                  borderRadius: '8px', padding: '14px 16px',
                  background: isPositive ? '#f0fdf4' : '#fff7ed',
                  border: `1px solid ${isPositive ? '#bbf7d0' : '#fed7aa'}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '4px' }}>
                    {m.value}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: valueColor }}>
                    {m.direction === 'up' ? '▲' : m.direction === 'down' ? '▼' : '—'} {m.delta}
                  </div>
                  <div style={{ fontSize: '10px', color: valueColor, fontWeight: 600, marginTop: '2px' }}>
                    {isPositive ? 'Positivo' : 'Atenção Necessária'}
                  </div>
                </div>
              )
            })}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <Th>Métrica</Th>
                <Th align="center">Valor</Th>
                <Th>Variação</Th>
                <Th>Avaliação</Th>
              </tr>
            </thead>
            <tbody>
              {displayMetrics.map((m, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <Td>{m.label}</Td>
                  <Td align="center" style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{m.value}</Td>
                  <Td>{m.delta}</Td>
                  <Td>
                    <span style={{ color: m.positive ? '#15803d' : '#c2410c', fontWeight: 700 }}>
                      {m.positive ? '▲ Positivo' : '▼ Atenção Necessária'}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* ── Distribuição de Severidade de Ameaças ──────────────────── */}
        {d && (
          <Section color={config.colors.primary} title="Distribuição de Severidade de Ameaças">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
              {d.severityBreakdown.map(({ name, value }) => {
                const c = severityColor[name] ?? '#475569'
                const pct = Math.round((value / totalSev) * 100)
                return (
                  <div key={name} style={{
                    borderRadius: '8px', padding: '14px', textAlign: 'center',
                    background: `${c}10`, border: `1.5px solid ${c}30`,
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{name}</div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: c, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{pct}% do total</div>
                    <div style={{ marginTop: '8px', height: '4px', borderRadius: '2px', background: '#e2e8f0' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: '2px', background: c }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
              Os valores de severidade refletem deteções ativas e recentemente resolvidas obtidas da API CrowdStrike Falcon.
              Ocorrências Críticas e Altas requerem revisão analítica dentro dos prazos SLA definidos.
            </p>
          </Section>
        )}

        {/* ── Resumo de Saúde dos Endpoints ──────────────────────────── */}
        {d && (
          <Section color={config.colors.primary} title="Resumo de Saúde dos Endpoints">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '12px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <Th>Categoria</Th>
                  <Th align="center">Contagem</Th>
                  <Th>Proporção</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Endpoints Windows',      value: d.endpointsByOS.find(o => o.os === 'Windows')?.count ?? 435, total: 453 },
                  { label: 'Endpoints Linux',        value: d.endpointsByOS.find(o => o.os === 'Linux')?.count  ?? 16,  total: 453 },
                  { label: 'Endpoints macOS',        value: d.endpointsByOS.find(o => o.os === 'macOS')?.count  ?? 2,   total: 453 },
                  { label: 'Servidores',             value: typeMap['Server']      ?? 56,  total: 453 },
                  { label: 'Estações de Trabalho',   value: typeMap['Workstation'] ?? 397, total: 453 },
                ].map((row, i) => {
                  const pct = Math.round((row.value / row.total) * 100)
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <Td style={{ fontWeight: 500 }}>{row.label}</Td>
                      <Td align="center" style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{row.value.toLocaleString()}</Td>
                      <Td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#e2e8f0' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: config.colors.primary }} />
                          </div>
                          <span style={{ fontWeight: 600, color: '#475569', fontSize: '11px', whiteSpace: 'nowrap' }}>{pct}%</span>
                        </div>
                      </Td>
                      <Td>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
                          fontSize: '10px', fontWeight: 700, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0',
                        }}>Gerido</span>
                      </Td>
                    </tr>
                  )
                })}
                <tr style={{ background: '#f0fdf4', borderTop: '2px solid #bbf7d0' }}>
                  <Td style={{ fontWeight: 700, color: '#0f172a' }}>Cobertura de Proteção</Td>
                  <Td align="center" style={{ fontWeight: 800, fontSize: '16px', color: '#15803d' }}>
                    {String(d.kpis.protectionCoverage?.value ?? '98,6%')}
                  </Td>
                  <Td colSpan={2} style={{ color: '#15803d', fontWeight: 600 }}>
                    Aplicação de política ativa em toda a frota gerida
                  </Td>
                </tr>
              </tbody>
            </table>
          </Section>
        )}

        {/* ── Registo de Incidentes e Eventos ────────────────────────── */}
        <Section color={config.colors.primary} title={`Registo de Incidentes e Eventos — ${weekLabel}`}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <Th style={{ width: '14%' }}>Referência</Th>
                <Th style={{ width: '7%' }}>Data</Th>
                <Th style={{ width: '13%' }}>Categoria</Th>
                <Th style={{ width: '33%' }}>Descrição</Th>
                <Th style={{ width: '9%' }} align="center">Severidade</Th>
                <Th style={{ width: '10%' }} align="center">Estado</Th>
                <Th style={{ width: '14%' }}>Responsável</Th>
              </tr>
            </thead>
            <tbody>
              {report.incidentRows.map((row, i) => {
                const sc = severityColor[row.severity] ?? '#475569'
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ ...tdBase, fontFamily: 'monospace', fontSize: '10px', color: '#475569' }}>{row.ref}</td>
                    <td style={{ ...tdBase, whiteSpace: 'nowrap', color: '#64748b' }}>{row.date}</td>
                    <td style={{ ...tdBase, color: '#334155', fontWeight: 500 }}>{row.category}</td>
                    <td style={{ ...tdBase, color: '#334155' }}>{row.description}</td>
                    <td style={{ ...tdBase, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
                        fontSize: '10px', fontWeight: 700,
                        color: sc, background: `${sc}15`, border: `1px solid ${sc}30`,
                      }}>{row.severity}</span>
                    </td>
                    <td style={{ ...tdBase, textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '10px' }}>{row.status}</td>
                    <td style={{ ...tdBase, color: '#64748b', fontSize: '10px' }}>{row.owner}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Section>

        {/* ── Recomendações Estratégicas ──────────────────────────────── */}
        <Section color={config.colors.primary} title="Recomendações Estratégicas — Contego Security SOC">
          <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {displayRecommendations.map((rec, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '6px', flexShrink: 0,
                  background: `${config.colors.primary}18`, border: `1px solid ${config.colors.primary}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 800, color: config.colors.primary,
                }}>
                  {i + 1}
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.75, paddingTop: '3px' }}>
                  {rec}
                </p>
              </li>
            ))}
          </ol>
        </Section>

        {/* ── Bloco de Assinaturas ────────────────────────────────────── */}
        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginBottom: '32px' }}>
          <SignatureLine label="Preparado por" name={report.preparedBy} />
          <SignatureLine label="Revisto e Aprovado por" name={report.reviewedBy} />
        </div>

      </div>

      {/* ═══ RODAPÉ ════════════════════════════════════════════════════ */}
      <div style={{
        borderTop: `3px solid ${config.colors.primary}`,
        background: '#f8fafc',
        padding: '16px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '0.05em', fontWeight: 600 }}>
          CONFIDENCIAL · APENAS PARA USO EXECUTIVO · {report.platformLabel}
        </span>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>
          Gerado em {printDate} · Contego Security — Plataforma CAP Dash
        </span>
      </div>

    </div>
  )
})

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function Section({ children, color, title }: { children: React.ReactNode; color: string; title: string }) {
  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ width: 4, height: 18, borderRadius: 2, background: color, flexShrink: 0 }} />
        <h2 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#1e293b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function Th({ children, align, style }: { children?: React.ReactNode; align?: 'center' | 'left'; style?: React.CSSProperties }) {
  return (
    <th style={{
      padding: '9px 12px', textAlign: align ?? 'left', fontSize: '10px', fontWeight: 700,
      color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase',
      borderBottom: '2px solid #e2e8f0',
      ...style,
    }}>
      {children}
    </th>
  )
}

function Td({ children, align, style, colSpan }: { children?: React.ReactNode; align?: 'center' | 'left'; style?: React.CSSProperties; colSpan?: number }) {
  return (
    <td style={{ ...tdBase, textAlign: align ?? 'left', ...style }} colSpan={colSpan}>
      {children}
    </td>
  )
}

function SignatureLine({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      <div style={{ borderBottom: '1px solid #cbd5e1', marginBottom: '8px', height: '40px' }} />
      <p style={{ margin: 0, fontSize: '13px', color: '#475569', fontWeight: 700 }}>{name}</p>
      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>Data: _______________</p>
    </div>
  )
}

const tdBase: React.CSSProperties = {
  padding: '9px 12px', fontSize: '12px', color: '#475569', verticalAlign: 'top',
}
