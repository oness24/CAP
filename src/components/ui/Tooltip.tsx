import { useState, useRef } from 'react'

interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: 'right' | 'top' | 'bottom'
}

export function Tooltip({ content, children, side = 'right' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const posClass = side === 'right'
    ? 'left-full ml-3 top-1/2 -translate-y-1/2'
    : side === 'top'
    ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
    : 'top-full mt-2 left-1/2 -translate-x-1/2'

  return (
    <div
      ref={ref}
      className="relative flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={`absolute z-50 px-2.5 py-1.5 text-xs font-medium text-white rounded-md whitespace-nowrap pointer-events-none ${posClass}`}
          style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-strong)' }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
