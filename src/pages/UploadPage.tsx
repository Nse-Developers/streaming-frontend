import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Film, Image as ImageIcon, UploadCloud, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { FileDropzone } from '@/components/ui/FileDropzone'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useUploadVideo, type UploadPhase } from '@/hooks/useVideos'
import { useToast } from '@/context/ToastContext'
import { toErrorMessage } from '@/api/client'
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  resolveVideoContentType,
  uploadSchema,
  validateThumbnailFile,
  validateVideoFile,
  type UploadValues,
} from '@/lib/validation'

/** Texto de cada fase do upload em três passos.
 *
 *  Só a fase `uploading` tem progresso real: as outras duas são chamadas
 *  curtas à API. Por isso a barra some fora dela — uma barra parada em 100%
 *  durante o confirm parece travada. */
const PHASE_LABEL: Record<Exclude<UploadPhase, 'idle'>, string> = {
  preparing: 'Preparando envio…',
  uploading: 'Enviando o vídeo…',
  confirming: 'Confirmando no servidor…',
  done: 'Concluído',
}

const STATUS_OPTIONS = [
  { value: 'PUBLISHED', label: 'Publicar agora — visível para todos' },
  { value: 'DRAFT', label: 'Salvar como rascunho — só você vê' },
  { value: 'PRIVATE', label: 'Privado — não aparece no feed' },
] as const

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function UploadPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const upload = useUploadVideo()

  const [file, setFile] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [thumbError, setThumbError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<UploadPhase>('idle')
  /** Permite abortar o PUT em andamento. O `signal` já era aceito pelo hook e
   *  pelo serviço — só ninguém o fornecia, então um envio de até 2 GB, uma vez
   *  começado, não tinha como ser interrompido pela interface: o botão de
   *  cancelar ficava desabilitado e a própria tela pedia para não fechar a
   *  página. A saída era abandonar a aba. */
  const abortRef = useRef<AbortController | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { title: '', description: '', status: 'PUBLISHED' },
  })

  const pickVideo = (next: File | null) => {
    setFile(next)
    setFileError(next ? validateVideoFile(next) : null)
  }

  const pickThumbnail = (next: File | null) => {
    setThumbnail(next)
    setThumbError(next ? validateThumbnailFile(next) : null)
  }

  /** Valida os arquivos, que vivem fora do react-hook-form.
   *  Roda também quando o RHF barra o submit por erro nos campos de texto —
   *  senão o usuário corrigiria o título e só então descobriria que faltam
   *  arquivos. */
  const checkFiles = () => {
    const videoProblem = validateVideoFile(file)
    const thumbProblem = validateThumbnailFile(thumbnail)
    setFileError(videoProblem)
    setThumbError(thumbProblem)
    return !videoProblem && !thumbProblem
  }

  const onSubmit = async (values: UploadValues) => {
    if (!checkFiles() || !file || !thumbnail) return

    // Reconfirmado aqui, e não só dentro de validateVideoFile, porque este é o
    // valor que vai para o metadata E para o header do PUT. Sem contentType
    // válido não há upload possível — barrar antes de gastar a rede.
    const contentType = resolveVideoContentType(file)
    if (!contentType) {
      setFileError('Formato não aceito. Use MP4, WebM, MOV ou MKV.')
      return
    }

    setFormError(null)
    setProgress(0)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await upload.mutateAsync({
        signal: controller.signal,
        metadata: {
          title: values.title,
          description: values.description,
          contentType,
        },
        file,
        thumbnail,
        status: values.status,
        onPhase: setPhase,
        onProgress: setProgress,
      })
      showToast(
        values.status === 'DRAFT'
          ? 'Rascunho salvo com sucesso!'
          : 'Vídeo enviado com sucesso!',
        'success',
      )
      navigate('/profile', { replace: true })
    } catch (error) {
      // Cancelamento é escolha do usuário, não falha: um alerta vermelho
      // "cancelado" acusaria a pessoa de um erro que ela não cometeu.
      if (controller.signal.aborted) {
        showToast('Envio cancelado.', 'info')
      } else {
        setFormError(toErrorMessage(error))
      }
      setProgress(0)
      setPhase('idle')
    } finally {
      abortRef.current = null
    }
  }

  const isUploading = upload.isPending

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-7">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/12 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-link">
          <UploadCloud size={12} />
          Novo vídeo
        </span>
        <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-surface-900 sm:text-3xl">
          Enviar um vídeo
        </h1>
        <p className="mt-1.5 text-[15px] text-surface-600">
          O arquivo e a imagem de capa são obrigatórios. Você pode publicar direto ou guardar como
          rascunho.
        </p>
      </header>

      {formError && (
        <Alert tone="error" focusOnMount className="mb-5">
          {formError}
        </Alert>
      )}

      <form
        onSubmit={handleSubmit(onSubmit, checkFiles)}
        noValidate
        className="space-y-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FileDropzone
              label="Arquivo de vídeo"
              accept={ACCEPTED_VIDEO_TYPES.join(',')}
              file={file}
              onChange={pickVideo}
              hint="MP4, WebM, MOV ou MKV — até 2 GB"
              icon={<Film size={26} className="text-surface-600" />}
              // Vai como prop para o erro ficar ligado ao input por
              // aria-describedby, em vez de ser um parágrafo solto ao lado.
              error={fileError ?? undefined}
            />
            {file && !fileError && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-success-ink">
                <CheckCircle2 size={13} aria-hidden="true" />
                {formatBytes(file.size)}
              </p>
            )}
          </div>

          <div>
            <FileDropzone
              label="Imagem de capa"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              file={thumbnail}
              onChange={pickThumbnail}
              hint="JPG, PNG, WebP ou AVIF — até 2 MB"
              icon={<ImageIcon size={26} className="text-surface-600" />}
              showImagePreview
              error={thumbError ?? undefined}
            />
          </div>
        </div>

        <Input
          label="Título"
          placeholder="Um título claro e direto"
          error={errors.title?.message}
          {...register('title')}
        />

        <Textarea
          label="Descrição"
          rows={5}
          placeholder="Do que se trata o vídeo? O que o espectador vai encontrar?"
          error={errors.description?.message}
          {...register('description')}
        />

        <Select label="Visibilidade" error={errors.status?.message} {...register('status')}>
          {STATUS_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        {isUploading && phase !== 'idle' && (
          <div className="rounded-xl border border-surface-200 bg-surface-100 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-surface-800">{PHASE_LABEL[phase]}</span>
              {phase === 'uploading' && (
                <span className="font-semibold tabular-nums text-brand-link">{progress}%</span>
              )}
            </div>
            {/* A barra só aparece na fase que tem progresso medível. Nas outras
                duas o indeterminado é honesto: são chamadas curtas à API, sem
                percentual algum a mostrar. */}
            {phase === 'uploading' ? (
              <ProgressBar value={progress} label="Enviando o vídeo" />
            ) : (
              <div className="h-2 overflow-hidden rounded-full bg-surface-200">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-500" />
              </div>
            )}
            {/* Anuncia em marcos de 25%, não a cada 1%: a barra atualiza dezenas
                de vezes e um live region a cada ponto percentual tornaria o
                leitor de tela inutilizável. */}
            <p role="status" className="sr-only">
              {phase === 'uploading'
                ? `Envio em ${Math.floor(progress / 25) * 25} por cento.`
                : PHASE_LABEL[phase]}
            </p>
            <p className="mt-2 text-xs text-surface-600">
              Não feche esta página até o envio terminar. Para interromper, use
              “Cancelar envio”.
            </p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {/* Durante o envio este botão ABORTA em vez de sair da tela: sair
              deixaria o PUT correndo em segundo plano sem nada para
              acompanhá-lo. O rótulo muda junto com a ação — um botão que faz
              duas coisas diferentes precisa dizer qual delas fará agora. */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (isUploading) abortRef.current?.abort()
              else navigate(-1)
            }}
          >
            {isUploading ? 'Cancelar envio' : 'Cancelar'}
          </Button>
          <Button type="submit" size="lg" isLoading={isUploading}>
            {!isUploading && <UploadCloud size={17} />}
            Enviar vídeo
          </Button>
        </div>
      </form>
    </div>
  )
}
