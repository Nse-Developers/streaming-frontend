import { z } from 'zod'

/** Validação de entrada do cliente.
 *
 *  Isto é defesa de PRIMEIRA linha (feedback rápido + não deixar lixo sair do
 *  browser), nunca a única: o backend revalida tudo. O que o front garante é
 *  que nenhum payload malformado/oversize seja enviado e que nada digitado pelo
 *  usuário seja tratado como marcação ou URL executável.
 */

/** Remove caracteres de controle e normaliza espaços — bloqueia payloads com
 *  NUL/newline injetados em campos de uma linha.
 *  Faixas C0 + DEL escritas em \u para o próprio arquivo-fonte não conter
 *  bytes de controle literais. */
// oxlint-disable-next-line no-control-regex -- casar com controles e o objetivo
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g
/** Mantem \n e \t (texto de varias linhas), remove o resto dos controles. */
// oxlint-disable-next-line no-control-regex -- idem
const CONTROL_CHARS_KEEP_BREAKS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

const oneLine = (value: string) => value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim()

const multiLine = (value: string) => value.replace(CONTROL_CHARS_KEEP_BREAKS, '').trim()

const shortText = (max: number) => z.string().transform(oneLine).pipe(z.string().max(max))

export const emailSchema = z
  .string()
  .transform(oneLine)
  .pipe(
    z
      .string()
      .min(1, 'Informe seu e-mail.')
      .max(180, 'E-mail muito longo.')
      .email('E-mail inválido.'),
  )

/** Senha forte: o backend usa BCrypt mas não impõe política, então a regra
 *  vive aqui para não criar contas triviais de adivinhar. */
export const passwordSchema = z
  .string()
  .min(8, 'Use pelo menos 8 caracteres.')
  .max(72, 'Máximo de 72 caracteres (limite do BCrypt).')
  .regex(/[a-z]/, 'Inclua uma letra minúscula.')
  .regex(/[A-Z]/, 'Inclua uma letra maiúscula.')
  .regex(/[0-9]/, 'Inclua um número.')
  .regex(/[^A-Za-z0-9]/, 'Inclua um símbolo (ex.: @, #, !).')

const NAME_CHARS = /^[\p{L}][\p{L}\s'-]*$/u
/** Mensagem única para os dois esquemas de nome: a regra de caracteres é a
 *  mesma no obrigatório e no opcional. */
const NAME_CHARS_MESSAGE = 'Use apenas letras, espaço, hífen e apóstrofo.'

const nameSchema = z
  .string()
  .transform(oneLine)
  .pipe(
    z
      .string()
      .min(2, 'Mínimo de 2 caracteres.')
      .max(60, 'Máximo de 60 caracteres.')
      // Só letras (com acento), espaço, hífen e apóstrofo: nada de < > / etc.
      .regex(NAME_CHARS, NAME_CHARS_MESSAGE),
  )

/** Nome que pode ficar em branco — o sobrenome, desde que o backend deixou de
 *  exigi-lo. Vazio passa; preenchido cai nas MESMAS regras do obrigatório, para
 *  que "A" ou "<script>" continuem sendo reprovados.
 *
 *  A string vazia é preservada em vez de virar `undefined`: a coluna é NOT NULL
 *  no banco, então o payload precisa levar `""` e não omitir o campo. */
const optionalNameSchema = z
  .string()
  .transform(oneLine)
  .pipe(
    z
      .string()
      .max(60, 'Máximo de 60 caracteres.')
      .refine((value) => value === '' || value.length >= 2, 'Mínimo de 2 caracteres.')
      .refine((value) => value === '' || NAME_CHARS.test(value), NAME_CHARS_MESSAGE),
  )

/** Só http(s). Rejeita javascript:/data: — que seriam XSS ao virar href/src. */
const httpUrlSchema = z
  .string()
  .transform(oneLine)
  .pipe(
    z
      .string()
      .max(300, 'URL muito longa.')
      .refine((value) => value === '' || /^https?:\/\/[^\s]+\.[^\s]+/i.test(value), {
        message: 'Use uma URL completa começando com http:// ou https://',
      }),
  )

export const loginSchema = z.object({
  email: emailSchema,
  // No login não se aplica a política de força: senhas antigas podem ser fracas.
  password: z.string().min(1, 'Informe sua senha.').max(72, 'Senha muito longa.'),
})
export type LoginValues = z.infer<typeof loginSchema>

/** Idade mínima para criar conta, espelhando a regra do backend (422 abaixo
 *  disso). O número vive aqui para a mensagem e o bloqueio não saírem de
 *  sincronia. */
export const MIN_AGE_YEARS = 13

/** Idade completa em anos na data de hoje.
 *
 *  Compara mês e dia, e não a diferença de milissegundos dividida por 365.25:
 *  quem faz 13 anos HOJE já pode se cadastrar, e a aproximação por média erraria
 *  o limite em até um dia perto de anos bissextos.
 *
 *  A data entra desmontada em números (`split`), sem `new Date('YYYY-MM-DD')`:
 *  essa string é interpretada como UTC, então a oeste de Greenwich ela volta um
 *  dia — e um aniversário no limite dos 13 anos seria recusado por engano. */
export function ageInYears(isoDate: string, today = new Date()): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  let age = today.getFullYear() - year
  const monthDiff = today.getMonth() + 1 - month
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) age -= 1
  return age
}

