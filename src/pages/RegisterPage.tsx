import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronDown, Eye, UploadCloud } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { toErrorMessage } from '@/api/client'
import { registerSchema, type RegisterValues } from '@/lib/validation'
import { cn } from '@/lib/cn'

const ACCOUNT_TYPES = [
  {
    value: 'VIEWERS' as const,
    icon: Eye,
    label: 'Quero assistir',
    hint: 'Assiste, comenta e segue criadores.',
  },
  {
    value: 'CREATORS' as const,
    icon: UploadCloud,
    label: 'Quero publicar',
    hint: 'Envia vídeos e gerencia o próprio catálogo.',
  },
]

/** Requisitos da senha mostrados ao vivo — evita descobrir a regra só no erro. */
const PASSWORD_RULES = [
  { test: (v: string) => v.length >= 8, label: '8+ caracteres' },
  { test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v), label: 'Maiúscula e minúscula' },
  { test: (v: string) => /[0-9]/.test(v), label: 'Um número' },
  { test: (v: string) => /[^A-Za-z0-9]/.test(v), label: 'Um símbolo' },
]

export function RegisterPage() {
  const { register: createAccount } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const [formError, setFormError] = useState<string | null>(null)
  const [showOptional, setShowOptional] = useState(false)

  const from = (location.state as { from?: string } | null)?.from

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    // Todos os campos começam como string vazia: as colunas bio/profilePhoto/
    // state/country são NOT NULL no banco e um null causa 500 no backend.
    defaultValues: {
      name: '',
      surname: '',
      email: '',
      password: '',
      confirmPassword: '',
      userTypeAccount: 'VIEWERS',
      bio: '',
      state: '',
      country: '',
      linkInstagram: '',
      linkYoutube: '',
      linkWebsite: '',
    },
  })

  const accountType = watch('userTypeAccount')
  const password = watch('password') ?? ''

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null)
    try {
      const { confirmPassword: _ignored, ...payload } = values
      // `profilePhoto` saiu do formulário (vai ganhar um fluxo de upload), mas
      // a coluna é NOT NULL no banco: omitir causaria 500 no registro.
      await createAccount({ ...payload, profilePhoto: '' })
      showToast('Conta criada. Bem-vindo!', 'success')
      navigate(from ?? '/', { replace: true })
    } catch (error) {
      setFormError(toErrorMessage(error))
    }
  }

  return (
    <AuthShell
      wide
      title="Criar sua conta"
      subtitle="Leva menos de um minuto."
      footer={
        <>
          Já tem uma conta?{' '}
          <Link
            to="/login"
            state={from ? { from } : undefined}
            className="font-semibold text-brand-link hover:underline"
          >
            Entrar
          </Link>
        </>
      }
    >
      {formError && (
        <Alert tone="error" className="mb-5">
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Tipo de conta primeiro: define o que o usuário poderá fazer. */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-surface-700">Como você vai usar?</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {ACCOUNT_TYPES.map(({ value, icon: Icon, label, hint }) => {
              const selected = accountType === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('userTypeAccount', value, { shouldValidate: true })}
                  aria-pressed={selected}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors duration-150 focus-ring',
                    selected
                      ? 'border-brand-500 bg-brand-500/8'
                      : 'border-surface-300 hover:border-surface-400',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      selected ? 'bg-brand-500 text-white' : 'bg-surface-200 text-surface-600',
                    )}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block text-sm font-semibold',
                        selected ? 'text-brand-link' : 'text-surface-900',
                      )}
                    >
                      {label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-surface-600">
                      {hint}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nome"
            autoComplete="given-name"
            placeholder="Maria"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Sobrenome"
            autoComplete="family-name"
            placeholder="Silva"
            error={errors.surname?.message}
            {...register('surname')}
          />
        </div>

        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@email.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput
            label="Senha"
            autoComplete="new-password"
            placeholder="Crie uma senha forte"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordInput
            label="Confirmar senha"
            autoComplete="new-password"
            placeholder="Repita a senha"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        {password.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {PASSWORD_RULES.map(({ test, label }) => {
              const ok = test(password)
              return (
                <li
                  key={label}
                  className={cn(
                    'flex items-center gap-1.5 text-xs',
                    ok ? 'text-success-500' : 'text-surface-600',
                  )}
                >
                  <Check size={13} className={ok ? 'opacity-100' : 'opacity-30'} />
                  {label}
                </li>
              )
            })}
          </ul>
        )}

        {/* Campos opcionais escondidos: mantêm o formulário curto no celular. */}
        <div className="rounded-xl border border-surface-200">
          <button
            type="button"
            onClick={() => setShowOptional((open) => !open)}
            aria-expanded={showOptional}
            className="flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left focus-ring"
          >
            <span>
              <span className="block text-sm font-medium text-surface-800">
                Completar perfil agora
              </span>
              <span className="block text-xs text-surface-600">
                Bio, localização e redes sociais — opcional
              </span>
            </span>
            <ChevronDown
              size={17}
              className={cn(
                'shrink-0 text-surface-600 transition-transform duration-200',
                showOptional && 'rotate-180',
              )}
            />
          </button>

          {showOptional && (
            <div className="space-y-4 border-t border-surface-200 p-4">
              <Textarea
                label="Bio"
                rows={3}
                placeholder="Conte em poucas linhas o que você faz."
                error={errors.bio?.message}
                {...register('bio')}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Estado"
                  placeholder="São Paulo"
                  error={errors.state?.message}
                  {...register('state')}
                />
                <Input
                  label="País"
                  placeholder="Brasil"
                  error={errors.country?.message}
                  {...register('country')}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Instagram"
                  type="url"
                  inputMode="url"
                  placeholder="https://instagram.com/voce"
                  error={errors.linkInstagram?.message}
                  {...register('linkInstagram')}
                />
                <Input
                  label="YouTube"
                  type="url"
                  inputMode="url"
                  placeholder="https://youtube.com/@voce"
                  error={errors.linkYoutube?.message}
                  {...register('linkYoutube')}
                />
              </div>
            </div>
          )}
        </div>

        <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
          Criar conta
        </Button>
      </form>
    </AuthShell>
  )
}
