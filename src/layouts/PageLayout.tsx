interface PageLayoutProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export function PageLayout({ title, subtitle, actions, children }: PageLayoutProps) {
  return (
    <div className="flex flex-col gap-6 p-6 min-h-full">
      <div className="flex items-start justify-between pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="relative">
          <h1 className="text-[1.35rem] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h1>
          <div
            className="mt-2 h-[2px] w-16 rounded-full"
            style={{ background: 'var(--accent-gradient)' }}
          />
          {subtitle && <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
