import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <Compass size={40} className="text-surface-600" />
      <h1 className="font-display text-2xl font-bold text-surface-900">Página não encontrada</h1>
      <p className="text-sm text-surface-600">O conteúdo que você procura não existe ou foi movido.</p>
      <Link to="/">
        <Button className="mt-2">Voltar para o início</Button>
      </Link>
    </div>
  )
}
