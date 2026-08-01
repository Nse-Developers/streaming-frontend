import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Film, Eye, Lock, FileEdit, Trash2, Plus, Users, Settings2 } from 'lucide-react'
import { useAllVideos, useDeleteVideo, useSetVideoStatus } from '@/hooks/useVideos'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { creatorById, type MockVideo } from '@/mocks/data'
import { formatCompact, formatViews, formatRelativeDate } from '@/lib/format'
import { cn } from '@/lib/cn'

const TABS = [
  { key: 'PUBLISHED', label: 'Publicados' },
  { key: 'DRAFT', label: 'Rascunhos' },
  { key: 'PRIVATE', label: 'Privados' },
] as const

const statusTone = { PUBLISHED: 'success', DRAFT: 'neutral', PRIVATE: 'brand' } as const
const statusLabel = { PUBLISHED: 'Publicado', DRAFT: 'Rascunho', PRIVATE: 'Privado' } as const

export function ProfilePage() {
  const { user, isCreator } = useAuth()
  const { data: videos, isLoading } = useAllVideos()
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('PUBLISHED')

  const creator = creatorById(user?.id ?? 3)
  const mine = (videos ?? []).filter((v) => v.creatorId === (user?.id ?? 3))
  const shown = mine.filter((v) => v.status === tab)
  const totalViews = mine.reduce((sum, v) => sum + v.views, 0)

  return (
    <div>
      <div className="h-32 w-full bg-gradient-to-r from-brand-700 via-brand-500 to-brand-300 sm:h-44" />

      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <Avatar
              name={creator.name}
              className="h-24 w-24 border-4 border-surface-0 text-2xl sm:h-28 sm:w-28 sm:text-3xl"
            />
            <div className="pb-1">
              <h1 className="font-display text-2xl font-extrabold text-surface-900">{creator.name}</h1>
              <p className="text-sm text-surface-600">
                {creator.handle} · {formatCompact(creator.followers)} seguidores · {mine.length} vídeos
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm">
            <Settings2 size={16} />
            Editar perfil
          </Button>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-surface-700">{creator.bio}</p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <StatCard label="Visualizações" value={formatCompact(totalViews)} icon={Eye} />
          <StatCard label="Seguidores" value={formatCompact(creator.followers)} icon={Users} />
          <StatCard label="Vídeos" value={String(mine.length)} icon={Film} />
        </div>

        {isCreator && (
          <>
            <div className="mt-10 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-surface-900">Meus vídeos</h2>
              <Link to="/upload">
                <Button size="sm">
                  <Plus size={16} />
                  Enviar vídeo
                </Button>
              </Link>
            </div>

            <div className="mt-4 flex gap-6 border-b border-surface-200">
              {TABS.map((t) => {
                const count = mine.filter((v) => v.status === t.key).length
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={cn(
                      '-mb-px border-b-2 pb-3 text-sm font-medium transition-colors',
                      tab === t.key
                        ? 'border-brand-500 text-surface-900'
                        : 'border-transparent text-surface-600 hover:text-surface-800',
                    )}
                  >
                    {t.label}
                    <span className="ml-1.5 text-xs text-surface-500">{count}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 space-y-2">
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}

              {!isLoading && shown.length === 0 && (
                <EmptyState
                  icon={Film}
                  title="Nada aqui ainda"
                  description={
                    tab === 'PUBLISHED'
                      ? 'Publique um rascunho para ele aparecer nesta lista.'
                      : 'Vídeos com este status aparecem aqui.'
                  }
                />
              )}

              {!isLoading && shown.map((video) => <ManageRow key={video.id} video={video} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Eye }) {
  return (
    <div className="rounded-xl bg-surface-100 p-4">
      <Icon size={16} className="mb-2 text-surface-600" />
      <p className="font-display text-xl font-bold text-surface-900">{value}</p>
      <p className="text-xs text-surface-600">{label}</p>
    </div>
  )
}

function ManageRow({ video }: { video: MockVideo }) {
  const setStatus = useSetVideoStatus()
  const deleteVideo = useDeleteVideo()
  const { showToast } = useToast()

  const actions = [
    { status: 'PUBLISHED' as const, icon: Eye, label: 'Publicar' },
    { status: 'DRAFT' as const, icon: FileEdit, label: 'Mover para rascunho' },
    { status: 'PRIVATE' as const, icon: Lock, label: 'Tornar privado' },
  ].filter((a) => a.status !== video.status)

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-100 p-3 sm:flex-row sm:items-center">
      <Link to={`/videos/${video.id}`} className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg sm:w-40">
        <img src={video.thumbnail} alt="" className="h-full w-full object-cover" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/videos/${video.id}`} className="line-clamp-1 font-display text-sm font-semibold text-surface-900 hover:text-brand-400">
          {video.titulo}
        </Link>
        <p className="mt-1 text-xs text-surface-600">
          {formatViews(video.views)} · {formatRelativeDate(video.publishedAt)}
        </p>
        <div className="mt-2">
          <Badge tone={statusTone[video.status]}>{statusLabel[video.status]}</Badge>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        {actions.map(({ status, icon: Icon, label }) => (
          <Button
            key={status}
            variant="ghost"
            size="sm"
            aria-label={label}
            title={label}
            onClick={() => {
              setStatus.mutate({ id: video.id, status })
              showToast(`"${video.titulo}" agora é ${statusLabel[status].toLowerCase()}.`, 'success')
            }}
          >
            <Icon size={16} />
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          aria-label="Excluir"
          className="text-danger-400 hover:bg-danger-500/10"
          onClick={() => {
            deleteVideo.mutate(video.id)
            showToast('Vídeo excluído.', 'success')
          }}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  )
}
