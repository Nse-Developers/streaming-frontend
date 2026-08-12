import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Film,
  Save,
  ShieldCheck,
  UploadCloud,
  ServerCrash,
  RotateCw,
  Eye,
  Lock,
  Trash2,
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { VideoCardSkeleton } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'
import { VideoCard } from '@/components/video/VideoCard'
import { useAuth, type AuthUser } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useDeleteVideo, useMyVideos, useUpdateVideoStatus } from '@/hooks/useVideos'
import { useUpdateProfile } from '@/hooks/useUsers'
import { toErrorMessage } from '@/api/client'
import { profileSchema, type ProfileValues } from '@/lib/validation'
import type { VideoStatus } from '@/api/types'
import type { UiVideo } from '@/lib/video'
import { cn } from '@/lib/cn'

const TABS = [
  { key: 'PUBLISHED' as const, label: 'Publicados' },
  { key: 'DRAFT' as const, label: 'Rascunhos' },
  { key: 'PRIVATE' as const, label: 'Privados' },
]

const ACCOUNT_LABEL = { CREATORS: 'Criador', VIEWERS: 'Espectador' } as const

export function ProfilePage() {
  const { user, isCreator, isAdmin } = useAuth()
  const [tab, setTab] = useState<VideoStatus>('PUBLISHED')

  if (!user) return null

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      {/* Cabeçalho do perfil */}
      <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Avatar name={user.name} className="h-16 w-16 text-xl sm:h-20 sm:w-20 sm:text-2xl" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-surface-900 sm:text-3xl">
            {user.name}
          </h1>
          <p className="mt-0.5 truncate text-sm text-surface-600">{user.email}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/12 px-2.5 py-1 text-[11px] font-semibold text-brand-link">
              {ACCOUNT_LABEL[user.userTypeAccount]}
            </span>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-500/12 px-2.5 py-1 text-[11px] font-semibold text-success-500">
                <ShieldCheck size={11} />
                Administrador
              </span>
            )}
          </div>
        </div>

        {isCreator && (
          <Link to="/upload" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <UploadCloud size={16} />
              Enviar vídeo
            </Button>
          </Link>
        )}
      </header>

      {/* Meus vídeos — só faz sentido para quem publica */}
      {isCreator && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-bold text-surface-900">Meus vídeos</h2>

          <div
            role="tablist"
            aria-label="Filtrar por status"
            className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          >
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  'shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors duration-150 focus-ring',
                  tab === key
                    ? 'bg-surface-900 text-surface-0'
                    : 'bg-surface-200 text-surface-700 hover:bg-surface-300',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <MyVideos status={tab} email={user.email} />
        </section>
      )}

      {/* Editar perfil */}
      <section className="mt-12">
        <h2 className="mb-1.5 font-display text-lg font-bold text-surface-900">Editar perfil</h2>
        <p className="mb-5 text-sm text-surface-600">
          Estes dados aparecem na sua página pública.
        </p>
        <ProfileForm user={user} />
      </section>
    </div>
  )
}

function MyVideos({ status, email }: { status: VideoStatus; email: string }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useMyVideos(status)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <VideoCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={ServerCrash}
        title="Não foi possível carregar seus vídeos"
        description={toErrorMessage(error)}
        action={
          <Button variant="secondary" onClick={() => refetch()} isLoading={isFetching}>
            <RotateCw size={16} />
            Tentar de novo
          </Button>
        }
      />
    )
  }

  if (!data || data.length === 0) {
    const copy: Record<string, string> = {
      PUBLISHED: 'Você ainda não publicou nenhum vídeo.',
      DRAFT: 'Nenhum rascunho salvo.',
      PRIVATE: 'Nenhum vídeo privado.',
    }
    return (
      <EmptyState
        icon={Film}
        title="Nada aqui ainda"
        description={copy[status]}
        action={
          <Link to="/upload">
            <Button variant="secondary">
              <UploadCloud size={16} />
              Enviar vídeo
            </Button>
          </Link>
        }
      />
    )
  }

  // Backend antigo sem o campo `id` (ver PENDENCIAS.md): nenhuma ação de
  // status é possível sem ele, então avisa em vez de mostrar botão inerte.
  const missingIds = data.some((video) => video.id == null)

  return (
    <>
      <p className="mb-3 text-sm text-surface-600">
        {data.length} {data.length === 1 ? 'vídeo' : 'vídeos'} — {email}
      </p>

      {missingIds && (
        <Alert tone="info" className="mb-5">
          Esta versão da API não devolve o identificador de cada vídeo, então
          publicar, tornar privado e excluir não estão disponíveis aqui.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((video) => (
          <VideoCard
            key={video.key}
            video={video}
            actions={video.id != null ? <VideoStatusActions video={video} /> : undefined}
          />
        ))}
      </div>
    </>
  )
}

