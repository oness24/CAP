interface Props { size?: number; className?: string }

export function SafeticaLogo({ size = 24, className = '' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#0D9488" opacity="0.15" />
      <path d="M12 3C8 7 4 7 4 12s2 7 8 9c6-2 8-4 8-9s-4-5-8-9z" stroke="#0D9488" strokeWidth="1.5" fill="none" />
      <path d="M9 12l2 2 4-4" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
