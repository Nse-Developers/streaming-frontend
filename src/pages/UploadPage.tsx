import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileVideo, Image as ImageIcon, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { FileDropzone } from '@/components/ui/FileDropzone'
import { useToast } from '@/context/ToastContext'
import { useUploadVideo } from '@/hooks/useVideos'
import { useCategories } from '@/hooks/useCategories'

export function UploadPage() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const upload = useUploadVideo()
  const { data: categories } = useCategories()

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [titulo, setTitulo] = useState('')
  const [sinopse, setSinopse] = useState('')
  const [category, setCategory] = useState('Documentário')
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  // Progresso simulado enquanto o backend de upload real não está integrado.
  useEffect(() => {
    if (!isUploading) return
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 100
        return Math.min(100, p + Math.random() * 18)
      })
    }, 260)
    return () => clearInterval(interval)
  }, [isUploading])

  useEffect(() => {
    if (progress < 100 || !isUploading) return
    setIsUploading(false)
    upload.mutate(
      { titulo, sinopse, category },
      {
        onSuccess: () => {
          showToast('Vídeo enviado! Salvo como rascunho.', 'success')
          navigate('/profile')
        },
      },
    )
  }, [progress, isUploading, titulo, sinopse, category, upload, showToast, navigate])

  const canSubmit = titulo.trim() && videoFile

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) {
      showToast('Escolha um arquivo de vídeo e dê um título.', 'error')
      return
    }
    setProgress(0)
    setIsUploading(true)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6">
      <h1 className="font-display text-2xl font-extrabold text-surface-900">Enviar vídeo</h1>
      <p className="mt-1 text-sm text-surface-600">
        Seu vídeo entra como rascunho. Você publica quando quiser, pelo seu perfil.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FileDropzone
            label="Arquivo de vídeo"
            accept="video/*"
            file={videoFile}
            onChange={setVideoFile}
            hint="MP4 ou WebM, até 5 GB"
            icon={<FileVideo size={26} className="text-surface-600" />}
          />
          <FileDropzone
            label="Thumbnail"
            accept="image/*"
            file={thumbFile}
            onChange={setThumbFile}
            hint="JPG ou PNG, 1280×720"
            icon={<ImageIcon size={26} className="text-surface-600" />}
            showImagePreview
          />
        </div>

        <Input
          label="Título"
          placeholder="Um título que diga do que se trata"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <Textarea
          label="Descrição"
          placeholder="Conte o que as pessoas vão encontrar neste vídeo..."
          value={sinopse}
          onChange={(e) => setSinopse(e.target.value)}
        />

        <Select label="Categoria" value={category} onChange={(e) => setCategory(e.target.value)}>
          {(categories ?? []).map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </Select>

        {(isUploading || upload.isPending) && (
          <div className="rounded-xl bg-surface-100 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-surface-900">
                {progress >= 100 ? 'Processando...' : 'Enviando arquivo'}
              </span>
              <span className="tabular-nums text-surface-600">{Math.round(progress)}%</span>
            </div>
            <ProgressBar value={progress} />
            {videoFile && (
              <p className="mt-2 truncate text-xs text-surface-600">
                {videoFile.name} · {(videoFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-surface-200 pt-5">
          <p className="flex items-center gap-1.5 text-xs text-surface-600">
            <CheckCircle2 size={14} />
            Salvo automaticamente como rascunho
          </p>
          <Button type="submit" size="lg" isLoading={isUploading || upload.isPending} disabled={!canSubmit}>
            Enviar vídeo
          </Button>
        </div>
      </form>
    </div>
  )
}
