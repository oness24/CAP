import { useState, useRef, useCallback } from 'react'
import { Printer, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, X, Download, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReactToPrint } from 'react-to-print'
import { usePlatform } from '@/hooks/usePlatform'
import { getWeeklyReport, getWeekRange, getRatingStyle, type WeeklyMetric, type RiskRating } from '@/data/executive/weeklyReports'
import { PrintReport } from './PrintReport'

// ── Metric chip ───────────────────────────────────────────────────────────────

function MetricChip({ metric, accentColor }: { metric: WeeklyMetric; accentColor: string }) {
  const Icon =
    metric.direction === 'up' ? TrendingUp :
    metric.direction === 'down' ? TrendingDown : Minus

  const valueColor = metric.positive
    ? (metric.direction === 'flat' ? accentColor : '#4ADE80')
    : '#F97316'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '4px',
      padding: '10px 14px', borderRadius: '10px', minWidth: '120px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      flex: '1 1 auto',
    }}>
      <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {metric.label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1 }}>
          {metric.value}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Icon size={11} style={{ color: valueColor, flexShrink: 0 }} />
        <span style={{ fontSize: '10px', color: valueColor, fontWeight: 500 }}>{metric.delta}</span>
      </div>
    </div>
  )
}

// ── Risk badge ─────────────────────────────────────────────────────────────────

function RiskBadge({ rating }: { rating: RiskRating }) {
  const style = getRatingStyle(rating)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 10px', borderRadius: '20px',
      background: style.bg, border: `1px solid ${style.border}`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: style.text, display: 'inline-block', boxShadow: `0 0 6px ${style.text}` }} />
      <span style={{ fontSize: '11px', fontWeight: 700, color: style.text, letterSpacing: '0.06em' }}>
        {rating.toUpperCase()}
      </span>
    </span>
  )
}

// ── Print Modal ───────────────────────────────────────────────────────────────

