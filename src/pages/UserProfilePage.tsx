import { Link, useParams } from 'react-router-dom'
import {
  Compass,
  ServerCrash,
  RotateCw,
  Film,
  CalendarDays,
  MapPin,
  AtSign,
  Video,
  ArrowLeft,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton, VideoCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { VideoCard } from '@/components/video/VideoCard'
import { FollowButton } from '@/components/user/FollowButton'
import { FollowerCount } from '@/components/user/FollowerCount'
import { usePublicUser } from '@/hooks/useUsers'
import { useVideos } from '@/hooks/useVideos'
import { useAuth } from '@/context/AuthContext'
import { toErrorMessage } from '@/api/client'
import { safeExternalUrl } from '@/lib/validation'
import { formatLongDateBR } from '@/lib/format'
import type { PublicUserResponse } from '@/api/types'
import { publicVideos, type UiVideo } from '@/lib/video'

const ACCOUNT_LABEL = { CREATORS: 'Criador', VIEWERS: 'Espectador' } as const

/** Perfil público de OUTRO usuário (/users/:id).
 *
 *  Diferente de ProfilePage, que é o perfil do próprio usuário logado e tem
 *  formulário de edição. Aqui é só leitura: e-mail, papel administrativo e
 *  demais dados sensíveis nem chegam ao front (o DTO público não os inclui).
 *
 *  Protegida por RequireAuth em App.tsx, espelhando o SecurityConfig:
 *  GET /auth/user/{id} -> hasAnyRole("CREATORS","VIEWERS"). */
export function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const userId = Number(id)
  const isValidId = Number.isInteger(userId) && userId > 0

  const { user: loggedUser } = useAuth()
  const { data: user, isLoading, isError, error, refetch, isFetching } = usePublicUser(userId)

  if (!isValidId) {
    return (
      <PageShell>
        <EmptyState
          icon={Compass}
          title="Endereço inválido"
          description="O identificador do perfil não é um número válido."
          action={
            <Link to="/">
              <Button variant="secondary">Voltar ao início</Button>
            </Link>
          }
        />
      </PageShell>
    )
  }

  if (isLoading) return <ProfileSkeleton />

  if (isError || !user) {
    return (
      <PageShell>
        <EmptyState
          icon={ServerCrash}
          title="Perfil não encontrado"
          description={
            isError ? toErrorMessage(error) : 'Este perfil não existe ou não está mais disponível.'
          }
          action={
            <Button variant="secondary" onClick={() => refetch()} isLoading={isFetching}>
              <RotateCw size={16} />
              Tentar de novo
            </Button>
          }
        />
      </PageShell>
    )
  }

  const fullName = [user.name, user.surname].filter(Boolean).join(' ').trim() || 'Usuário'
  const location = [user.state, user.country].filter(Boolean).join(', ')

  // Id vindo da RESPOSTA, com a URL como reserva. A resposta é a fonte mais
  // confiável: se o backend resolver o perfil de outro jeito (redirect,
  // alias), é o `userId` dela que diz de quem é esta página — e é ele que
  // precisa bater com os vídeos do feed.
  const profileId = user.userId ?? userId
  const isSelf = loggedUser?.id === profileId

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
      <BackLink />

      {/* Cabeçalho — mesma anatomia do ProfilePage, para as duas telas de
          perfil não parecerem produtos diferentes. */}
      <header className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Avatar name={fullName} className="h-16 w-16 text-xl sm:h-20 sm:w-20 sm:text-2xl" />

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-surface-900 sm:text-3xl">
            {fullName}
          </h1>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/12 px-2.5 py-1 text-[11px] font-semibold text-brand-link">
              {ACCOUNT_LABEL[user.typeAccount] ?? user.typeAccount}
            </span>
            {isSelf && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-200 px-2.5 py-1 text-[11px] font-semibold text-surface-700">
                Você
              </span>
            )}
            <FollowerCount userId={profileId} className="text-sm text-surface-600" />
          </div>
        </div>

        {/* No próprio perfil, atalho para editar; no de outra pessoa, seguir.
            Os dois nunca aparecem juntos — o FollowButton se esconde sozinho
            quando o alvo é o usuário logado. */}
        {isSelf ? (
          <Link to="/profile" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto">
              Editar meu perfil
            </Button>
          </Link>
        ) : (
          <FollowButton userId={profileId} name={user.name} className="w-full sm:w-auto" />
        )}
      </header>

      {user.bio && (
        <div className="mt-6 rounded-xl bg-surface-100 p-4">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-surface-800">
            {user.bio}
          </p>
        </div>
      )}

      <MetaRow location={location} registrationDate={user.registrationDate} />
      <SocialLinks user={user} />

      <section className="mt-10">
        <h2 className="mb-4 font-display text-lg font-bold text-surface-900">
          Vídeos de {user.name || 'usuário'}
        </h2>
        <PublicVideos
          userId={profileId}
          firstName={user.name}
          isCreator={user.typeAccount === 'CREATORS'}
        />
      </section>
    </div>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">{children}</div>
}

