interface ScoreCardProps {
  title: string
  score: number
  maxScore?: number
  trend?: number
  label?: string
}

export function ScoreCard({ title, score, maxScore = 100, trend, label }: ScoreCardProps) {
  const pct = (score / maxScore) * 100
  const r = 36
  const circumference = 2 * Math.PI * r
  const strokeDash = (pct / 100) * circumference

  const scoreColor = score >= 80 ? '#22C55E' : score >= 60 ? '#EAB308' : '#EF4444'

  return (
    <div
      className="group rounded-xl p-5 flex flex-col gap-3 transition-all duration-300 cursor-default"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px var(--accent-primary), 0 0 24px var(--accent-glow)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-primary)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.boxShadow = ''
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'
      }}
    >
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {title}
      </span>
      <div className="flex items-center gap-4">
        <svg width="90" height="90" viewBox="0 0 90 90" className="-rotate-90">
          <circle cx="45" cy="45" r={r} fill="none" stroke="var(--border-default)" strokeWidth="8" />
          <circle
            cx="45" cy="45" r={r}
            fill="none"
            stroke={scoreColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - strokeDash}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
          <text x="45" y="45" textAnchor="middle" dominantBaseline="central" className="rotate-90" fill="var(--text-primary)" fontSize="16" fontWeight="700" style={{ transform: 'rotate(90deg)', transformOrigin: '45px 45px' }}>
            {score}
          </text>
        </svg>
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{score}<span className="text-sm font-normal ml-1" style={{ color: 'var(--text-muted)' }}>/{maxScore}</span></span>
          {label && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>}
          {trend !== undefined && (
            <span className="text-xs font-medium" style={{ color: trend >= 0 ? '#22C55E' : '#EF4444' }}>
              {trend >= 0 ? '+' : ''}{trend} this week
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
