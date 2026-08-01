import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/layout/Logo'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth, type Role } from '@/context/AuthContext'
import { cn } from '@/lib/cn'

const ROLES: Array<{ key: Role; label: string; hint: string }> = [
  { key: 'VIEWERS', label: 'Espectador', hint: 'Assiste e comenta' },
  { key: 'CREATORS', label: 'Criador', hint: 'Publica vídeos' },
  { key: 'ADMIN', label: 'Admin', hint: 'Gerencia tudo' },
]

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('contato@estudiobravo.com')
  const [password, setPassword] = useState('••••••••')
  const [role, setRole] = useState<Role>('CREATORS')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await login(email, role)
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl bg-surface-100 p-6 sm:p-7">
          <h1 className="font-display text-2xl font-extrabold text-surface-900">Bem-vindo de volta</h1>
          <p className="mt-1 text-sm text-surface-600">Entre para continuar assistindo.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

            <div>
              <p className="mb-2 text-sm font-medium text-surface-700">Entrar como</p>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRole(r.key)}
                    className={cn(
                      'rounded-lg border px-2 py-2.5 text-center transition-colors duration-150 focus-ring',
                      role === r.key
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-surface-300 hover:border-surface-400',
                    )}
                  >
                    <span
                      className={cn(
                        'block text-xs font-semibold',
                        role === r.key ? 'text-brand-400' : 'text-surface-800',
                      )}
                    >
                      {r.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-tight text-surface-600">{r.hint}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-surface-500">
                Protótipo: qualquer credencial entra. O papel define o que aparece na navegação.
              </p>
            </div>

            <Button type="submit" size="lg" isLoading={loading} className="w-full">
              Entrar
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-surface-600">
          Não tem conta?{' '}
          <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
