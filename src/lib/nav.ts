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

export const NAV_ITEMS: NavItem[] = [
  { to: '/', end: true, icon: Home, label: 'Início', mobileLabel: 'Início' },
  {
    to: '/upload',
    icon: UploadCloud,
    label: 'Enviar vídeo',
    mobileLabel: 'Enviar',
    show: (auth) => auth.isCreator,
  },
  { to: '/profile', icon: User, label: 'Perfil', mobileLabel: 'Perfil' },
  {
    to: '/admin',
    icon: ShieldCheck,
    label: 'Administração',
    mobileLabel: 'Admin',
    show: (auth) => auth.isAdmin,
  },
]
