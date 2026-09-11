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
  Star,
  MessageSquare,
  BadgeCheck,
  BadgeX,
  Search,
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
import { VerifiedBadge } from '@/components/user/VerifiedBadge'
import { useUsers, useDeleteUser, useSetUserVerified } from '@/hooks/useUsers'
import { useFeedbacks } from '@/hooks/useFeedback'
import { useVideos, useDeleteVideo, useUpdateVideoStatus } from '@/hooks/useVideos'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { toErrorMessage } from '@/api/client'
import { categorySchema, type CategoryValues } from '@/lib/validation'
import { formatRelativeDate } from '@/lib/format'
import { STATUS_LABEL, type UiVideo } from '@/lib/video'
import { cn } from '@/lib/cn'
import type { CategoryResponse, UserResponse, VideoStatus } from '@/api/types'

export function AdminPage() {
  const users = useUsers()
  const videos = useVideos()
  const categories = useCategories()
  const feedbacks = useFeedbacks()

  // TEMP: total de visualizacoes desativado junto com o card da metrica.

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <header>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-500/12 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-success-ink">
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

      {/* As seis métricas numa grade só. Eram duas faixas de `sm:grid-cols-4`,
          a segunda com apenas dois cards — que a partir de `sm` ocupavam duas
          das quatro colunas e deixavam metade da linha vazia, como se dois
          cards tivessem falhado ao carregar. Em 3 colunas os seis fecham duas
          linhas cheias; em 2 (mobile), três linhas cheias. */}
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Metric label="Usuários" value={users.data?.length} icon={UsersIcon} loading={users.isLoading} />
        <Metric label="Vídeos" value={videos.data?.length} icon={Film} loading={videos.isLoading} />
        {/* TEMP: metrica de visualizacoes escondida a pedido do time. */}
        <Metric
          label="Categorias"
          value={categories.data?.length}
          icon={Tag}
          loading={categories.isLoading}
        />

        {/* A nota media da plataforma so faz sentido ao lado do total de
            avaliacoes — uma media de 5,0 vinda de UMA avaliacao nao diz o
            mesmo que a mesma media vinda de duzentas. */}
        <Metric
          label="Avaliações"
          value={feedbacks.data?.length}
          icon={MessageSquare}
          loading={feedbacks.isLoading}
        />
        {/* Verificados ao lado do total de usuários, e não na seção de
            verificação: é a mesma leitura de "quanto da base" que as outras
            métricas dão, e é o número que o admin quer antes de decidir se
            precisa abrir a seção. */}
        <Metric
          label="Verificados"
          value={users.data?.filter((item) => item.userIsVerified === true).length}
          icon={BadgeCheck}
          loading={users.isLoading}
        />
        <Metric
          label="Nota média"
          value={
            feedbacks.data
              ? feedbacks.data.length > 0
                ? (
                    feedbacks.data.reduce((sum, item) => sum + (item.rating ?? 0), 0) /
                    feedbacks.data.length
                  ).toFixed(1)
                : '—'
              : undefined
          }
          icon={Star}
          loading={feedbacks.isLoading}
        />
      </div>

      <UsersSection />
      <VerificationSection />
      <VideosSection />
      <CategoriesSection />
      <FeedbacksSection />
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
            // `join` em vez de interpolar os dois: o sobrenome é opcional no
            // cadastro, e `${name} ${surname}` deixaria um espaço solto antes da
            // etiqueta "você" e nas iniciais do avatar.
            const fullName = [item.name, item.surname].filter(Boolean).join(' ').trim()
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:p-4">
                <Avatar name={fullName} className="h-10 w-10 text-sm" />
                <div className="min-w-0 flex-1">
                  {/* `flex` em vez de `truncate` no <p>: o selo e a etiqueta
                      "você" ficam fora do nó que trunca, senão um nome longo
                      apagava justamente os dois. */}
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-surface-900">
                    <span className="min-w-0 truncate">{fullName}</span>
                    <VerifiedBadge verified={item.userIsVerified} size="sm" />
                    {isSelf && (
                      <span className="shrink-0 rounded bg-surface-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-surface-600">
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
                  className="text-danger-ink hover:bg-danger-500/10 hover:text-danger-ink"
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

/** Verificação de contas — PUT /auth/users/verify-account/{email}.
 *
 *  Seção separada da de "Usuários" de propósito, e não um quarto botão nas
 *  linhas de lá: conceder um selo é uma decisão editorial, não manutenção de
 *  cadastro, e é a única ação desta tela que muda o que TODO visitante vê ao
 *  lado de um nome. Junto do botão de excluir, um clique errado por vizinhança
 *  sairia caro. A separação também abre espaço para o filtro e a busca, que são
 *  o que torna a lista utilizável — a rota devolve a base inteira, sem
 *  paginação nem filtro no servidor.
 *
 *  Lê o MESMO `useUsers()` da seção de cima: as duas compartilham a chave
 *  ['users'] no React Query, então não há uma segunda request — e um selo
 *  concedido aqui reaparece na outra lista (e na métrica do topo) sozinho,
 *  porque a mutation invalida essa chave.
 *
 *  O admin não recebe ação disponível para a PRÓPRIA conta: o backend responde
 *  403 nesse caso, e a interface reflete a regra em vez de deixar o usuário
 *  descobrir pelo erro. A barreira real continua sendo o servidor. */
const VERIFY_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'verified', label: 'Verificados' },
  { key: 'unverified', label: 'Não verificados' },
] as const

type VerifyFilter = (typeof VERIFY_FILTERS)[number]['key']

function VerificationSection() {
  const { user: currentUser } = useAuth()
  const { data, isLoading, isError, error, refetch, isFetching } = useUsers()
  const [filter, setFilter] = useState<VerifyFilter>('all')
  const [search, setSearch] = useState('')
  const [visible, setVisible] = useState(FIRST_PAGE)

  const all = data ?? []
  const term = search.trim().toLowerCase()

  const filtered = all.filter((item) => {
    // `=== true` e não truthy: contra um backend sem a feature o campo vem
    // `undefined`, e o filtro "Não verificados" deve listar essas contas em
    // vez de sumir com elas.
    const isVerified = item.userIsVerified === true
    if (filter === 'verified' && !isVerified) return false
    if (filter === 'unverified' && isVerified) return false
    if (!term) return true
    // Nome OU e-mail: o admin costuma ter só um dos dois em mão.
    return [item.name, item.surname, item.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(term)
  })

  const shown = filtered.slice(0, visible)
  const remaining = filtered.length - shown.length

  return (
    <section className="mt-11">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-surface-900">Verificação</h2>
        {!isLoading && !isError && (
          <p className="text-xs tabular-nums text-surface-600">
            {shown.length} de {filtered.length}
          </p>
        )}
      </div>

      <p className="-mt-2 mb-4 text-[13px] leading-relaxed text-surface-600">
        O selo de verificado aparece ao lado do nome da conta em toda a
        plataforma. Só administradores podem concedê-lo, e ninguém pode alterar
        o da própria conta.
      </p>

      {!isLoading && !isError && all.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Botões com `aria-pressed`, não `role="tab"`: isto filtra uma lista
              só, não alterna entre painéis diferentes — e declarar abas sem
              painéis obrigaria a navegação por setas que não existe aqui. O
              desenho é o mesmo da fita de abas do perfil. */}
          <div role="group" aria-label="Filtrar por verificação" className="flex gap-2">
            {VERIFY_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => {
                  setFilter(key)
                  // Volta à primeira página ao trocar de filtro: manter o "ver
                  // mais" anterior mostrava "30 de 4".
                  setVisible(FIRST_PAGE)
                }}
                className={cn(
                  'shrink-0 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors duration-150 focus-ring max-sm:min-h-[44px]',
                  filter === key
                    ? 'bg-surface-900 text-surface-0'
                    : 'bg-surface-200 text-surface-700 hover:bg-surface-300',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative sm:ml-auto sm:w-64">
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-surface-600"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setVisible(FIRST_PAGE)
              }}
              placeholder="Buscar por nome ou e-mail"
              // Sem rótulo VISÍVEL (o ícone e o placeholder já dizem o que é, e
              // um label desalinharia a altura da fita de filtros ao lado), mas
              // com nome acessível: o campo não pode ser anunciado apenas como
              // "edição, em branco".
              aria-label="Buscar usuário por nome ou e-mail"
              className="pl-9"
            />
          </div>
        </div>
      )}

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

      {!isLoading && !isError && shown.length > 0 && (
        <ul className="divide-y divide-surface-200 overflow-hidden rounded-xl border border-surface-200 bg-surface-100">
          {shown.map((item) => (
            <VerificationRow
              key={item.id}
              user={item}
              isSelf={item.email === currentUser?.email}
            />
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

      {/* Dois vazios diferentes: base vazia é um estado do sistema; filtro sem
          resultado é consequência do que o admin acabou de digitar — e neste a
          saída é limpar o filtro, não esperar. */}
      {!isLoading && !isError && all.length === 0 && (
        <EmptyState icon={UsersIcon} title="Nenhum usuário cadastrado" />
      )}

      {!isLoading && !isError && all.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={Search}
          title="Nenhum usuário encontrado"
          description={
            term
              ? 'Nada corresponde à busca dentro deste filtro.'
              : filter === 'verified'
                ? 'Nenhuma conta verificada ainda.'
                : 'Todas as contas estão verificadas.'
          }
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('')
                setFilter('all')
                setVisible(FIRST_PAGE)
              }}
            >
              Limpar filtros
            </Button>
          }
        />
      )}
    </section>
  )
}

/** Uma conta na lista de verificação.
 *
 *  A mutation vive NA LINHA, e não na seção, para que `isPending` seja o estado
 *  daquela conta: compartilhada, clicar em "Verificar" numa linha punha todas
 *  as outras em carregamento. Mesmo arranjo do VideoRow acima. */
function VerificationRow({ user, isSelf }: { user: UserResponse; isSelf: boolean }) {
  const { showToast } = useToast()
  const setVerified = useSetUserVerified()

  const isVerified = user.userIsVerified === true
  const fullName = [user.name, user.surname].filter(Boolean).join(' ').trim() || user.email
  const firstName = user.name || user.email

  const toggle = async () => {
    // Guarda redundante com o `disabled` do botão, de propósito: um clique que
    // escape do estado da tela não deve disparar uma request que o backend já
    // vai recusar com 403.
    if (isSelf) return
    const next = !isVerified
    try {
      await setVerified.mutateAsync({ email: user.email, isVerified: next })
      showToast(
        next
          ? `${firstName} agora tem o selo de verificado.`
          : `Selo de verificado removido de ${firstName}.`,
        'success',
      )
    } catch (err) {
      showToast(toErrorMessage(err), 'error')
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:p-4">
      <Avatar name={fullName} className="h-10 w-10 text-sm" />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-surface-900">
          <span className="min-w-0 truncate">{fullName}</span>
          <VerifiedBadge verified={user.userIsVerified} size="sm" />
          {isSelf && (
            <span className="shrink-0 rounded bg-surface-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-surface-600">
              você
            </span>
          )}
        </p>
        <p className="truncate text-xs text-surface-600">{user.email}</p>
      </div>

      {/* O motivo do bloqueio vai no `title` E no `aria-label`: um botão
          desabilitado não é alcançável pelo Tab, então sem o rótulo quem usa
          leitor de tela encontraria só um controle inerte e sem explicação. */}
      <Button
        variant={isVerified ? 'ghost' : 'secondary'}
        size="sm"
        disabled={isSelf}
        isLoading={setVerified.isPending}
        onClick={toggle}
        title={
          isSelf
            ? 'Você não pode alterar a verificação da própria conta.'
            : isVerified
              ? `Remover o selo de ${firstName}`
              : `Verificar ${firstName}`
        }
        aria-label={
          isSelf
            ? `Alterar a verificação de ${fullName} — indisponível na própria conta`
            : isVerified
              ? `Remover o selo de verificado de ${fullName}`
              : `Conceder o selo de verificado a ${fullName}`
        }
        className={cn('ml-auto max-sm:w-full', isVerified && 'text-surface-600')}
      >
        {isVerified ? <BadgeX size={15} /> : <BadgeCheck size={15} />}
        {isVerified ? 'Remover selo' : 'Verificar'}
      </Button>
    </li>
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

  // flex-wrap abaixo de sm: com thumb (80px) + 3 botões de ação (~130px) na
  // mesma linha, sobravam ~30px para o título num viewport de 320px e a linha
  // virava reticências — o admin não distinguia um vídeo do outro. Envolvidos,
  // o texto fica na primeira linha e as ações na segunda.
  return (
    <li className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:p-4">
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
        {/* TEMP: contagem de views escondida a pedido do time. */}
        <p className="truncate text-xs text-surface-600">
          {video.creatorName} · {STATUS_LABEL[video.status] ?? video.status}
        </p>
      </div>

      {/* Sem id não há como chamar as rotas por id — mostrar botões que só
          poderiam falhar seria pior que escondê-los (ver readId em lib/video). */}
      {id != null && (
        <div className="ml-auto flex shrink-0 items-center gap-0.5 max-sm:w-full max-sm:justify-end">
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
            className="text-danger-ink hover:bg-danger-500/10 hover:text-danger-ink"
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
                  className="text-danger-ink hover:bg-danger-500/10 hover:text-danger-ink"
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

/** Avaliacoes da plataforma (GET /feedback/getFeedbacks).
 *
 *  Fica no painel do admin porque e o unico lugar onde a resposta desta rota
 *  faz sentido: ela devolve TUDO, sem filtro nem paginacao, com o video e o
 *  usuario aninhados em cada item — o proprio Swagger recomenda uso
 *  administrativo. O corte por pagina e no cliente, como nas outras secoes.
 *
 *  A ordenacao mais recente primeiro e feita aqui porque o backend nao ordena:
 *  numa lista sem pagina, o que interessa ao admin e o que acabou de chegar. */
function FeedbacksSection() {
  const { data, isLoading, isError, error, refetch, isFetching } = useFeedbacks()
  const [visible, setVisible] = useState(FIRST_PAGE)

  // Copia antes de ordenar: `data` e o array do cache do React Query, e
  // `sort` muta no lugar — mexer nele altera o que outras telas leem.
  const ordered = [...(data ?? [])].sort((a, b) =>
    (b.LastUpdate ?? '').localeCompare(a.LastUpdate ?? ''),
  )
  const total = ordered.length
  const shown = ordered.slice(0, visible)
  const remaining = total - shown.length

  return (
    <section className="mt-11">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-surface-900">Avaliações</h2>
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
          title="Não foi possível carregar as avaliações"
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
          {shown.map((feedback) => (
            // `flex-wrap` como nas outras seções (usuários e vídeos já fazem
            // isso): sem ele o avatar e a nota, ambos `shrink-0`, espremiam
            // toda a compressão na coluna do meio — e as duas linhas dela são
            // `truncate`, então a 320px a data sumia primeiro, justamente o
            // campo por onde a lista é ordenada.
            <li
              key={feedback.id}
              className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:p-4"
            >
              <Avatar
                name={`${feedback.userResponse?.name ?? ''} ${feedback.userResponse?.surname ?? ''}`.trim()}
                className="h-9 w-9 shrink-0 text-xs"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-surface-900">
                  {feedback.videoResponse?.tittle ?? 'Vídeo removido'}
                </p>
                <p className="truncate text-xs text-surface-600">
                  {`${feedback.userResponse?.name ?? ''} ${feedback.userResponse?.surname ?? ''}`.trim() ||
                    'Usuário removido'}
                  {' · '}
                  {formatRelativeDate(feedback.LastUpdate)}
                </p>
              </div>
              {/* A nota e o dado principal da linha: numero + estrela, para nao
                  depender so da cor. `aria-label` porque "4 de 5" e o que
                  importa, nao o glifo. */}
              <span
                className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-surface-900"
                aria-label={`Nota ${feedback.rating} de 5.`}
              >
                <Star size={14} className="fill-star-ink text-star-ink" aria-hidden="true" />
                {feedback.rating}
              </span>
            </li>
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
        <EmptyState icon={Star} title="Nenhuma avaliação ainda" />
      )}
    </section>
  )
}
