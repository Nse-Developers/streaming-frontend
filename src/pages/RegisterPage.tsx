import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronDown, Circle, Eye, UploadCloud } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { PolicyDialog } from '@/components/auth/PolicyDialog'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { toErrorMessage } from '@/api/client'
import { MIN_AGE_YEARS, registerSchema, type RegisterValues } from '@/lib/validation'
import { getPolicy, type Policy } from '@/lib/policies'
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

/** Hoje em `YYYY-MM-DD` para o `max` do seletor de data.
 *
 *  Montado a partir das partes LOCAIS da data (`getFullYear`/`getMonth`/
 *  `getDate`), e não de `toISOString()`, que converte para UTC: no Brasil isso
 *  adiantaria o limite em um dia durante boa parte do dia. */
const TODAY_ISO = (() => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
})()

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
  /** Qual documento está aberto para leitura, ou null. */
  const [openPolicy, setOpenPolicy] = useState<Policy | null>(null)

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
      dateOfBirth: '',
      // Começa desmarcado SEMPRE: caixa pré-marcada não é aceite, e é esta
      // declaração que o servidor grava como consentimento do titular.
      // O schema exige `true`, então o tipo do formulário não admite `false`
      // aqui — `undefined` é o "ainda não respondeu" que o resolver reprova
      // com a mesma mensagem, sem precisar de cast.
      acceptedPolicies: undefined,
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

  /** Algum campo do bloco opcional foi reprovado? Só os validáveis entram: bio,
   *  estado e país não têm regra, os três links têm formato de URL. */
  const hasOptionalError = Boolean(
    errors.bio || errors.state || errors.country || errors.linkInstagram || errors.linkYoutube || errors.linkWebsite,
  )

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
        <Alert tone="error" focusOnMount className="mb-5">
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Tipo de conta primeiro: define o que o usuário poderá fazer. */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-surface-700">Como você vai usar?</legend>
          {/* Escolha ÚNICA, então `radiogroup` e não dois botões de alternância:
              com `aria-pressed` o leitor de tela anunciava dois toggles
              independentes ("pressionado"/"não pressionado"), sem dizer que
              marcar um desmarca o outro nem quantas opções existem.
              Mesmo padrão já usado nas estrelas do RatingSection: roving
              tabindex (o grupo é UMA parada de Tab) e setas para navegar. */}
          {/* Sem `aria-label` aqui: o <legend> do fieldset já nomeia o grupo, e
              os dois juntos fariam o leitor anunciar o mesmo texto duas vezes. */}
          <div role="radiogroup" className="grid gap-2.5 sm:grid-cols-2">
            {ACCOUNT_TYPES.map(({ value, icon: Icon, label, hint }, index) => {
              const selected = accountType === value
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  id={`conta-${value}`}
                  onKeyDown={(event) => {
                    const delta =
                      event.key === 'ArrowRight' || event.key === 'ArrowDown'
                        ? 1
                        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                          ? -1
                          : 0
                    if (delta === 0) return
                    event.preventDefault()
                    const next = (index + delta + ACCOUNT_TYPES.length) % ACCOUNT_TYPES.length
                    setValue('userTypeAccount', ACCOUNT_TYPES[next].value, { shouldValidate: true })
                    document.getElementById(`conta-${ACCOUNT_TYPES[next].value}`)?.focus()
                  }}
                  onClick={() => setValue('userTypeAccount', value, { shouldValidate: true })}
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

        {/* Data de nascimento: campo obrigatório desde que o cadastro passou a
            exigir idade mínima. `type="date"` entrega o formato YYYY-MM-DD que
            a API espera, e o seletor nativo do sistema junto.
            `max` impede escolher uma data futura pelo próprio seletor — a
            validação ainda cobre quem digita à mão. */}
        <Input
          label="Data de nascimento"
          type="date"
          autoComplete="bday"
          max={TODAY_ISO}
          hint={`É preciso ter ${MIN_AGE_YEARS} anos ou mais.`}
          error={errors.dateOfBirth?.message}
          {...register('dateOfBirth')}
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

        {/* Sempre visível, não só depois da primeira tecla: as regras eram
            reveladas quando o usuário JÁ estava digitando, então ele escolhia
            uma senha e só então descobria as exigências.
            `aria-live` porque os itens viram "atendido" conforme se digita —
            sem isso, quem usa leitor de tela precisaria voltar até a lista para
            saber se progrediu. */}
        <ul aria-live="polite" className="flex flex-wrap gap-x-4 gap-y-1.5">
            {PASSWORD_RULES.map(({ test, label }) => {
              const ok = test(password)
              return (
                <li
                  key={label}
                  className={cn(
                    'flex items-center gap-1.5 text-xs',
                    ok ? 'text-success-ink' : 'text-surface-600',
                  )}
                >
                  {/* Ícones DIFERENTES, não o mesmo com opacidade menor: antes
                      o único sinal de "atendido" era a cor e a transparência do
                      Check — invisível para quem não distingue as duas cores, e
                      inexistente para leitor de tela. */}
                  {ok ? (
                    <Check size={13} aria-hidden="true" />
                  ) : (
                    <Circle size={13} aria-hidden="true" />
                  )}
                  {label}
                  <span className="sr-only">{ok ? '(atendido)' : '(pendente)'}</span>
                </li>
              )
            })}
        </ul>

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

          {/* Abre sozinho quando a validação reprova algo aqui dentro.
              O painel é DESMONTADO quando fechado, então um link inválido em
              "Instagram" bloqueava o envio com a mensagem de erro dentro de um
              bloco invisível: clicar em "Criar conta" simplesmente não fazia
              nada, sem dizer por quê. */}
          {(showOptional || hasOptionalError) && (
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

        {/* Aceite. Fica imediatamente antes do botão, o último passo antes de
            criar a conta, e é o que o servidor grava junto da versão vigente
            dos documentos. */}
        <Checkbox
          label={
            <>
              Li e aceito os{' '}
              <button
                type="button"
                onClick={() => setOpenPolicy(getPolicy('terms'))}
                className="font-semibold text-brand-link underline underline-offset-2 hover:no-underline focus-ring"
              >
                termos de uso
              </button>{' '}
              e a{' '}
              <button
                type="button"
                onClick={() => setOpenPolicy(getPolicy('privacy'))}
                className="font-semibold text-brand-link underline underline-offset-2 hover:no-underline focus-ring"
              >
                política de privacidade
              </button>
              .
            </>
          }
          error={errors.acceptedPolicies?.message}
          {...register('acceptedPolicies')}
        />

        {/* O botão NÃO fica desabilitado quando falta o aceite: um botão inerte
            não diz o que está faltando, e o motivo some para quem usa leitor de
            tela. Enviar com a caixa vazia reprova na validação e a mensagem
            aparece presa ao próprio campo. */}
        <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
          Criar conta
        </Button>
      </form>

      <PolicyDialog policy={openPolicy} onClose={() => setOpenPolicy(null)} />
    </AuthShell>
  )
}
