import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Suspense } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { TopBar } from '@/components/topbar/TopBar'
import { useAccentColor } from '@/hooks/useAccentColor'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function PageSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
      ))}
    </div>
  )
}

export function RootLayout() {
  useAccentColor()
  const location = useLocation()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Full-width top bar */}
      <TopBar />
      {/* Sidebar + content below */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
          <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="h-full"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
