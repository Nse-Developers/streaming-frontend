import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Moon, Sun, LogOut, UserCog } from 'lucide-react'
import { useAuth, type Role } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Avatar } from '@/components/ui/Avatar'
import { Logo } from './Logo'
import { cn } from '@/lib/cn'

const ROLES: Role[] = ['VIEWERS', 'CREATORS', 'ADMIN']
const ROLE_LABEL: Record<Role, string> = { VIEWERS: 'Espectador', CREATORS: 'Criador', ADMIN: 'Admin' }

export function Header({ search, onSearchChange }: { search?: string; onSearchChange?: (value: string) => void }) {
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, logout, setRole } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-surface-200/70 bg-surface-0/85 px-4 backdrop-blur-md sm:px-6">
      <div className="lg:hidden">
        <Logo />
      </div>

      {onSearchChange && (
        <div className="relative mx-auto w-full max-w-xl">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-surface-600" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar vídeos, criadores..."
            className="h-10 w-full rounded-full bg-surface-100 pl-10 pr-4 text-sm text-surface-900 placeholder:text-surface-600 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-400/60"
          />
        </div>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-full text-surface-700 transition-colors hover:bg-surface-200 focus-ring"
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {isAuthenticated && user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-full focus-ring"
              aria-label="Menu do usuário"
            >
              <Avatar name={user.name} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-12 z-20 w-60 overflow-hidden rounded-xl border border-surface-200 bg-surface-100 shadow-elevated">
                  <div className="p-3">
                    <p className="text-sm font-semibold text-surface-900">{user.name}</p>
                    <p className="truncate text-xs text-surface-600">{user.email}</p>
                  </div>

                  <div className="border-t border-surface-200 p-2">
                    <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-surface-500">
                      <UserCog size={12} />
                      Papel (protótipo)
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {ROLES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={cn(
                            'rounded-md py-1.5 text-[11px] font-medium transition-colors',
                            user.role === r
                              ? 'bg-brand-500 text-white'
                              : 'bg-surface-200 text-surface-700 hover:bg-surface-300',
                          )}
                        >
                          {ROLE_LABEL[r]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-surface-200 p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        logout()
                        navigate('/login')
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-danger-400 transition-colors hover:bg-danger-500/10"
                    >
                      <LogOut size={16} />
                      Sair
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400 focus-ring"
          >
            Entrar
          </button>
        )}
      </div>
    </header>
  )
}
