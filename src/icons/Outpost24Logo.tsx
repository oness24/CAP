interface Props { size?: number; className?: string }

export function Outpost24Logo({ size = 24, className = '' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#EA580C" opacity="0.15" />
      <circle cx="12" cy="12" r="5" stroke="#EA580C" strokeWidth="1.5" fill="none" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="#EA580C" />
    </svg>
  )
}
