import { usePlatformStore } from '@/store/platformStore'
import { PLATFORM_REGISTRY } from '@/constants/platforms'

export function usePlatform() {
  const { activePlatform, switchPlatform, isTransitioning } = usePlatformStore()
  const config = PLATFORM_REGISTRY[activePlatform]
  return { activePlatform, config, switchPlatform, isTransitioning }
}
