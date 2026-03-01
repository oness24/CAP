import { useNavigation } from '@/hooks/useNavigation'
import { NavItem } from './NavItem'

interface Props {
  collapsed: boolean
}

export function NavMenu({ collapsed }: Props) {
  const navItems = useNavigation()

  return (
    <nav className="flex flex-col gap-0.5 px-2 py-3">
      {navItems.map((item) => (
        <NavItem key={item.id} item={item} collapsed={collapsed} />
      ))}
    </nav>
  )
}
