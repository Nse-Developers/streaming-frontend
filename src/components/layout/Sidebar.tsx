import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { NAV_ITEMS } from '@/lib/nav'
import { cn } from '@/lib/cn'

/** Rail estreito (72px) em vez de uma coluna de 240px: com 2–4 destinos, uma
 *  sidebar larga era quase toda vazia e roubava largura do grid de vídeos —
 *  que é o conteúdo real da tela. O logo vive no Header, não aqui. */
const baseLink =
  'flex flex-col items-center gap-1 rounded-lg px-1 py-3 text-[10px] font-medium text-surface-600 transition-colors duration-150 hover:bg-surface-200/70 hover:text-surface-900 focus-ring'
const activeLink = 'text-surface-900'

export function Sidebar() {
  const auth = useAuth()
  const items = NAV_ITEMS.filter((item) => item.show?.(auth) ?? true)

  return (
    <nav
      aria-label="Navegação principal"
      // A rolagem da página levava o rail junto: descer o feed deixava a
      // navegação para trás e voltar a ela exigia rolar tudo de volta. Preso
      // no topo, ele acompanha a página como o Header (`sticky top-0`) já faz.
      //
      // `self-start` não é enfeite: como flex item, o rail esticava até a
      // altura TOTAL da página (o `align-items: stretch` do pai). Um elemento
      // sticky do tamanho do próprio bloco contêiner não tem para onde
      // deslizar, e a regra não faz nada — silenciosamente. Encolhendo para
      // `h-dvh`, sobra o resto da página para ele grudar.
      //
      // Tudo em `lg:` porque abaixo disso o rail nem existe: quem navega é a
      // BottomNav, que já é `fixed`.
      className="hidden w-[72px] shrink-0 flex-col gap-1 px-1.5 pt-2 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start lg:overflow-y-auto lg:overscroll-contain"
    >
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
              <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
              <span className="leading-tight">{mobileLabel}</span>
              {isActive && <span className="sr-only">(página atual)</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
