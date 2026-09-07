import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { NAV_ITEMS } from '@/lib/nav'
import { cn } from '@/lib/cn'

const itemClass =
  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-surface-600 transition-colors duration-150 focus-ring'
const activeClass = 'text-brand-link'

export function BottomNav() {
  const auth = useAuth()

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-surface-200/80 bg-surface-100/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
    >
      {NAV_ITEMS.filter((item) => item.show?.(auth) ?? true).map(({ to, end, icon: Icon, mobileLabel }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => cn(itemClass, isActive && activeClass)}
        >
          {({ isActive }) => (
            <>
              <Icon size={20} aria-hidden="true" />
              {mobileLabel}
              {isActive && <span className="sr-only">(página atual)</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
