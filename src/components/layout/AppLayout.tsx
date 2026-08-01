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
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header search={search} onSearchChange={onSearchChange} />
        <main className="flex-1 pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
