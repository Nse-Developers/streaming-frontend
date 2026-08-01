import { NavLink } from 'react-router-dom'
import { Logo } from './Logo'
import { useAuth } from '@/context/AuthContext'
import { NAV_ITEMS } from '@/lib/nav'
import { cn } from '@/lib/cn'

const baseLink =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 transition-colors duration-150 hover:bg-surface-200/70 hover:text-surface-900'
const activeLink = 'bg-brand-500/12 text-brand-400 hover:bg-brand-500/16 hover:text-brand-400'

export function Sidebar() {
  const auth = useAuth()

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-surface-200/80 px-3 py-5 lg:flex">
      <div className="mb-6 px-2">
        <Logo />
      </div>
      {NAV_ITEMS.filter((item) => item.show?.(auth) ?? true).map(({ to, end, icon: Icon, label }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => cn(baseLink, isActive && activeLink)}>
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </aside>
  )
}
