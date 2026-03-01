interface Props { size?: number; className?: string }

export function KeeperLogo({ size = 24, className = '' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#16A34A" opacity="0.15" />
      <rect x="7" y="11" width="10" height="8" rx="2" stroke="#16A34A" strokeWidth="1.5" fill="none" />
      <path d="M9 11V8a3 3 0 016 0v3" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.5" fill="#16A34A" />
    </svg>
  )
}