/** Data de nascimento. O formato `YYYY-MM-DD` é o que o backend espera e o mesmo
 *  que `<input type="date">` produz, então não há conversão no meio.
 *
 *  A ordem das checagens é o que produz a mensagem certa: formato, depois
 *  existência do dia, e só então idade. Uma data no futuro cai naturalmente na
 *  regra de idade (idade negativa), sem precisar de refine próprio. */
const dateOfBirthSchema = z
  .string()
  .min(1, 'Informe sua data de nascimento.')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use uma data válida.')
  // Existência antes de idade: 2025-02-30 casa com o formato mas não é um dia
  // real, e o Date normalizaria para 02 de março sem reclamar.
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  }, 'Use uma data válida.')
  .refine((value) => ageInYears(value) < 130, 'Confira a data de nascimento.')
  .refine(
    (value) => ageInYears(value) >= MIN_AGE_YEARS,
    `É preciso ter ${MIN_AGE_YEARS} anos ou mais para criar uma conta.`,
  )

export const registerSchema = z
  .object({
    name: nameSchema,
    // Opcional desde que o backend parou de exigir sobrenome no cadastro.
    surname: optionalNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    dateOfBirth: dateOfBirthSchema,
    // `literal(true)` e não `boolean()`: desmarcado precisa REPROVAR a
    // validação aqui, não enviar `false` para colher 422 do servidor.
    acceptedPolicies: z.literal(true, {
      message: 'É preciso aceitar os termos de uso e a política de privacidade.',
    }),
    userTypeAccount: z.enum(['CREATORS', 'VIEWERS']),
    bio: z.string().transform(multiLine).pipe(z.string().max(400, 'Máximo de 400 caracteres.')),
    state: shortText(60),
    country: shortText(60),
    linkInstagram: httpUrlSchema,
    linkYoutube: httpUrlSchema,
    linkWebsite: httpUrlSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  })
export type RegisterValues = z.infer<typeof registerSchema>

/** Perfil. Sem e-mail, senha e site: e-mail não é editável, e a troca de
 *  senha vai ganhar um fluxo próprio de redefinição.
 *
 *  Sem `profilePhoto` também: a foto vai ganhar um fluxo de upload próprio, em
 *  vez de um campo de URL colada. Como o PUT é merge parcial e ignora o que não
 *  vem no corpo, omitir o campo aqui PRESERVA a foto já gravada. */
export const profileSchema = z.object({
  name: nameSchema,
  // Igual ao cadastro: quem criou a conta sem sobrenome precisa conseguir
  // salvar o perfil sem inventar um.
  surname: optionalNameSchema,
  bio: z.string().transform(multiLine).pipe(z.string().max(400, 'Máximo de 400 caracteres.')),
  state: shortText(60),
  country: shortText(60),
  linkInstagram: httpUrlSchema,
  linkYoutube: httpUrlSchema,
})
export type ProfileValues = z.infer<typeof profileSchema>

