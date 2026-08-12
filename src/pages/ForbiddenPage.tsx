import { Link, useLocation } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, UploadCloud } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'

const ACCOUNT_LABEL = { CREATORS: 'Criador', VIEWERS: 'Espectador' } as const

/** Mostrada quando o usuário está logado mas não tem o papel exigido pela rota.
 *  Explica o motivo em vez de só bloquear — sem isso o clique parece um bug. */
export function ForbiddenPage() {
  const { user } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-500/12 text-danger-400">
        <ShieldAlert size={30} />
      </div>

      <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-danger-400">
        Erro 403
      </p>
      <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-surface-900 sm:text-3xl">
        Você não tem acesso a esta área
      </h1>

      <p className="mt-3 text-[15px] leading-relaxed text-surface-600">
        {from ? (
          <>
            A página <span className="font-medium text-surface-800">{from}</span> exige uma
            permissão que sua conta não tem.
          </>
        ) : (
          'Esta página exige uma permissão que sua conta não tem.'
        )}
        {/* Só menciona o papel quando ele é conhecido — sem isso a frase
            terminava em "entrando como ." se o campo viesse vazio. */}
        {user && ACCOUNT_LABEL[user.userTypeAccount] && (
          <>
            {' '}
            Você está entrando como{' '}
            <span className="font-medium text-surface-800">
              {ACCOUNT_LABEL[user.userTypeAccount]}
            </span>
            .
          </>
        )}
      </p>

      {user?.userTypeAccount === 'VIEWERS' && (
        <p className="mt-4 rounded-lg border border-surface-200 bg-surface-100 px-4 py-3 text-sm text-surface-600">
          <UploadCloud size={15} className="mr-1.5 -mt-0.5 inline text-brand-link" />
          Para enviar vídeos é preciso uma conta de <strong className="text-surface-800">Criador</strong>.
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link to="/">
          <Button variant="primary">
            <ArrowLeft size={16} />
            Voltar ao início
          </Button>
        </Link>
        <Link to="/profile">
          <Button variant="secondary">Ver meu perfil</Button>
        </Link>
      </div>
    </div>
  )
}