/** Ações de status disponíveis quando o card tem o id do vídeo. */
function VideoStatusActions({ video }: { video: UiVideo }) {
  const { showToast } = useToast()
  const updateStatus = useUpdateVideoStatus()
  const deleteVideo = useDeleteVideo()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const id = video.id
  if (id == null) return null

  const setStatus = async (status: VideoStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status })
      showToast(
        status === 'PUBLISHED' ? 'Vídeo publicado.' : 'Vídeo tornado privado.',
        'success',
      )
    } catch (err) {
      showToast(toErrorMessage(err), 'error')
    }
  }

  const remove = async () => {
    try {
      await deleteVideo.mutateAsync(id)
      showToast('Vídeo excluído.', 'success')
    } catch (err) {
      showToast(toErrorMessage(err), 'error')
    } finally {
      setConfirmDelete(false)
    }
  }

  return (
    <>
      {video.status !== 'PUBLISHED' && (
        <Button
          variant="secondary"
          size="sm"
          isLoading={updateStatus.isPending}
          onClick={() => setStatus('PUBLISHED')}
        >
          <Eye size={14} />
          Publicar
        </Button>
      )}
      {video.status !== 'PRIVATE' && (
        <Button
          variant="secondary"
          size="sm"
          isLoading={updateStatus.isPending}
          onClick={() => setStatus('PRIVATE')}
        >
          <Lock size={14} />
          Tornar privado
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirmDelete(true)}
        className="text-danger-400 hover:bg-danger-500/10 hover:text-danger-400"
      >
        <Trash2 size={14} />
        Excluir
      </Button>

      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="Excluir vídeo">
        <p className="text-sm text-surface-700">
          Excluir <strong className="text-surface-900">{video.tittle}</strong>? Esta ação não pode
          ser desfeita.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={remove} isLoading={deleteVideo.isPending}>
            <Trash2 size={16} />
            Excluir
          </Button>
        </div>
      </Modal>
    </>
  )
}

function ProfileForm({ user }: { user: AuthUser }) {
  const { showToast } = useToast()
  const { refreshUser } = useAuth()
  const updateProfile = useUpdateProfile()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    // /auth/me passou a devolver o perfil completo, então o formulário abre
    // com o que está gravado em vez de em branco.
    defaultValues: {
      name: user.name,
      surname: user.surname,
      bio: user.bio,
      state: user.state,
      country: user.country,
      linkInstagram: user.linkInstagram,
      linkYoutube: user.linkYoutube,
    },
  })

  const onSubmit = async (values: ProfileValues) => {
    setFormError(null)
    try {
      // O PUT é merge parcial e ignora string em branco, então mandar o form
      // inteiro é seguro: limpar um campo pela UI não apaga o valor gravado
      // (para isso o backend precisaria distinguir "vazio" de "não enviado").
      await updateProfile.mutateAsync({ email: user.email, body: values })
      // Sem isto o cabeçalho e o próprio form continuariam mostrando os dados
      // antigos até o próximo F5.
      await refreshUser()
      showToast('Perfil atualizado.', 'success')
    } catch (error) {
      setFormError(toErrorMessage(error))
    }
  }

  return (
    <>
      {formError && (
        <Alert tone="error" className="mb-5">
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nome"
            autoComplete="given-name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Sobrenome"
            autoComplete="family-name"
            error={errors.surname?.message}
            {...register('surname')}
          />
        </div>

        <Textarea
          label="Bio"
          rows={3}
          placeholder="Conte o que você faz."
          error={errors.bio?.message}
          {...register('bio')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Estado" error={errors.state?.message} {...register('state')} />
          <Input label="País" error={errors.country?.message} {...register('country')} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Instagram"
            type="url"
            inputMode="url"
            error={errors.linkInstagram?.message}
            {...register('linkInstagram')}
          />
          <Input
            label="YouTube"
            type="url"
            inputMode="url"
            error={errors.linkYoutube?.message}
            {...register('linkYoutube')}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="lg" isLoading={isSubmitting}>
            <Save size={16} />
            Salvar alterações
          </Button>
        </div>
      </form>
    </>
  )
}
