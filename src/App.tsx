import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  RedirectIfAuthenticated,
  RequireAdmin,
  RequireAuth,
  RequireCreator,
} from '@/components/auth/RouteGuards'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { HomePage } from '@/pages/HomePage'
import { VideoPage } from '@/pages/VideoPage'
import { UploadPage } from '@/pages/UploadPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { UserProfilePage } from '@/pages/UserProfilePage'
import { AdminPage } from '@/pages/AdminPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'

/** Toda rota privada passa por um guard.
 *
 *  Acessar a URL direto (colando no navegador) cai na mesma checagem: sem
 *  sessão vai para /login guardando o destino; com sessão mas sem o papel
 *  necessário vai para /403 com explicação. Os guards espelham as regras do
 *  SecurityConfig do backend — a autorização real continua sendo do servidor.
 */
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
        {/* Home exige sessão: GET /video hoje falha sem token. */}
        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/videos/:id" element={<VideoPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Perfil público de outra pessoa. RequireAuth basta: a rota do
              backend (GET /auth/user/{id}) libera para CREATORS e VIEWERS, que
              juntos são todos os usuários autenticados — não há papel logado
              que deva cair no 403 aqui. */}
          <Route path="/users/:id" element={<UserProfilePage />} />
        </Route>

        {/* Espelha POST /video/upload -> hasAnyRole("CREATORS","ADMIN") */}
        <Route element={<RequireCreator />}>
          <Route path="/upload" element={<UploadPage />} />
        </Route>

        {/* Espelha GET /auth/users -> hasRole("ADMIN") */}
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
