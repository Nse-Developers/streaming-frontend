import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Trash2,
  Plus,
  Users as UsersIcon,
  Tag,
  Film,
  Eye,
  ServerCrash,
  RotateCw,
  Pencil,
  ShieldCheck,
  ChevronDown,
  Lock,
  ImageOff,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/useCategories'
import { useUsers, useDeleteUser } from '@/hooks/useUsers'
import { useVideos, useDeleteVideo, useUpdateVideoStatus } from '@/hooks/useVideos'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { toErrorMessage } from '@/api/client'
import { categorySchema, type CategoryValues } from '@/lib/validation'
import { formatCompact } from '@/lib/format'
import { STATUS_LABEL, type UiVideo } from '@/lib/video'
import type { CategoryResponse, VideoStatus } from '@/api/types'

export function AdminPage() {
  const users = useUsers()
  const videos = useVideos()
  const categories = useCategories()

  const totalViews = (videos.data ?? []).reduce((sum, video) => sum + (video.views ?? 0), 0)

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <header>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-500/12 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-success-500">
          <ShieldCheck size={12} />
          Administração
        </span>
        <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-surface-900 sm:text-3xl">
          Painel do administrador
        </h1>
        <p className="mt-1.5 text-[15px] text-surface-600">
          Visão geral da plataforma, usuários e categorias.
        </p>
      </header>

      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Usuários" value={users.data?.length} icon={UsersIcon} loading={users.isLoading} />
        <Metric label="Vídeos" value={videos.data?.length} icon={Film} loading={videos.isLoading} />
        <Metric
          label="Visualizações"
          value={videos.data ? formatCompact(totalViews) : undefined}
          icon={Eye}
          loading={videos.isLoading}
        />
        <Metric
          label="Categorias"
          value={categories.data?.length}
          icon={Tag}
          loading={categories.isLoading}
        />
      </div>

      <UsersSection />
      <VideosSection />
      <CategoriesSection />
    </div>
  )
}

function Metric({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string
  value?: number | string
  icon: typeof Eye
  loading?: boolean
}) {
  return (
    <div className="rounded-xl border border-surface-200 bg-surface-100 p-4">
      <div className="flex items-center gap-2 text-surface-600">
        <Icon size={15} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="mt-1.5 font-display text-2xl font-extrabold tabular-nums text-surface-900">
          {value ?? '—'}
        </p>
      )}
    </div>
  )
}

/** A API devolve todos os usuários de uma vez (não há paginação no backend),
 *  então a lista é cortada no cliente para a tela não virar um paredão. */
const FIRST_PAGE = 10
const PAGE_STEP = 20

