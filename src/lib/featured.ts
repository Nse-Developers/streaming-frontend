/** Escolha do vídeo em destaque da home.
 *
 *  Hoje isto é uma preferência LOCAL (localStorage): vale só no navegador onde
 *  foi marcada. Não existe rota na API para destacar um vídeo, então não há
 *  como a escolha valer para todos os visitantes — quando existir (ex.: um
 *  campo `featured` no vídeo, ou GET/PUT /config/featured), só este módulo
 *  precisa mudar; a UI já consome por aqui.
 */

const KEY = 'byou.featuredVideoId'

export function getFeaturedVideoId(): number | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const id = Number(raw)
    return Number.isInteger(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export function setFeaturedVideoId(id: number | null) {
  try {
    if (id === null) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, String(id))
  } catch {
    /* modo privado: a escolha só vale nesta aba */
  }
}
