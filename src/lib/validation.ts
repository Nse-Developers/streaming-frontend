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

const nameSchema = z
  .string()
  .transform(oneLine)
  .pipe(
    z
      .string()
      .min(2, 'Mínimo de 2 caracteres.')
      .max(60, 'Máximo de 60 caracteres.')
      // Só letras (com acento), espaço, hífen e apóstrofo: nada de < > / etc.
      .regex(/^[\p{L}][\p{L}\s'-]*$/u, 'Use apenas letras, espaço, hífen e apóstrofo.'),
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

export const registerSchema = z
  .object({
    name: nameSchema,
    surname: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
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
  surname: nameSchema,
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

export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024 // 2 GB (backend)
export const MAX_THUMB_BYTES = 15 * 1024 * 1024 // 15 MB (backend)

export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export const uploadSchema = z.object({
  titulo: z
    .string()
    .transform(oneLine)
    .pipe(z.string().min(3, 'Mínimo de 3 caracteres.').max(120, 'Máximo de 120 caracteres.')),
  description: z
    .string()
    .transform(multiLine)
    .pipe(z.string().min(10, 'Descreva o vídeo em pelo menos 10 caracteres.').max(2000, 'Máximo de 2000 caracteres.')),
  // `language` não está aqui de propósito: não é escolhido pelo usuário, o
  // envio manda PT-BR fixo (ver UploadPage).
  status: z.enum(['PUBLISHED', 'DRAFT', 'PRIVATE']),
})
export type UploadValues = z.infer<typeof uploadSchema>

/** Valida arquivo por tipo e tamanho ANTES de subir, para não gastar upload
 *  longo e cair num 400/413 do servidor. O backend também checa por conteúdo
 *  (Apache Tika), então o tipo declarado aqui não é a garantia final. */
export function validateVideoFile(file: File | null): string | null {
  if (!file) return 'Selecione o arquivo de vídeo.'
  if (file.size === 0) return 'O arquivo está vazio.'
  if (file.size > MAX_VIDEO_BYTES) return 'O vídeo passa de 2 GB.'
  if (file.type && !ACCEPTED_VIDEO_TYPES.includes(file.type)) {
    return 'Formato não aceito. Use MP4, WebM, MOV ou MKV.'
  }
  return null
}

export function validateThumbnailFile(file: File | null): string | null {
  if (!file) return 'Selecione a imagem de capa.'
  if (file.size === 0) return 'O arquivo está vazio.'
  if (file.size > MAX_THUMB_BYTES) return 'A imagem passa de 15 MB.'
  if (file.type && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Formato não aceito. Use JPG, PNG, WebP ou AVIF.'
  }
  return null
}

/** Só devolve URLs http(s) ABSOLUTAS — usada antes de jogar valor vindo da API
 *  em src/href, para uma URL maliciosa no banco não virar XSS na renderização.
 *
 *  Sem base de resolução de propósito. Enquanto havia
 *  `new URL(value, window.location.origin)`, dois valores indesejados passavam:
 *  um caminho relativo (`/x`) virava uma URL da PRÓPRIA origem, e uma URL
 *  protocol-relative (`//evil.com/x`) era promovida a `https://evil.com/x`
 *  silenciosamente. Os quatro pontos de uso (thumbnail e vídeo do MinIO,
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