function UsersSection() {
  const { user: currentUser } = useAuth()
  const { data, isLoading, isError, error, refetch, isFetching } = useUsers()
  const deleteUser = useDeleteUser()
  const { showToast } = useToast()
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [visible, setVisible] = useState(FIRST_PAGE)

  const total = data?.length ?? 0
  const shown = data?.slice(0, visible) ?? []
  const remaining = total - shown.length

  const confirmDelete = async () => {
    if (!pendingEmail) return
    try {
      await deleteUser.mutateAsync(pendingEmail)
      showToast('Usuário removido.', 'success')
    } catch (err) {
      showToast(toErrorMessage(err), 'error')
    } finally {
      setPendingEmail(null)
    }
  }

  return (
    <section className="mt-11">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-surface-900">Usuários</h2>
        {!isLoading && !isError && total > 0 && (
          <p className="text-xs tabular-nums text-surface-600">
            {shown.length} de {total}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          icon={ServerCrash}
          title="Não foi possível carregar os usuários"
          description={toErrorMessage(error)}
          action={
            <Button variant="secondary" onClick={() => refetch()} isLoading={isFetching}>
              <RotateCw size={16} />
              Tentar de novo
            </Button>
          }
        />
      )}

      {!isLoading && !isError && total > 0 && (
        <ul className="divide-y divide-surface-200 overflow-hidden rounded-xl border border-surface-200 bg-surface-100">
          {shown.map((item) => {
            const isSelf = item.email === currentUser?.email
            return (
              <li key={item.id} className="flex items-center gap-3 p-3 sm:p-4">
                <Avatar name={`${item.name} ${item.surname}`} className="h-10 w-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-surface-900">
                    {item.name} {item.surname}
                    {isSelf && (
                      <span className="ml-2 rounded bg-surface-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-surface-600">
                        você
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-surface-600">{item.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remover ${item.email}`}
                  // Bloqueia a auto-exclusão: o admin perderia o próprio acesso.
                  disabled={isSelf}
                  onClick={() => setPendingEmail(item.email)}
                  className="text-danger-400 hover:bg-danger-500/10 hover:text-danger-400"
                >
                  <Trash2 size={16} />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {remaining > 0 && (
        <div className="mt-3 flex justify-center">
          <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_STEP)}>
            Ver mais {Math.min(remaining, PAGE_STEP)}
            <ChevronDown size={16} />
          </Button>
        </div>
      )}

      {!isLoading && !isError && total === 0 && (
        <EmptyState icon={UsersIcon} title="Nenhum usuário cadastrado" />
      )}

      <Modal
        isOpen={pendingEmail !== null}
        onClose={() => setPendingEmail(null)}
        title="Remover usuário"
      >
        <p className="text-sm text-surface-700">
          Remover <strong className="text-surface-900">{pendingEmail}</strong>? Esta ação não pode
          ser desfeita.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPendingEmail(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete} isLoading={deleteUser.isPending}>
            <Trash2 size={16} />
            Remover
          </Button>
        </div>
      </Modal>
    </section>
  )
}

/** Moderação do catálogo inteiro.
 *
 *  Só o ADMIN chega aqui (a rota é protegida), e no backend ADMIN pode apagar
 *  ou trocar o status de qualquer vídeo — por isso esta seção não filtra por
 *  dono. É o complemento da aba "Meus vídeos" do perfil, que age só sobre os
 *  próprios: um CREATOR não tem acesso a esta tela, e um VIEWER não vê botão
 *  de excluir em lugar nenhum. */
function VideosSection() {
  const { data, isLoading, isError, error, refetch, isFetching } = useVideos()
  const [visible, setVisible] = useState(FIRST_PAGE)

  const total = data?.length ?? 0
  const shown = data?.slice(0, visible) ?? []
  const remaining = total - shown.length

  return (
    <section className="mt-11">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-surface-900">Vídeos</h2>
        {!isLoading && !isError && total > 0 && (
          <p className="text-xs tabular-nums text-surface-600">
            {shown.length} de {total}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          icon={ServerCrash}
          title="Não foi possível carregar os vídeos"
          description={toErrorMessage(error)}
          action={
            <Button variant="secondary" onClick={() => refetch()} isLoading={isFetching}>
              <RotateCw size={16} />
              Tentar de novo
            </Button>
          }
        />
      )}

      {!isLoading && !isError && total > 0 && (
        <ul className="divide-y divide-surface-200 overflow-hidden rounded-xl border border-surface-200 bg-surface-100">
          {shown.map((video) => (
            <VideoRow key={video.key} video={video} />
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <div className="mt-3 flex justify-center">
          <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_STEP)}>
            Ver mais {Math.min(remaining, PAGE_STEP)}
            <ChevronDown size={16} />
          </Button>
        </div>
      )}

      {!isLoading && !isError && total === 0 && (
        <EmptyState icon={Film} title="Nenhum vídeo publicado" />
      )}
    </section>
  )
}

function VideoRow({ video }: { video: UiVideo }) {
  const { showToast } = useToast()
  const updateStatus = useUpdateVideoStatus()
  const deleteVideo = useDeleteVideo()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const id = video.id

  const setStatus = async (status: VideoStatus) => {
    if (id == null) return
    try {
      await updateStatus.mutateAsync({ id, status })
      showToast(status === 'PUBLISHED' ? 'Vídeo publicado.' : 'Vídeo tornado privado.', 'success')
    } catch (err) {
      showToast(toErrorMessage(err), 'error')
    }
  }

  const remove = async () => {
    if (id == null) return
    try {
      await deleteVideo.mutateAsync(id)
      showToast('Vídeo excluído.', 'success')
    } catch (err) {
      showToast(toErrorMessage(err), 'error')
    } finally {
      setConfirmOpen(false)
    }
  }

  return (
    <li className="flex items-center gap-3 p-3 sm:p-4">
      {video.safeThumbnail ? (
        <img
          src={video.safeThumbnail}
          alt=""
          loading="lazy"
          className="h-12 w-20 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-surface-200 text-surface-600">
          <ImageOff size={16} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-surface-900">{video.tittle}</p>
        <p className="truncate text-xs text-surface-600">
          {video.creatorName} · {STATUS_LABEL[video.status] ?? video.status} ·{' '}
          {formatCompact(video.views ?? 0)} views
        </p>
      </div>

      {/* Sem id não há como chamar as rotas por id — mostrar botões que só
          poderiam falhar seria pior que escondê-los (ver readId em lib/video). */}
      {id != null && (
        <div className="flex shrink-0 items-center gap-0.5">
          {video.status !== 'PUBLISHED' && (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Publicar ${video.tittle}`}
              isLoading={updateStatus.isPending}
              onClick={() => setStatus('PUBLISHED')}
            >
              <Eye size={15} />
            </Button>
          )}
          {video.status !== 'PRIVATE' && (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Tornar ${video.tittle} privado`}
              isLoading={updateStatus.isPending}
              onClick={() => setStatus('PRIVATE')}
            >
              <Lock size={15} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Excluir ${video.tittle}`}
            onClick={() => setConfirmOpen(true)}
            className="text-danger-400 hover:bg-danger-500/10 hover:text-danger-400"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      )}

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Excluir vídeo">
        <p className="text-sm text-surface-700">
          Excluir <strong className="text-surface-900">{video.tittle}</strong>, de{' '}
          {video.creatorName}? Esta ação não pode ser desfeita.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={remove} isLoading={deleteVideo.isPending}>
            <Trash2 size={16} />
            Excluir
          </Button>
        </div>
      </Modal>
    </li>
  )
}

function CategoriesSection() {
  const { data, isLoading, isError, error, refetch, isFetching } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const { showToast } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryResponse | null>(null)
  const [pendingName, setPendingName] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '', icon: '' },
  })

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    reset({ name: '', description: '', icon: '' })
    setFormOpen(true)
  }

  const openEdit = (category: CategoryResponse) => {
    setEditing(category)
    setFormError(null)
    reset({
      name: category.name,
      description: category.description ?? '',
      icon: category.icon ?? '',
    })
    setFormOpen(true)
  }

  const onSubmit = async (values: CategoryValues) => {
    setFormError(null)
    try {
      if (editing) {
        await updateCategory.mutateAsync({ name: editing.name, body: values })
        showToast('Categoria atualizada.', 'success')
      } else {
        await createCategory.mutateAsync(values)
        showToast('Categoria criada.', 'success')
      }
      setFormOpen(false)
    } catch (err) {
      setFormError(toErrorMessage(err))
    }
  }

  const confirmDelete = async () => {
    if (!pendingName) return
    try {
      await deleteCategory.mutateAsync(pendingName)
      showToast('Categoria removida.', 'success')
    } catch (err) {
      showToast(toErrorMessage(err), 'error')
    } finally {
      setPendingName(null)
    }
  }

  return (
    <section className="mt-11">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-surface-900">Categorias</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={15} />
          Nova
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          icon={ServerCrash}
          title="Não foi possível carregar as categorias"
          description={toErrorMessage(error)}
          action={
            <Button variant="secondary" onClick={() => refetch()} isLoading={isFetching}>
              <RotateCw size={16} />
              Tentar de novo
            </Button>
          }
        />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.map((category) => (
            <li
              key={category.name}
              className="flex items-start gap-3 rounded-xl border border-surface-200 bg-surface-100 p-4"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/12 text-brand-link">
                <Tag size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-surface-900">{category.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-surface-600">
                  {category.description || 'Sem descrição'}
                </p>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Editar ${category.name}`}
                  onClick={() => openEdit(category)}
                >
                  <Pencil size={15} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remover ${category.name}`}
                  onClick={() => setPendingName(category.name)}
                  className="text-danger-400 hover:bg-danger-500/10 hover:text-danger-400"
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && !isError && data?.length === 0 && (
        <EmptyState
          icon={Tag}
          title="Nenhuma categoria ainda"
          description="Crie categorias para organizar o catálogo."
          action={
            <Button variant="secondary" onClick={openCreate}>
              <Plus size={16} />
              Criar categoria
            </Button>
          }
        />
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar categoria' : 'Nova categoria'}
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {formError && <Alert tone="error">{formError}</Alert>}

          <Input
            label="Nome"
            placeholder="Documentário"
            error={errors.name?.message}
            {...register('name')}
          />
          <Textarea
            label="Descrição"
            rows={3}
            placeholder="Que tipo de vídeo entra nesta categoria?"
            error={errors.description?.message}
            {...register('description')}
          />
          <Input
            label="Ícone"
            placeholder="Clapperboard"
            hint="Nome de um ícone (ex.: Film, Music, Tag)."
            error={errors.icon?.message}
            {...register('icon')}
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={pendingName !== null}
        onClose={() => setPendingName(null)}
        title="Remover categoria"
      >
        <p className="text-sm text-surface-700">
          Remover a categoria <strong className="text-surface-900">{pendingName}</strong>?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPendingName(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete} isLoading={deleteCategory.isPending}>
            <Trash2 size={16} />
            Remover
          </Button>
        </div>
      </Modal>
    </section>
  )
}
