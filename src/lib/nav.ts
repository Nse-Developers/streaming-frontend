import { Home, UploadCloud, User, ShieldCheck, type LucideIcon } from 'lucide-react'
import type { useAuth } from '@/context/AuthContext'

type Auth = ReturnType<typeof useAuth>

export interface NavItem {
  to: string
  end?: boolean
  icon: LucideIcon
  label: string
  mobileLabel: string
  show?: (auth: Auth) => boolean
}

/** Para onde "voltar ao início" leva DENTRO do app.
 *
 *  Não é "/": a raiz é a LandingPage, que apresenta o produto a quem ainda não
 *  tem conta. Quem já está usando o app e clica em "voltar ao início" quer o
 *  catálogo, não a página de marketing com "Criar conta grátis".
 *
 *  Constante em vez da string solta porque nove telas dependiam dela — e no dia
 *  em que a landing entrou, todas as nove passaram a apontar para o lugar
 *  errado de uma vez. Aqui, mover o catálogo é trocar esta linha. */
export const APP_HOME = '/home'

/** Destinos da navegação (rail no desktop, barra inferior no mobile).
 *
 *  Para visitante sobra só "Início": o catálogo é a única coisa que ele pode
 *  usar de fato. Oferecer "Perfil" e "Enviar" a quem não tem conta seria
 *  prometer uma tela que o AuthWall vai barrar no clique seguinte — o convite
 *  para entrar já está no botão do Header, que é onde ele é honesto.
 *
 *  "Administração" nunca aparece sem sessão de ADMIN, pelo mesmo motivo de
 *  sempre: a existência da área não é informação para visitante. */
export const NAV_ITEMS: NavItem[] = [
  // APP_HOME e não '/': a raiz redireciona para cá quando há sessão, então o
  // NavLink `end` comparava '/' com '/home' e o item NUNCA ficava ativo — o
  // ícone ficava apagado justamente na tela principal do app, e o
  // "(página atual)" nunca era anunciado ao leitor de tela. Apontar direto
  // também evita o redirect extra, que piscava o spinner de sessão a cada
  // clique em "Início".
  { to: APP_HOME, end: true, icon: Home, label: 'Início', mobileLabel: 'Início' },
  {
    to: '/upload',
    icon: UploadCloud,
    label: 'Enviar vídeo',
    mobileLabel: 'Enviar',
    show: (auth) => auth.isCreator,
  },
  {
    to: '/profile',
    icon: User,
    label: 'Perfil',
    mobileLabel: 'Perfil',
    show: (auth) => auth.isAuthenticated,
  },
  {
    to: '/admin',
    icon: ShieldCheck,
    label: 'Administração',
    mobileLabel: 'Admin',
    show: (auth) => auth.isAdmin,
  },
]
