import { useEffect } from 'react'
import { usePlatformStore } from '@/store/platformStore'
import { PLATFORM_REGISTRY } from '@/constants/platforms'

export function useAccentColor() {
  const activePlatform = usePlatformStore((s) => s.activePlatform)

  useEffect(() => {
    const config = PLATFORM_REGISTRY[activePlatform]
    const root = document.documentElement
    root.style.setProperty('--accent-primary', config.colors.primary)
    root.style.setProperty('--accent-secondary', config.colors.secondary)
    root.style.setProperty('--accent-glow', config.colors.glow)
    root.style.setProperty('--accent-gradient', config.colors.gradient)
  }, [activePlatform])
}
