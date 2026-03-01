interface Props { size?: number; className?: string }

export function CrowdStrikeLogo({ size = 24, className = '' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#1D6AE5" opacity="0.15" />
      <path d="M6 9l3-3 3 3-3 3-3-3z" fill="#1D6AE5" />
      <path d="M12 9l3-3 3 3-3 3-3-3z" fill="#2A7FFF" />
      <path d="M9 12l3 3 3-3-3-3-3 3z" fill="#1D6AE5" opacity="0.7" />
      <path d="M9 15l3 3 3-3" stroke="#2A7FFF" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}
