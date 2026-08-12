import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Moon, Sun, LogOut, User, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Avatar } from '@/components/ui/Avatar'
import { Logo } from './Logo'

const ACCOUNT_LABEL = { CREATORS: 'Criador', VIEWERS: 'Espectador' } as const

export function Header({
  search,
  onSearchChange,
}: {
  search?: string
  onSearchChange?: (value: string) => void
}) {
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Fecha o menu com Escape — mesmo contrato de teclado do Modal.
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
    // logout() já limpa o estado local mesmo se a chamada ao servidor falhar
    // (ver AuthContext) — navega de qualquer forma, o usuário precisa sair da
    // tela logada independentemente de o cookie ter sido revogado a tempo.
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-surface-200/70 bg-surface-0/85 px-4 backdrop-blur-md sm:gap-3 sm:px-6">
      {/* No mobile, a busca aberta ocupa a barra inteira (padrão YouTube). */}
      {mobileSearchOpen && onSearchChange ? (
        <div className="flex w-full items-center gap-2 sm:hidden">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-600"
            />
            <input
              autoFocus
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar vídeos e criadores"
              className="h-10 w-full rounded-full bg-surface-100 pl-10 pr-4 text-sm text-surface-900 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-400/60"
            />
          </div>
          <button
            type="button"
            onClick={() => setMobileSearchOpen(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-surface-700 hover:bg-surface-200 focus-ring"
            aria-label="Fechar busca"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <>
          {/* Sempre visível: o rail lateral só tem ícones, então a marca vive
              aqui em todos os tamanhos de tela. */}
          <Link to="/" className="shrink-0 rounded-md focus-ring" aria-label="Byou — início">
            <Logo />
          </Link>

          {onSearchChange && (
            <div className="relative mx-auto hidden w-full max-w-xl sm:block">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-surface-600"
              />
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buscar vídeos e criadores"
                aria-label="Buscar"
                className="h-10 w-full rounded-full border border-transparent bg-surface-100 pl-10 pr-4 text-sm text-surface-900 placeholder:text-surface-600 transition-colors focus:border-brand-400/40 focus:outline-none focus:ring-2 focus:ring-brand-400/60"
              />
            </div>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {onSearchChange && (
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-surface-700 transition-colors hover:bg-surface-200 focus-ring sm:hidden"
                aria-label="Buscar"
              >
                <Search size={18} />
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-full text-surface-700 transition-colors hover:bg-surface-200 focus-ring"
              aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {isAuthenticated && user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="rounded-full focus-ring"
                  aria-label="Menu da conta"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <Avatar name={user.name} />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <div
                      role="menu"
                      className="absolute right-0 top-12 z-20 w-64 overflow-hidden rounded-xl border border-surface-200 bg-surface-100 shadow-elevated"
                    >
                      <div className="flex items-center gap-3 p-3">
                        <Avatar name={user.name} className="h-10 w-10 text-sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-surface-900">
                            {user.name}
                          </p>
                          <p className="truncate text-xs text-surface-600">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 border-t border-surface-200 px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-1 text-[11px] font-semibold text-brand-link">
                          {ACCOUNT_LABEL[user.userTypeAccount]}
                        </span>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-500/15 px-2 py-1 text-[11px] font-semibold text-success-400">
                            <ShieldCheck size={11} />
                            Admin
                          </span>
                        )}
                      </div>

                      <div className="border-t border-surface-200 p-2">
                        <Link
                          to="/profile"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-200 hover:text-surface-900"
                        >
                          <User size={16} />
                          Meu perfil
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
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
              <Link
                to="/login"
                className="ml-1 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400 focus-ring"
              >
                Entrar
              </Link>
            )}
          </div>
        </>
      )}
    </header>
  )
}
