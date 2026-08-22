import { Outlet, useSearchParams } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { Header } from './Header'

export function AppLayout({ withSearch = false }: { withSearch?: boolean }) {
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''

  const onSearchChange = withSearch
    ? (value: string) => {
        const next = new URLSearchParams(params)
        if (value) next.set('q', value)
        else next.delete('q')
        setParams(next, { replace: true })
      }
    : undefined

  return (
    <div className="flex min-h-screen">
      {/* Sem isto, chegar ao primeiro vídeo por teclado exigia atravessar a
          sidebar inteira mais logo, busca, tema e avatar — em CADA navegação.
          Invisível até receber foco. */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface-100 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-surface-900 focus:shadow-elevated focus:outline-none focus:ring-2 focus:ring-brand-400"
      >
        Pular para o conteúdo
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header search={search} onSearchChange={onSearchChange} />
        {/* tabIndex -1 para o skip link poder mover o foco para cá: sem ele o
            href só rola a página e o foco continua no topo. */}
        <main id="conteudo" tabIndex={-1} className="flex-1 pb-20 focus:outline-none lg:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
