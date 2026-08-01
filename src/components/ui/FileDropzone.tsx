import { useEffect, useRef, useState, type ReactNode } from 'react'
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
}

export function FileDropzone({ accept, file, onChange, label, hint, icon, showImagePreview }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
      <p className="mb-1.5 text-sm font-medium text-surface-700">{label}</p>
      <div
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
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors duration-150',
          isDragging ? 'border-brand-400 bg-brand-500/5' : 'border-surface-300 hover:border-surface-400',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />

        {file ? (
          previewUrl ? (
            <img src={previewUrl} alt="" className="h-24 rounded-lg object-cover" />
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-surface-200 px-3 py-2">
              <span className="max-w-[220px] truncate text-sm font-medium text-surface-800">{file.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(null)
                }}
                className="text-surface-600 hover:text-danger-400"
                aria-label="Remover arquivo"
              >
                <X size={14} />
              </button>
            </div>
          )
        ) : (
          <>
            {icon ?? <UploadCloud size={26} className="text-surface-600" />}
            <p className="text-sm font-medium text-surface-700">Arraste ou clique para selecionar</p>
            {hint && <p className="text-xs text-surface-600">{hint}</p>}
          </>
        )}
      </div>
    </div>
  )
}