function BackLink() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-surface-600 transition-colors hover:text-surface-900 focus-ring"
    >
      <ArrowLeft size={15} />
      Voltar
    </Link>
  )
}

/** Local e data de entrada. Cada item some quando o dado não vem — uma linha
 *  com rótulo e valor vazio parece bug. */
function MetaRow({ location, registrationDate }: { location: string; registrationDate: string }) {
  const since = formatLongDateBR(registrationDate)
  if (!location && !since) return null

  return (
    <dl className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-surface-600">
      {location && (
        <div className="inline-flex items-center gap-1.5">
          <MapPin size={15} className="shrink-0 text-surface-500" aria-hidden="true" />
          <dt className="sr-only">Localização</dt>
          <dd>{location}</dd>
        </div>
      )}
      {since && (
        <div className="inline-flex items-center gap-1.5">
          <CalendarDays size={15} className="shrink-0 text-surface-500" aria-hidden="true" />
          <dt className="sr-only">Membro desde</dt>
          <dd>Na Byou desde {since}</dd>
        </div>
      )}
    </dl>
  )
}

/** Instagram e YouTube. Passam por safeExternalUrl: o valor vem de um campo
 *  livre preenchido pelo usuário, e um `javascript:` viraria execução de script
 *  ao clique. Só http/https sobrevivem. */
function SocialLinks({ user }: { user: PublicUserResponse }) {
  // Ícones genéricos (arroba, câmera) em vez de logos: o lucide v1 removeu as
  // marcas registradas do pacote. O rótulo ao lado é que identifica a rede.
  const links = [
    { url: safeExternalUrl(user.linkInstagram), icon: AtSign, label: 'Instagram' },
    { url: safeExternalUrl(user.linkYoutube), icon: Video, label: 'YouTube' },
  ].filter((link): link is { url: string; icon: typeof AtSign; label: string } =>
    Boolean(link.url),
  )

  if (links.length === 0) return null

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {links.map(({ url, icon: Icon, label }) => (
        <a
          key={label}
          href={url}
          target="_blank"
          // noreferrer junto de noopener: sem ele a página aberta consegue
          // manipular esta aba pelo window.opener.
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-200 px-3 py-1.5 text-xs font-semibold text-surface-700 transition-colors hover:bg-surface-300 hover:text-surface-900 focus-ring"
        >
          <Icon size={14} />
          {label}
        </a>
      ))}
    </div>
  )
}

/** Vídeos públicos do usuário.
 *
 *  IMPORTANTE — de onde vem a lista: o endpoint por usuário
 *  (`GET /video/users/videos`) exige o E-MAIL do criador, e o DTO público não
 *  devolve e-mail (de propósito: e-mail alheio não é dado público). Então aqui
 *  filtramos o feed geral, que já vem carregado e em cache.
 *
 *  Isso é seguro quanto a privacidade: o feed só traz vídeos PUBLISHED, então
 *  rascunho e privado de outra pessoa não têm como aparecer — a garantia é do
 *  backend, não deste filtro. O status é reconferido abaixo mesmo assim, para
 *  que uma mudança no feed não vaze nada por acidente.
 *
 *  O casamento é por `userId` (devolvido desde 2026-08-16), não por nome:
 *  nomes se repetem, e filtrar por texto misturaria os vídeos de dois
 *  homônimos na página de um só. */
function PublicVideos({
  userId,
  firstName,
  isCreator,
}: {
  userId: number
  firstName: string
  isCreator: boolean
}) {
  const { data: videos, isLoading, isError, error, refetch, isFetching } = useVideos()

  if (!isCreator) {
    return (
      <EmptyState
        icon={Film}
        title="Sem vídeos"
        description={`${firstName || 'Este usuário'} tem uma conta de espectador e não publica vídeos.`}
      />
    )
  }

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
        title="Não foi possível carregar os vídeos"
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

  // Só o que é público E é desta pessoa. O recorte de visibilidade vem de
  // lib/video.ts, para não repetir a regra em cada tela.
  const mine: UiVideo[] = publicVideos(videos).filter((video) => video.userId === userId)

  if (mine.length === 0) {
    return (
      <EmptyState
        icon={Film}
        title="Nenhum vídeo público"
        description={`${firstName || 'Este criador'} ainda não tem vídeos publicados.`}
      />
    )
  }

  return (
    <>
      <p className="mb-4 text-sm text-surface-600">
        {mine.length} {mine.length === 1 ? 'vídeo publicado' : 'vídeos publicados'}
      </p>
      <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {mine.map((video) => (
          <VideoCard key={video.key} video={video} />
        ))}
      </div>
    </>
  )
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Skeleton className="h-16 w-16 rounded-full sm:h-20 sm:w-20" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>
      <Skeleton className="mt-6 h-20 w-full rounded-xl" />
      <Skeleton className="mt-5 h-4 w-72" />
      <Skeleton className="mt-10 h-6 w-40" />
      <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <VideoCardSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}
