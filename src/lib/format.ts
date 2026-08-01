export function formatViews(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace('.', ',')} mi de visualizações`
  if (count >= 1_000) return `${Math.round(count / 1000)} mil visualizações`
  if (count === 0) return 'sem visualizações'
  return `${count} ${count === 1 ? 'visualização' : 'visualizações'}`
}

export function formatCompact(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace('.', ',')} mi`
  if (count >= 1_000) return `${(count / 1000).toFixed(count >= 10_000 ? 0 : 1).replace('.', ',')} mil`
  return String(count)
}

export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (diffDays <= 0) return 'hoje'
  if (diffDays === 1) return 'ontem'
  if (diffDays < 30) return `há ${diffDays} dias`
  const months = Math.floor(diffDays / 30)
  if (months < 12) return `há ${months} ${months === 1 ? 'mês' : 'meses'}`
  const years = Math.floor(months / 12)
  return `há ${years} ${years === 1 ? 'ano' : 'anos'}`
}
