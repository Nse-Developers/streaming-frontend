import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  /** Marca o campo como dispensável: mostra a etiqueta "Opcional" ao lado do
   *  rótulo. Existe porque um campo em branco no meio de outros obrigatórios
   *  parece um esquecimento — o usuário para para decidir se pode seguir. */
  optional?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, optional, id, className, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? props.name ?? generatedId
    /** `aria-describedby` liga a mensagem ao campo. Sem ele o leitor de tela
     *  anunciava "inválido" e nunca o motivo: o texto do erro ficava como
     *  parágrafo solto, alcançável só saindo do modo de formulário. */
    const msgId = `${inputId}-msg`
    const optionalId = `${inputId}-optional`
    /* A etiqueta "Opcional" entra como DESCRIÇÃO, e não dentro do <label>: no
       nome do campo o leitor anunciaria "Sobrenome Opcional" como se fosse o
       rótulo. Como descrição, vem depois — "Sobrenome, edição, Opcional".
       Erro e dica se excluem (só um <p> é renderizado), então no máximo dois
       ids entram aqui. */
    const describedBy =
      [optional ? optionalId : null, error || hint ? msgId : null].filter(Boolean).join(' ') ||
      undefined
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          /* `flex-wrap` + `gap`: em telas muito estreitas (ou com a fonte do
             sistema aumentada) a etiqueta desce para a linha de baixo em vez de
             comprimir o rotulo ou vazar do card. `items-baseline` alinha os dois
             textos pela base enquanto couberem na mesma linha. */
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <label htmlFor={inputId} className="text-sm font-medium text-surface-700">
              {label}
            </label>
            {optional && (
              /* Etiqueta visível, e não apenas um "(opcional)" no placeholder:
                 o placeholder desaparece na primeira tecla e não é lido por quem
                 preenche com autocompletar. */
              <span
                id={optionalId}
                className="rounded-full bg-surface-200 px-2 py-0.5 text-[11px] font-medium leading-tight text-surface-600"
              >
                Opcional
              </span>
            )}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-11 min-h-[44px] w-full rounded-lg border bg-surface-100 px-3.5 text-[15px] text-surface-900 placeholder:text-surface-600 transition-colors duration-150 focus-ring',
            error ? 'border-danger-500/60' : 'border-surface-300 hover:border-surface-400 focus:border-brand-400',
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
        {error ? (
          <p id={msgId} className="text-xs font-medium text-danger-ink">
            {error}
          </p>
        ) : hint ? (
          <p id={msgId} className="text-xs text-surface-600">
            {hint}
          </p>
        ) : null}
      </div>
    )
  },
)
Input.displayName = 'Input'
