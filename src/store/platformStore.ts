import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlatformId } from '@/types'

interface PlatformState {
  activePlatform: PlatformId
  isTransitioning: boolean
  switchPlatform: (id: PlatformId) => void
  setTransitioning: (val: boolean) => void
}

export const usePlatformStore = create<PlatformState>()(
  persist(
    (set) => ({
      activePlatform: 'crowdstrike',
      isTransitioning: false,
      switchPlatform: (id) => set({ activePlatform: id }),
      setTransitioning: (val) => set({ isTransitioning: val }),
    }),
    {
      name: 'cap-dash-platform',
      partialize: (state) => ({ activePlatform: state.activePlatform }),
    }
  )
)
