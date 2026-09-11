import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LockKeyhole, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { APP_HOME } from '@/lib/nav'

/** Parede de login para visitante que tenta abrir uma área privada.
 *
 *  Substitui o `Navigate to="/login"` nas rotas que o visitante alcança pela
 *  navegação normal (enviar vídeo, perfil, um vídeo específico). Desde que
 *  `GET /video` virou público, a home abre sem sessão — e jogar quem clica em
 *  "Perfil" direto para um formulário de login apaga a página inteira e parece
 *  que o site expulsou a pessoa. Aqui a tela pedida continua atrás do vidro:
 *  fica claro o que existe do outro lado e o que falta para chegar lá.
 *
 *  Não é controle de acesso — o que protege os dados é o backend (`GET
 *  /video/{id}`, `/auth/me` e o upload seguem exigindo token). Este componente
 *  substitui o conteúdo: nada privado é renderizado por baixo, o desfoque é
 *  puramente decorativo e o que ele desfoca é o esqueleto vazio da tela.
 *
 *  O redirect continua valendo para quem COLA a URL privada no navegador (ver
 *  RouteGuards): ali não há tela anterior nem contexto, e a página de login
 *  cheia é o destino mais direto. */
export function AuthWall({
  title,
  description,
  /** Fundo desfocado: a moldura da própria tela bloqueada, sem dado nenhum
   *  dentro. Sem isto o overlay flutua sobre um vazio e perde o sentido. */
  backdrop,
}: {
  title: string
  description: string
  backdrop?: React.ReactNode
}) {
  const location = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)

  // Mesma entrada do Modal: o foco vai para o painel, que é o que faz o leitor
  // de tela anunciar o aviso. Sem isso o foco fica no link clicado — já
  // desmontado — e a troca de tela acontece em silêncio.
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  // Destino guardado para o login devolver a pessoa à tela que ela queria.
  const from = location.pathname + location.search

  return (
    // `min-h` desconta o Header (4rem) e, abaixo de lg, também a BottomNav
    // (que é `fixed` e cobriria o rodapé do cartão). Sem os dois descontos o
    // conteúdo centrado nasce deslocado para baixo do centro visível.
    <div className="relative min-h-[calc(100dvh-9rem)] overflow-hidden lg:min-h-[calc(100dvh-4rem)]">
      {backdrop && (
        // `pointer-events-none` + aria-hidden: é cenário. Sem isso, o conteúdo
        // desfocado continuaria clicável e focável por Tab por trás do painel.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none blur-[10px] saturate-50"
        >
          {backdrop}
        </div>
      )}

      {/* Véu entre o fundo e o painel: o blur sozinho não garante contraste
          para o texto do aviso sobre uma tela clara. */}
      <div aria-hidden="true" className="absolute inset-0 bg-surface-0/70" />

      <div className="relative flex min-h-[calc(100dvh-9rem)] items-center justify-center px-4 py-10 lg:min-h-[calc(100dvh-4rem)]">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby="authwall-title"
          aria-describedby="authwall-description"
          tabIndex={-1}
          className="modal-surface w-full max-w-md rounded-2xl border border-surface-200 bg-surface-100 p-7 text-center shadow-elevated focus:outline-none sm:p-9"
        >
          {/* Sem logo aqui: o Header já mostra a marca a poucos pixels acima,
              e repetida dentro do cartão ela empurrava o título para baixo do
              centro óptico sem dizer nada de novo. */}
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-link">
            <LockKeyhole size={22} aria-hidden="true" />
          </div>

          <h1
            id="authwall-title"
            className="font-display text-xl font-extrabold tracking-tight text-surface-900 sm:text-2xl"
          >
            {title}
          </h1>
          <p
            id="authwall-description"
            className="mx-auto mt-2.5 max-w-sm text-[15px] leading-relaxed text-surface-600"
          >
            {description}
          </p>

          <div className="mt-7 flex flex-col gap-2.5">
            {/* `state.from` é o mesmo contrato que os guards usam: a LoginPage
                lê daqui para onde voltar depois de entrar. */}
            <Link to="/login" state={{ from }} className="w-full">
              <Button className="w-full">Entrar</Button>
            </Link>
            <Link to={APP_HOME} className="w-full">
              <Button variant="ghost" className="w-full">
                <ArrowLeft size={16} />
                Voltar aos vídeos
              </Button>
            </Link>
          </div>

          {/* O registro não vira botão próprio: dois botões primários lado a
              lado dividem a decisão sem necessidade. A tela de login já leva a
              "Criar conta" no rodapé dela. */}
          <p className="mt-5 text-[13px] text-surface-600">
            Ainda não tem conta? É só escolher <span className="font-medium text-surface-800">criar conta</span> na tela de login.
          </p>
        </div>
      </div>
    </div>
  )
}
