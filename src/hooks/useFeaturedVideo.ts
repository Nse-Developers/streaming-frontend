import { useCallback, useEffect, useState } from 'react'
import { getFeaturedVideoId, setFeaturedVideoId } from '@/lib/featured'
import type { UiVideo } from '@/lib/video'

/** Qual vídeo abre em destaque na home, e como trocar.
 *
 *  `featured` é resolvido contra a lista atual: se o vídeo escolhido foi
 *  excluído ou despublicado, cai no primeiro da lista em vez de mostrar um
 *  buraco. */
export function useFeaturedVideo(videos: UiVideo[]) {
  const [featuredId, setFeaturedId] = useState<number | null>(() => getFeaturedVideoId())

  // Outra aba pode ter trocado o destaque.
  useEffect(() => {
    const onStorage = () => setFeaturedId(getFeaturedVideoId())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const pick = useCallback((id: number | null) => {
    setFeaturedVideoId(id)
    setFeaturedId(id)
  }, [])

  const chosen = featuredId != null ? videos.find((v) => v.id === featuredId) : undefined
  const featured = chosen ?? videos[0]
  const rest = featured ? videos.filter((v) => v !== featured) : videos

  return {
    featured,
    rest,
    /** true quando o destaque foi escolhido a dedo (e ainda existe na lista). */
    isPinned: Boolean(chosen),
    pick,
  }
}
