import { cn } from '@/lib/cn'

/** Tamanhos em px, um por contexto de nome:
 *   sm → linha de metadados (card do feed, autor de comentário)
 *   md → nome em corpo de texto (página do vídeo, menu da conta, listas)
 *   lg → título de perfil (h1 do próprio perfil e do perfil público)
 *
 *  Medida em px, e não em `em`: o selo acompanha nomes de 11px a 2.4rem, e
 *  amarrado ao tamanho da fonte ele ficava minúsculo na lista e desproporcional
 *  no título. Três degraus escolhidos à mão erram menos. */
const SIZES = { sm: 14, md: 16, lg: 22 } as const

export type VerifiedBadgeSize = keyof typeof SIZES

/** Selo de conta verificada, ao lado do nome.
 *
 *  Só desenha algo quando `verified` é EXATAMENTE `true`. `false` e
 *  `undefined` desenham nada, mas não significam a mesma coisa:
 *
 *   - `false` → o backend disse que a conta não é verificada;
 *   - `undefined` → não temos o dado (a maioria das telas: nem o vídeo, nem o
 *     comentário, nem o perfil público devolvem `userIsVerified` — ver
 *     `useVerifiedById` em hooks/useUsers.ts).
 *
 *  Os dois cairem no mesmo "nada na tela" é a decisão certa: a alternativa
 *  seria inventar um estado. Um selo mostrado por engano é pior que um selo
 *  ausente — ele é justamente a informação que o usuário deveria poder
 *  confiar. Nunca existe marca de "não verificado".
 *
 *  A cor é o `accent-ink` (menta), não o azul da marca. Não é gosto: neste
 *  design system o azul é a cor da AÇÃO (botão, link), e o accent é descrito
 *  em index.css como o tom das "marcações cirúrgicas — o ponto do logo, um
 *  selo de estado". Um selo azul colado num nome que já é link azul viraria
 *  parte do link aos olhos de quem lê. O accent tem contraste medido nos dois
 *  temas (11.94:1 no escuro, 4.95:1 no claro).
 *
 *  O "V" do check é vazado na cor do CARD (`--color-surface-100`), que troca
 *  junto do tema — então o contraste interno do selo se resolve sozinho no
 *  claro (branco sobre verde-escuro) e no escuro (quase-preto sobre menta),
 *  sem uma segunda paleta para manter. */
export function VerifiedBadge({
  verified,
  size = 'md',
  tone = 'accent',
  className,
}: {
  /** `true` mostra o selo; `false` e `undefined` não mostram nada. */
  verified: boolean | null | undefined
  size?: VerifiedBadgeSize
  /** `media` para nomes sobre vídeo/capa (destaque da home), onde o fundo é
   *  escuro nos DOIS temas e o texto ao lado já é branco — ali o accent
   *  desaparece. Nos outros casos, `accent`. */
  tone?: 'accent' | 'media'
  className?: string
}) {
  if (verified !== true) return null

  const px = SIZES[size]

  return (
    <span
      // role/aria-label em vez de texto escondido: dentro do <a> do nome isto
      // entra no nome acessível do link ("Kauã Santana, conta verificada"),
      // que é exatamente o que se quer anunciar. Um <title> no SVG seria lido
      // de forma inconsistente entre leitores de tela.
      role="img"
      aria-label="Conta verificada"
      // Tooltip do mouse. O selo é pequeno e sem rótulo visível; sem isto,
      // quem não conhece o ícone não tem como descobrir o que ele quer dizer.
      title="Conta verificada"
      className={cn(
        // `group/verified` nomeado para a animação abaixo reagir tanto ao
        // hover do selo quanto ao do nome (ver o SVG).
        'group/verified inline-flex shrink-0 items-center justify-center align-middle',
        tone === 'media' ? 'text-white' : 'text-accent-ink',
        className,
      )}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 24 24"
        width={px}
        height={px}
        aria-hidden="true"
        focusable="false"
        // A rotação responde a DOIS grupos: o do próprio selo e o `group/name`
        // que o UserLink põe no link do nome. Como o alvo tem ~14px, exigir o
        // ponteiro exatamente sobre ele deixaria a animação inalcançável na
        // prática — passar o mouse pelo nome é o gesto natural.
        //
        // 14° e 8% são de propósito quase imperceptíveis: o pedido é "sutil", e
        // um selo girando muito ao lado de cada nome de um feed viraria ruído.
        //
        // `motion-safe:` em cada utilitário, e não só confiando na regra global
        // de `prefers-reduced-motion` do index.css: aquela regra tira
        // `transform` da lista de propriedades em transição, mas o Tailwind v4
        // não gera `transform: rotate(...)` — gera as propriedades
        // INDIVIDUAIS `rotate` e `scale`, que a lista de lá não cobre. O efeito
        // seria o pior dos dois mundos: sem transição, mas com o selo
        // SALTANDO para 14° a cada passagem do mouse. Com `motion-safe` quem
        // pediu menos movimento não recebe transformação nenhuma.
        className="transition-transform duration-300 ease-out motion-safe:group-hover/verified:rotate-[14deg] motion-safe:group-hover/verified:scale-[1.08] motion-safe:group-hover/name:rotate-[14deg] motion-safe:group-hover/name:scale-[1.08]"
      >
        {/* Roseta serrilhada — a geometria é a do ícone `BadgeCheck` do lucide
            (ISC), a mesma biblioteca de ícones do resto do app, para o selo
            não parecer vindo de outro conjunto. Aqui ela é PREENCHIDA, e não
            traçada como nos outros ícones: contornada, a 14px, ela lia como
            uma flor cinza e o check interno virava um borrão. */}
        <path
          d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
          fill="currentColor"
        />
        <path
          d="m8.9 12.3 2.1 2.1 4.1-4.4"
          fill="none"
          // Vazado na cor do card, que troca por tema — ver a nota do
          // componente. `surface-100` e não `surface-0`: o selo aparece sobre
          // card e sobre página, e no tema claro o 100 é branco puro, o maior
          // contraste possível contra o verde do preenchimento.
          // No tom `media` o vazado é um quase-preto FIXO, não um token: ali o
          // selo é branco sobre a capa do vídeo nos dois temas, então seguir o
          // `surface-100` deixaria o check branco sobre branco no tema claro.
          stroke={tone === 'media' ? '#0b0e12' : 'var(--color-surface-100)'}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
