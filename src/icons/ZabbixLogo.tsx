interface Props { size?: number; className?: string }

export function ZabbixLogo({ size = 24, className = '' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#DC2626" opacity="0.15" />
      <path d="M5 8h14L5 16h14" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