export const commentSchema = z.object({
  text: z
    .string()
    .transform(multiLine)
    .pipe(
      z
        .string()
        .min(1, 'Escreva algo antes de enviar.')
        .max(1000, 'Máximo de 1000 caracteres.'),
    ),
})
export type CommentValues = z.infer<typeof commentSchema>

/** POST /feedback/{videoId}.
 *
 *  A faixa 1..5 e o inteiro espelham a validacao do backend (fora dela, 400).
 *  Repetir aqui e o que faz o erro aparecer no formulario sem gastar request —
 *  mesma razao dos outros schemas deste arquivo.
 *
 *  `feedbackReactionType` e opcional de verdade: o backend aceita ausente ou
 *  null. `''` entra na lista porque um <select> sem escolha devolve string
 *  vazia, e ela precisa virar undefined em vez de falhar a validacao. */
export const feedbackSchema = z.object({
  rating: z
    .number({ message: 'Escolha uma nota de 1 a 5.' })
    .int('A nota deve ser um número inteiro.')
    .min(1, 'A nota mínima é 1.')
    .max(5, 'A nota máxima é 5.'),
  feedbackReactionType: z
    .union([z.literal('LIKE'), z.literal('DISLIKE'), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined)),
})
export type FeedbackValues = z.infer<typeof feedbackSchema>

export const categorySchema = z.object({
  name: z
    .string()
    .transform(oneLine)
    .pipe(
      z
        .string()
        .min(2, 'Mínimo de 2 caracteres.')
        .max(40, 'Máximo de 40 caracteres.')
        // O nome vai na URL (PUT/DELETE /{name}); restringir evita path traversal.
        .regex(/^[\p{L}\p{N}][\p{L}\p{N}\s-]*$/u, 'Use apenas letras, números, espaço e hífen.'),
    ),
  description: z
    .string()
    .transform(multiLine)
    .pipe(z.string().min(1, 'Descreva a categoria.').max(200, 'Máximo de 200 caracteres.')),
  icon: shortText(40),
})
export type CategoryValues = z.infer<typeof categorySchema>

/* --------------------------------------------------------------- upload */

const MB = 1024 * 1024
const GB = 1024 * MB

/** Teto do arquivo de vídeo, espelhando o limite do backend. */
export const MAX_VIDEO_BYTES = 2.95 * GB

/** Teto da thumbnail — o 413 da API vem acima disto.
 *
 *  Com o vídeo indo direto ao storage, a thumbnail é a única coisa que passa
 *  pelo Spring, e é o limite DELE que manda aqui. Ultrapassar gasta o upload
 *  inteiro para colher 413. */
export const MAX_THUMB_BYTES = 5 * MB

/** Rótulos legíveis dos tetos acima.
 *
 *  Derivados dos bytes de propósito: os números apareciam escritos à mão na
 *  mensagem de erro e na dica de cada dropzone, então mexer no limite exigia
 *  lembrar de três lugares — e a interface passava a prometer um tamanho que a
 *  validação recusava. Agora só há um número para mudar. */
const limitLabel = (bytes: number) => {
  const [value, unit] = bytes >= GB ? [bytes / GB, 'GB'] : [bytes / MB, 'MB']
  // Vírgula decimal e sem zeros à direita: um teto de 2,95 GB imprimia
  // "2.95 GB" com ponto, fora do padrão do resto da interface (ver
  // formatViews/formatBytes), e um teto redondo não deve virar "1,00 GB".
  return `${value.toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} ${unit}`
}

export const MAX_VIDEO_LABEL = limitLabel(MAX_VIDEO_BYTES)
export const MAX_THUMB_LABEL = limitLabel(MAX_THUMB_BYTES)

