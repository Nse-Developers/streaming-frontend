import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  RedirectIfAuthenticated,
  RequireAdmin,
  RequireAuth,
  RequireAuthPlayer,
  RequireCreator,
} from '@/components/auth/RouteGuards'
import { Spinner } from '@/components/ui/Spinner'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { HomePage } from '@/pages/HomePage'
import { VideoPage } from '@/pages/VideoPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { UserProfilePage } from '@/pages/UserProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'

/** Telas carregadas SÓ quando a rota é aberta.
 *
 *  Estas duas estão atrás de um guard de papel, então a maioria dos visitantes
 *  nunca as abre — mas o código ia no mesmo arquivo para todo mundo. AdminPage
 *  é a maior tela do app (28 KB de fonte, mais o que ela arrasta de
 *  formulário/modal) e só ADMIN chega nela; UploadPage só CREATORS.
 *
 *  O import dinâmico é o que faz o Vite emitir um chunk separado. Login, home e
 *  vídeo ficam estáticos de propósito: são o caminho de entrada, e adiar o
 *  código deles só adicionaria um ida-e-volta de rede antes da primeira tela. */
const UploadPage = lazy(() =>
  import('@/pages/UploadPage').then((m) => ({ default: m.UploadPage })),
)
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })))

/** Fallback enquanto o chunk da rota chega. Ocupa a altura de uma tela para o
 *  layout não "pular" quando o conteúdo entra. */
function RouteFallback() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center" role="status" aria-live="polite">
      <Spinner size={28} />
      <span className="sr-only">Carregando…</span>
    </div>
  )
}

/** Só a home é aberta; toda outra rota passa por um guard.
 *
 *  Sem sessão, o guard não redireciona: mostra o AuthWall — a tela pedida
 *  desfocada com um aviso de login por cima (ver RouteGuards). O visitante
 *  chega nessas rotas clicando, e trocar a tela dele por um formulário apaga o
 *  contexto. Com sessão mas sem o papel necessário, continua indo para /403,
 *  que explica qual papel falta.
 *
 *  Os guards espelham as regras do SecurityConfig do backend — a autorização
 *  real continua sendo do servidor. O que muda aqui é só o que se DESENHA:
 *  nenhum dado privado chega ao navegador de quem não tem sessão. */
export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuthenticated>
            <RegisterPage />
          </RedirectIfAuthenticated>
        }
      />

      <Route element={<AppLayout withSearch />}>
        {/* Home ABERTA: GET /video é público, então quem chega pela primeira
            vez cai no catálogo em vez de num formulário de login. É a vitrine
            do produto — pedir credencial antes de mostrar qualquer coisa é o
            que fazia o site parecer fechado para quem só queria olhar. */}
        <Route path="/" element={<HomePage />} />

        {/* O player continua exigindo sessão porque GET /video/{id} exige: é
            ele que devolve a URL assinada de reprodução. Ver as capas é
            público; dar play não. */}
        <Route element={<RequireAuthPlayer />}>
          <Route path="/videos/:id" element={<VideoPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/profile" element={<ProfilePage />} />
          {/* Perfil público de outra pessoa. RequireAuth basta: a rota do
              backend (GET /auth/user/{id}) libera para CREATORS e VIEWERS, que
              juntos são todos os usuários autenticados — não há papel logado
              que deva cair no 403 aqui. */}
          <Route path="/users/:id" element={<UserProfilePage />} />
        </Route>

        {/* Espelha POST /video/upload -> hasAnyRole("CREATORS","ADMIN") */}
        <Route element={<RequireCreator />}>
          <Route
            path="/upload"
            element={
              <Suspense fallback={<RouteFallback />}>
                <UploadPage />
              </Suspense>
            }
          />
        </Route>

        {/* Espelha GET /auth/users -> hasRole("ADMIN") */}
        <Route element={<RequireAdmin />}>
          <Route
            path="/admin"
            element={
              <Suspense fallback={<RouteFallback />}>
                <AdminPage />
              </Suspense>
            }
          />
        </Route>

        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
