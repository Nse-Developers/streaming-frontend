import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trash2, Plus, Users as UsersIcon, Tag, Film, Eye } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useCategories'
import { useAllVideos } from '@/hooks/useVideos'
import { useToast } from '@/context/ToastContext'
import { mockApi } from '@/mocks/api'
import { formatCompact } from '@/lib/format'

export function AdminPage() {
  const { data: users, isLoading: loadingUsers } = useQuery({ queryKey: ['users'], queryFn: () => mockApi.listUsers() })
  const { data: videos } = useAllVideos()
  const { data: categories, isLoading: loadingCategories } = useCategories()
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()
  const { showToast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [newCategory, setNewCategory] = useState('')

  const totalViews = (videos ?? []).reduce((sum, v) => sum + v.views, 0)

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6">
      <h1 className="font-display text-2xl font-extrabold text-surface-900">Administração</h1>
      <p className="mt-1 text-sm text-surface-600">Visão geral da plataforma e gestão de conteúdo.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Usuários" value={String(users?.length ?? 0)} icon={UsersIcon} />
        <Metric label="Vídeos" value={String(videos?.length ?? 0)} icon={Film} />
        <Metric label="Visualizações" value={formatCompact(totalViews)} icon={Eye} />
        <Metric label="Categorias" value={String(categories?.length ?? 0)} icon={Tag} />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-lg font-bold text-surface-900">Usuários</h2>
        <div className="overflow-hidden rounded-xl bg-surface-100">
          {loadingUsers &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="m-3 h-12 rounded-lg" />)}

          {!loadingUsers &&
            users?.map((u, i) => (
              <div
                key={u.id}
                className={`flex items-center gap-3 p-3 ${i > 0 ? 'border-t border-surface-200/70' : ''}`}
              >
                <Avatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-surface-900">{u.name}</p>
                  <p className="truncate text-xs text-surface-600">
                    {u.handle} · {formatCompact(u.followers)} seguidores
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger-400 hover:bg-danger-500/10"
                  aria-label={`Remover ${u.name}`}
                  onClick={() => showToast(`${u.name} removido (protótipo).`, 'success')}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-surface-900">Categorias</h2>
          <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            Nova categoria
          </Button>
        </div>

        {loadingCategories && (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-lg" />
            ))}
          </div>
        )}

        {!loadingCategories && categories?.length === 0 && (
          <EmptyState icon={Tag} title="Nenhuma categoria" description="Crie a primeira para organizar o catálogo." />
        )}

        <div className="flex flex-wrap gap-2">
          {categories?.map((category) => (
            <span
              key={category.name}
              className="group flex items-center gap-2 rounded-lg bg-surface-100 py-2 pl-3.5 pr-2 text-sm text-surface-800"
            >
              {category.name}
              <span className="text-xs text-surface-500">{category.count}</span>
              <button
                type="button"
                onClick={() => {
                  deleteCategory.mutate(category.name)
                  showToast(`Categoria "${category.name}" removida.`, 'success')
                }}
                className="rounded p-1 text-surface-500 transition-colors hover:bg-danger-500/10 hover:text-danger-400"
                aria-label={`Remover ${category.name}`}
              >
                <Trash2 size={13} />
              </button>
            </span>
          ))}
        </div>
      </section>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nova categoria">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!newCategory.trim()) return
            createCategory.mutate(newCategory.trim())
            showToast(`Categoria "${newCategory.trim()}" criada.`, 'success')
            setNewCategory('')
            setModalOpen(false)
          }}
          className="space-y-4"
        >
          <Input
            label="Nome da categoria"
            placeholder="Ex.: Esportes"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Criar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof UsersIcon }) {
  return (
    <div className="rounded-xl bg-surface-100 p-4">
      <Icon size={16} className="mb-2 text-surface-600" />
      <p className="font-display text-2xl font-bold text-surface-900">{value}</p>
      <p className="text-xs text-surface-600">{label}</p>
    </div>
  )
}
