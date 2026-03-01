import { Bell, Settings, ChevronDown, Shield, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function TopBar() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'VC'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header
      className="flex items-center px-5 h-16 flex-shrink-0 z-20"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        boxShadow: '0 1px 0 var(--border-subtle), var(--shadow-soft)',
      }}
    >
      {/* Brand — left */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent-gradient)' }}
        >
          <Shield size={18} className="text-white" />
        </div>
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Visibilidade CAP
            </span>
            <Settings
              size={12}
              style={{ color: 'var(--text-muted)' }}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          </div>
          <span
            className="text-[9px] uppercase tracking-widest mt-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            Security Operations Platform
          </span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Bell */}
        <button
          className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'var(--bg-overlay)'
            el.style.color = 'var(--text-primary)'
            el.style.boxShadow = 'var(--shadow-soft)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = ''
            el.style.color = 'var(--text-muted)'
            el.style.boxShadow = ''
          }}
        >
          <Bell size={17} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
            style={{ background: '#EF4444', borderColor: 'var(--bg-surface)' }}
          />
        </button>

        {/* Divider */}
        <div className="w-px h-6 mx-1" style={{ background: 'var(--border-default)' }} />

        {/* User card */}
        <button
          onClick={handleLogout}
          title="Click to sign out"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all"
          style={{ border: '1px solid var(--border-default)' }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'var(--bg-overlay)'
            el.style.borderColor = 'var(--border-strong)'
            el.style.boxShadow = 'var(--shadow-soft)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = ''
            el.style.borderColor = 'var(--border-default)'
            el.style.boxShadow = ''
          }}
        >
          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{ background: 'var(--accent-gradient)', color: 'white' }}
          >
            {initials}
          </div>
          {/* Name + email */}
          {user && (
            <div className="hidden md:flex flex-col items-start leading-none">
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {user.name}
              </span>
              <span className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {user.email ?? user.role}
              </span>
            </div>
          )}
          <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
        </button>

        {/* Logout shortcut */}
        <button
          onClick={handleLogout}
          title="Sign out"
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'var(--bg-overlay)'
            el.style.color = '#EF4444'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = ''
            el.style.color = 'var(--text-muted)'
          }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}