function PrintModal({
  isOpen, onClose, report, weekLabel, platformId, printRef, onPrint,
}: {
  isOpen: boolean
  onClose: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report: any
  weekLabel: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  platformId: any
  printRef: React.RefObject<HTMLDivElement>
  onPrint: () => void
}) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 999,
              background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            }}
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              position: 'fixed', inset: '32px', zIndex: 1000, display: 'flex',
              flexDirection: 'column', borderRadius: '16px', overflow: 'hidden',
              background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
              boxShadow: '0 40px 120px rgba(0,0,0,0.7)',
            }}
          >
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-overlay)', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Printer size={16} color="white" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Executive Weekly Report
                  </h2>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                    Print Preview · {weekLabel}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={onPrint}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
                    background: 'var(--accent-gradient)', border: 'none', color: 'white',
                    fontSize: '13px', fontWeight: 600, letterSpacing: '0.01em',
                    boxShadow: '0 0 20px var(--accent-glow)',
                  }}
                >
                  <Download size={14} />
                  Print / Export PDF
                </button>
                <button
                  onClick={onClose}
                  style={{
                    width: 32, height: 32, borderRadius: '8px', cursor: 'pointer', border: 'none',
                    background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Print preview area */}
            <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px', background: '#e2e8f0' }}>
              <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                <PrintReport
                  ref={printRef}
                  report={report}
                  weekLabel={weekLabel}
                  platformId={platformId}
                  dashboardData={undefined}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ExecutiveSummary() {
  const { activePlatform, config } = usePlatform()
  const [weeksBack, setWeeksBack] = useState(0)
  const [printOpen, setPrintOpen] = useState(false)
  const printRef = useRef<HTMLDivElement>(null!)

  const report = getWeeklyReport(activePlatform)
  const week = getWeekRange(weeksBack)
  const color = config.colors.primary

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Executive Security Report — ${config.name} — ${week.label}`,
    pageStyle: `
      @page { size: A4; margin: 0; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #executive-print-report { padding: 32px 40px !important; }
      }
    `,
  })

  const openPrint = useCallback(() => setPrintOpen(true), [])
  const closePrint = useCallback(() => setPrintOpen(false), [])

  return (
    <>
      <motion.div
        key={activePlatform}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          borderRadius: '14px', overflow: 'hidden', position: 'relative',
          background: `linear-gradient(135deg, ${color}0F 0%, var(--bg-elevated) 45%, var(--bg-elevated) 100%)`,
          border: `1px solid ${color}2E`,
          boxShadow: `0 0 48px rgba(0,0,0,0.3), 0 0 0 1px var(--border-subtle), inset 0 1px 0 ${color}18`,
        }}
      >
        {/* Decorative top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: `linear-gradient(90deg, transparent 0%, ${color}CC 30%, ${color} 50%, ${color}CC 70%, transparent 100%)`,
        }} />

        {/* Subtle grid texture */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.025,
          backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }} />

        <div style={{ position: 'relative', padding: '20px 24px 22px' }}>
          {/* ── Top row: label + week nav + risk + print ─── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            {/* Left: label block */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                background: `${color}22`, border: `1px solid ${color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Shield size={17} style={{ color: color }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Executive Summary
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', letterSpacing: '0.05em' }}>
                    WEEKLY REVIEW
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                  {config.name} · {config.category}
                </p>
              </div>
            </div>

            {/* Right: week nav + risk + print button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Week selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '2px' }}>
                <button
                  onClick={() => setWeeksBack((w) => w + 1)}
                  disabled={weeksBack >= 4}
                  style={{ width: 26, height: 26, borderRadius: '6px', border: 'none', background: 'transparent', cursor: weeksBack < 4 ? 'pointer' : 'not-allowed', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: weeksBack >= 4 ? 0.3 : 1 }}
                >
                  <ChevronLeft size={13} />
                </button>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '0 8px', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  {weeksBack === 0 ? 'This Week' : `${weeksBack}w ago`} · {week.label}
                </span>
                <button
                  onClick={() => setWeeksBack((w) => Math.max(0, w - 1))}
                  disabled={weeksBack === 0}
                  style={{ width: 26, height: 26, borderRadius: '6px', border: 'none', background: 'transparent', cursor: weeksBack > 0 ? 'pointer' : 'not-allowed', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: weeksBack === 0 ? 0.3 : 1 }}
                >
                  <ChevronRight size={13} />
                </button>
              </div>

              <RiskBadge rating={report.riskRating} />

              {/* Print button */}
              <button
                onClick={openPrint}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '7px 14px', borderRadius: '8px', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${color}44`,
                  color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600,
                  transition: 'all 0.15s ease',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = `${color}22`
                  el.style.borderColor = color
                  el.style.boxShadow = `0 0 16px ${color}44`
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = 'rgba(255,255,255,0.06)'
                  el.style.borderColor = `${color}44`
                  el.style.boxShadow = ''
                }}
              >
                <Printer size={14} style={{ color: color }} />
                Print Weekly Report
              </button>
            </div>
          </div>

          {/* ── Divider ─────────────────────────────────── */}
          <div style={{ height: '1px', background: `linear-gradient(90deg, ${color}44, transparent)`, marginBottom: '16px' }} />

          {/* ── Headline ────────────────────────────────── */}
          <p style={{
            margin: '0 0 14px', fontSize: '13px', fontWeight: 600, lineHeight: 1.6,
            color: 'var(--text-primary)', letterSpacing: '-0.005em',
          }}>
            {report.headline}
          </p>

          {/* ── Narrative prose ─────────────────────────── */}
          <p style={{
            margin: '0 0 20px', fontSize: '13px', lineHeight: 1.8,
            color: 'var(--text-secondary)',
            maxWidth: '820px',
          }}>
            {report.narrative}
          </p>

          {/* ── Metric chips ────────────────────────────── */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {report.metrics.map((m: WeeklyMetric, i: number) => (
              <MetricChip key={i} metric={m} accentColor={color} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Print modal */}
      <PrintModal
        isOpen={printOpen}
        onClose={closePrint}
        report={report}
        weekLabel={week.label}
        platformId={activePlatform}
        printRef={printRef}
        onPrint={handlePrint}
      />
    </>
  )
}
