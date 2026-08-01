import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/layout/Logo'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useAuth, type Role } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

export function RegisterPage() {
  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', surname: '', email: '', password: '', role: 'VIEWERS' as Role })
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await login(form.email, form.role)
    showToast('Conta criada. Bem-vindo!', 'success')
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl bg-surface-100 p-6 sm:p-7">
          <h1 className="font-display text-2xl font-extrabold text-surface-900">Criar conta</h1>
          <p className="mt-1 text-sm text-surface-600">Comece a assistir e publicar em minutos.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nome" value={form.name} onChange={set('name')} />
              <Input label="Sobrenome" value={form.surname} onChange={set('surname')} />
            </div>
            <Input label="E-mail" type="email" value={form.email} onChange={set('email')} />
            <Input label="Senha" type="password" value={form.password} onChange={set('password')} />
            <Select label="Tipo de conta" value={form.role} onChange={set('role')}>
              <option value="VIEWERS">Espectador</option>
              <option value="CREATORS">Criador de conteúdo</option>
            </Select>

            <Button type="submit" size="lg" isLoading={loading} className="w-full">
              Criar conta
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-surface-600">
          Já tem conta?{' '}
          <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
