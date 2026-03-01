interface Props { size?: number; className?: string }

export function WazuhLogo({ size = 24, className = '' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#7C3AED" opacity="0.15" />
      <path d="M12 4L5 8v8l7 4 7-4V8L12 4z" stroke="#7C3AED" strokeWidth="1.5" fill="none" />
      <path d="M12 4v16M5 8l7 4 7-4" stroke="#9D5CFF" strokeWidth="1" opacity="0.6" />
    </svg>
  )
}
