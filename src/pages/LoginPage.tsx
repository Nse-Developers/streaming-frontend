import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/context/AuthContext'
import { toErrorMessage } from '@/api/client'
import { loginSchema, type LoginValues } from '@/lib/validation'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  // Destino original guardado pelo guard quando a URL privada foi acessada direto.
  const from = (location.state as { from?: string } | null)?.from

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginValues) => {
    setFormError(null)
    try {
      await login(values.email, values.password)
      navigate(from ?? '/', { replace: true })
    } catch (error) {
      setFormError(toErrorMessage(error))
    }
  }

  return (
    <AuthShell
      title="Entrar"
      footer={
        <>
          Não tem uma conta?{' '}
          <Link
            to="/register"
            state={from ? { from } : undefined}
            className="font-semibold text-brand-link hover:underline"
          >
            Criar conta
          </Link>
        </>
      }
    >
      {from && !formError && (
        <Alert tone="warning" className="mb-5">
          Entre na sua conta para acessar esta página.
        </Alert>
      )}

      {formError && (
        <Alert tone="error" focusOnMount className="mb-5">
          {formError}
          {/* O aviso de "entre para acessar esta página" some quando há erro
              (para não empilhar dois alertas), e com ele sumia o motivo de o
              usuário estar aqui. A frase volta como complemento do erro, então
              o destino pretendido continua na tela sem um segundo bloco. */}
          {from && (
            <span className="mt-1 block text-xs opacity-90">
              Você será levado à página que tentou abrir assim que entrar.
            </span>
          )}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@email.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordInput
          label="Senha"
          autoComplete="current-password"
          placeholder="Sua senha"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
          {!isSubmitting && <ArrowRight size={17} />}
          Entrar
        </Button>
      </form>
    </AuthShell>
  )
}
