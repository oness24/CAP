import { usePlatform } from './usePlatform'

export function useNavigation() {
  const { config } = usePlatform()
  return config.nav
}
