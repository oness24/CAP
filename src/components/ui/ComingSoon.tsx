import { Construction } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'

interface Props {
  title: string
  subtitle?: string
}

export function ComingSoon({ title, subtitle }: Props) {
  return (
    <PageLayout title={title} subtitle={subtitle}>
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
          <Construction size={28} style={{ color: 'var(--accent-primary)' }} />
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Page Under Construction</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            This view will display real data once connected to the platform API.
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
