import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface FileDropzoneProps {
  accept: string
  file: File | null
  onChange: (file: File | null) => void
  label: string
  hint?: string
  icon?: ReactNode
  showImagePreview?: boolean
  /** Mensagem de erro. Fica ligada ao input por aria-describedby — quem usa
   *  leitor de tela ouve o motivo junto do campo, não como texto solto. */
  error?: string
}

export function FileDropzone({
  accept,
  file,
  onChange,
  label,
  hint,
  icon,
  showImagePreview,
  error,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputId = useId()
  const msgId = `${inputId}-msg`

  useEffect(() => {
    if (!showImagePreview || !file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, showImagePreview])

  return (
    <div>
      {/* <label> de verdade, não um <p>: é o que liga o texto ao input e faz o
          clique em qualquer ponto da área abrir o seletor de arquivo sem
          precisar de onClick manual. */}
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-surface-700">
        {label}
      </label>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          const dropped = e.dataTransfer.files[0]
          if (dropped) onChange(dropped)
        }}
        className={cn(
          'flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors duration-150',
          // O anel de foco vive aqui, no alvo visível: o input é sr-only, então
          // sem isto o foco de teclado não apareceria em lugar nenhum.
          'has-[:focus-visible]:border-brand-400 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface-0',
          isDragging ? 'border-brand-400 bg-brand-500/5' : 'border-surface-300 hover:border-surface-400',
          error && 'border-danger-500/60',
        )}
      >
        {/* sr-only e NÃO `hidden`: `display:none` tira o input da ordem de foco,
            e como a área clicável era uma <div> sem tabIndex, escolher o vídeo
            e a capa era impossível só com teclado — o upload ficava
            intransponível. Assim o input segue focável e operável por Enter,
            sem aparecer na tela. */}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? msgId : undefined}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />

        {file ? (
          previewUrl ? (
            <img
              src={previewUrl}
              // O nome do arquivo é a única confirmação de que a imagem certa
              // foi escolhida; com alt="" quem usa leitor de tela não tem essa
              // confirmação em nenhum lugar da tela.
              alt={`Capa selecionada: ${file.name}`}
              className="h-24 rounded-lg object-cover"
            />
          ) : (
            <div className="flex max-w-full items-center gap-2 rounded-lg bg-surface-200 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-surface-800">
                {file.name}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  // Sem isto o clique sobe para o <label> e reabre o seletor de
                  // arquivo logo depois de limpar a escolha.
                  e.preventDefault()
                  e.stopPropagation()
                  onChange(null)
                  inputRef.current?.focus()
                }}
                className="-m-1 shrink-0 rounded-md p-2 text-surface-600 hover:text-danger-ink focus-ring"
                aria-label={`Remover ${file.name}`}
              >
                <X size={14} />
              </button>
            </div>
          )
        ) : (
          <>
            {icon ?? <UploadCloud size={26} className="text-surface-600" aria-hidden="true" />}
            <p className="text-sm font-medium text-surface-700">Arraste ou clique para selecionar</p>
            {hint && <p className="text-xs text-surface-600">{hint}</p>}
          </>
        )}
      </label>

      {(error || hint) && (
        <p
          id={msgId}
          className={cn('mt-1.5 text-xs font-medium', error ? 'text-danger-ink' : 'sr-only')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
