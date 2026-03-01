import { clsx } from 'clsx'

const styles: Record<string, string> = {
  Critical: 'bg-red-500/15 text-red-400 border border-red-500/30',
  Disaster: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  High: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  Average: 'bg-orange-400/15 text-orange-300 border border-orange-400/30',
  Medium: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  Warning: 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/30',
  Low: 'bg-green-500/15 text-green-400 border border-green-500/30',
  Information: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  Info: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
}

interface Props {
  severity: string
  size?: 'sm' | 'md'
}

export function SeverityBadge({ severity, size = 'sm' }: Props) {
  const cls = styles[severity] ?? 'bg-gray-500/15 text-gray-400 border border-gray-500/30'
  return (
    <span className={clsx('inline-flex items-center rounded-full font-medium', cls, size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm')}>
      {severity}
    </span>
  )
}