export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export const uploadSchema = z.object({
  // `title` (inglês, um "t") é o nome que POST /video/upload-url espera no
  // metadata. Não confundir com `tittle`, o nome do MESMO dado na LEITURA
  // (VideoResponse). A API é inconsistente entre escrita e leitura.
  title: z
    .string()
    .transform(oneLine)
    .pipe(z.string().min(3, 'Mínimo de 3 caracteres.').max(120, 'Máximo de 120 caracteres.')),
  description: z
    .string()
    .transform(multiLine)
    .pipe(z.string().min(10, 'Descreva o vídeo em pelo menos 10 caracteres.').max(2000, 'Máximo de 2000 caracteres.')),
  // `language` saiu junto com a arquitetura nova: o metadata de
  // /video/upload-url não aceita mais esse campo.
  //
  // `status` continua no formulário, mas não vai no metadata: ele é aplicado
  // no passo 3 (confirm). DRAFT é o estado inicial de todo vídeo, e escolhê-lo
  // significa apenas não confirmar.
  status: z.enum(['PUBLISHED', 'DRAFT', 'PRIVATE']),
})
export type UploadValues = z.infer<typeof uploadSchema>

/** Valida arquivo por tipo e tamanho ANTES de subir, para não gastar upload
 *  longo e cair num 400/413 do servidor. O backend também checa por conteúdo
 *  (Apache Tika), então o tipo declarado aqui não é a garantia final. */
export function validateVideoFile(file: File | null): string | null {
  if (!file) return 'Selecione o arquivo de vídeo.'
  if (file.size === 0) return 'O arquivo está vazio.'
  if (file.size > MAX_VIDEO_BYTES) return `O vídeo passa de ${MAX_VIDEO_LABEL}.`
  // Sem `file.type &&`: um tipo vazio não é mais tolerável. O contentType é
  // obrigatório no passo 1 e precisa ser video/*, então um arquivo cuja
  // extensão também não resolve tem de ser barrado ANTES do upload.
  if (!resolveVideoContentType(file)) {
    return 'Formato não aceito. Use MP4, WebM, MOV ou MKV.'
  }
  return null
}

export function validateThumbnailFile(file: File | null): string | null {
  if (!file) return 'Selecione a imagem de capa.'
  if (file.size === 0) return 'O arquivo está vazio.'
  if (file.size > MAX_THUMB_BYTES) return `A imagem passa de ${MAX_THUMB_LABEL}.`
  if (file.type && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Formato não aceito. Use JPG, PNG, WebP ou AVIF.'
  }
  return null
}

/** Content-Type a declarar para um arquivo de vídeo.
 *
 *  Existe porque o `contentType` entra na ASSINATURA da URL de upload: se o
 *  passo 1 declarar um valor e o PUT do passo 2 mandar outro, o storage recusa
 *  com SignatureDoesNotMatch. Resolver isso num lugar só garante que os dois
 *  passos usem exatamente a mesma string.
 *
 *  `file.type` vem vazio quando o SO não reconhece a extensão (acontece com
 *  .mkv em algumas máquinas Windows). Nesse caso o navegador mandaria
 *  `application/octet-stream` no PUT, que não é `video/*` e leva a 400 no passo
 *  1 — então derivamos da extensão, e só aí desistimos. */
export function resolveVideoContentType(file: File): string | null {
  if (file.type && ACCEPTED_VIDEO_TYPES.includes(file.type)) return file.type
  const byExtension: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
  }
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return byExtension[extension] ?? null
}

/** Só devolve URLs http(s) ABSOLUTAS — usada antes de jogar valor vindo da API
 *  em src/href, para uma URL maliciosa no banco não virar XSS na renderização.
 *
 *  Sem base de resolução de propósito. Enquanto havia
 *  `new URL(value, window.location.origin)`, dois valores indesejados passavam:
 *  um caminho relativo (`/x`) virava uma URL da PRÓPRIA origem, e uma URL
 *  protocol-relative (`//evil.com/x`) era promovida a `https://evil.com/x`
 *  silenciosamente. Os quatro pontos de uso (thumbnail e vídeo do storage,
 *  Instagram e YouTube do perfil) recebem sempre URL absoluta, então exigir o
 *  esquema não perde nenhum caso legítimo e mantém a função alinhada ao
 *  `isHttpUrl` de lib/video.ts, que já era estrito. */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    // Sem base, um valor relativo lança aqui — que é o resultado desejado.
    return null
  }
}
