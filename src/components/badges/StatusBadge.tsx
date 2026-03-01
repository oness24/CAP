import { clsx } from 'clsx'

const styles: Record<string, string> = {
  Investigating: 'bg-orange-500/15 text-orange-400',
  Resolved: 'bg-green-500/15 text-green-400',
  'Under Investigation': 'bg-orange-500/15 text-orange-400',
  Open: 'bg-red-500/15 text-red-400',
  Closed: 'bg-green-500/15 text-green-400',
  Blocked: 'bg-red-500/15 text-red-400',
  'Allowed (Logged)': 'bg-blue-500/15 text-blue-400',
  Warned: 'bg-yellow-500/15 text-yellow-400',
  Enabled: 'bg-green-500/15 text-green-400',
  Disabled: 'bg-red-500/15 text-red-400',
  Enforced: 'bg-blue-500/15 text-blue-400',
  Online: 'bg-green-500/15 text-green-400',
  Offline: 'bg-red-500/15 text-red-400',
}

interface Props {
  status: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'sm' }: Props) {
  const cls = styles[status] ?? 'bg-gray-500/15 text-gray-400'
  return (
    <span className={clsx('inline-flex items-center rounded-full font-medium border border-white/10', cls, size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm')}>
      {status}
    </span>
  )
}
