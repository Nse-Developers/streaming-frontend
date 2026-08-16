import { useState } from 'react'
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
import { useUploadVideo } from '@/hooks/useVideos'
import { useToast } from '@/context/ToastContext'
import { toErrorMessage } from '@/api/client'
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  uploadSchema,
  validateThumbnailFile,
  validateVideoFile,
  type UploadValues,
} from '@/lib/validation'

/** Idioma não é escolhido na UI: o backend trata tudo como PT-BR. Enviado
 *  fixo no metadata porque o campo é obrigatório no VideoUploadRequest. */
const DEFAULT_LANGUAGE = 'PT-BR'

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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { titulo: '', description: '', status: 'PUBLISHED' },
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

    setFormError(null)
    setProgress(0)

    try {
      await upload.mutateAsync({
        metadata: {
          titulo: values.titulo,
          description: values.description,
          language: DEFAULT_LANGUAGE,
          status: values.status,
        },
        file,
        thumbnail,
        onProgress: setProgress,
      })
      showToast('Vídeo enviado com sucesso!', 'success')
      navigate('/profile', { replace: true })
    } catch (error) {
      setFormError(toErrorMessage(error))
      setProgress(0)
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
        <Alert tone="error" className="mb-5">
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
            />
            {file && !fileError && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-success-500">
                <CheckCircle2 size={13} />
                {formatBytes(file.size)}
              </p>
            )}
            {fileError && <p className="mt-1.5 text-xs font-medium text-danger-400">{fileError}</p>}
          </div>

          <div>
            <FileDropzone
              label="Imagem de capa"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              file={thumbnail}
              onChange={pickThumbnail}
              hint="JPG, PNG, WebP ou AVIF — até 15 MB"
              icon={<ImageIcon size={26} className="text-surface-600" />}
              showImagePreview
            />
            {thumbError && (
              <p className="mt-1.5 text-xs font-medium text-danger-400">{thumbError}</p>
            )}
          </div>
        </div>

        <Input
          label="Título"
          placeholder="Um título claro e direto"
          error={errors.titulo?.message}
          {...register('titulo')}
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

        {isUploading && (
          <div className="rounded-xl border border-surface-200 bg-surface-100 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-surface-800">
                {progress < 100 ? 'Enviando arquivos…' : 'Processando no servidor…'}
              </span>
              <span className="font-semibold tabular-nums text-brand-link">{progress}%</span>
            </div>
            <ProgressBar value={progress} />
            <p className="mt-2 text-xs text-surface-600">
              Não feche esta página até o envio terminar.
            </p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(-1)}
            disabled={isUploading}
          >
            Cancelar
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
