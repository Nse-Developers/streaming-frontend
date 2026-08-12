import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { NAV_ITEMS } from '@/lib/nav'
import { cn } from '@/lib/cn'

/** Rail estreito (72px) em vez de uma coluna de 240px: com 2–4 destinos, uma
 *  sidebar larga era quase toda vazia e roubava largura do grid de vídeos —
 *  que é o conteúdo real da tela. O logo vive no Header, não aqui. */
const baseLink =
  'flex flex-col items-center gap-1 rounded-lg px-1 py-3 text-[10px] font-medium text-surface-600 transition-colors duration-150 hover:bg-surface-200/70 hover:text-surface-900'
const activeLink = 'text-surface-900'

export function Sidebar() {
  const auth = useAuth()
  const items = NAV_ITEMS.filter((item) => item.show?.(auth) ?? true)

  return (
    <aside className="hidden w-[72px] shrink-0 flex-col gap-1 px-1.5 pt-2 lg:flex">
      {items.map(({ to, end, icon: Icon, label, mobileLabel }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => cn(baseLink, isActive && activeLink)}
          title={label}
        >
          {({ isActive }) => (
            <>
              <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8} />
              <span className="leading-tight">{mobileLabel}</span>
            </>
          )}
        </NavLink>
      ))}
    </aside>
  )
}
