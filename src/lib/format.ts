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

/** Data por extenso no padrão BR: "15 de janeiro de 2026".
 *
 *  Usada em "Na Byou desde ...", no perfil público.
 *
 *  O backend manda LocalDateTime SEM fuso ("2026-01-15T09:00:00"). O construtor
 *  do Date trata esse formato como horário LOCAL, mas a mesma string com "Z"
 *  seria UTC — e no Brasil (UTC-3) isso desloca a data em um dia para horários
 *  de madrugada, fazendo "01/01" virar "31/12". Por isso a parte da data é lida
 *  do texto direto quando ela está no formato ISO, sem passar por fuso nenhum.
 *  Só cai no Date quando o formato é outro. */
export function formatLongDateBR(iso: string | null | undefined): string {
  if (!iso) return ''

  const MONTHS = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ]

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (match) {
    const [, year, month, day] = match
    const name = MONTHS[Number(month) - 1]
    if (name) return `${Number(day)} de ${name} de ${year}`
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`
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
