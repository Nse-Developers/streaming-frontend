/** A marca é o camaleão + "Byou". Os arquivos oficiais moram em /public para
 *  poderem ser trocados por um export novo do designer sem mexer em código.
 *
 *  O export oficial é um LOCKUP FECHADO: o camaleão e a palavra já vêm juntos
 *  na mesma arte, com a tipografia do designer. Por isso o "Byou" não é texto —
 *  renderizar texto ao lado duplicaria a palavra.
 *
 *  Dois arquivos, ambos com fundo transparente e recortados na tinta (sem
 *  respiro em volta), então a caixa do elemento é exatamente o desenho:
 *    byou-logo.svg → lockup completo, 256x322 (~0.795:1, mais alto que largo)
 *    byou-mark.svg → só o camaleão,   192x176 (~1.091:1, mais largo que alto)
 *
 *  Tamanho: travamos a ALTURA em `em` e deixamos a largura livre (`w-auto`),
 *  então a marca escala junto com o font-size e cada call site controla tudo
 *  por uma única propriedade. Como as duas artes têm proporções bem diferentes,
 *  cada variante tem a sua altura, calibrada para pesarem parecido na tela. */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string
  /** Só o camaleão — para espaços estreitos (rail, favicon-like, mobile apertado). */
  showWordmark?: boolean
}) {
  /* O lockup gasta ~1/4 da altura com a palavra, então precisa de mais altura
     total que o camaleão sozinho para o bicho não ficar miúdo. 2.4em ≈ 48px no
     `text-xl` do header, dentro dos 64px da barra. */
  const height = showWordmark ? 'h-[2.4em]' : 'h-[1.55em]'

  return (
    <img
      src={showWordmark ? '/byou-logo.svg' : '/byou-mark.svg'}
      alt="Byou"
      className={`inline-block ${height} w-auto shrink-0 ${className ?? ''}`}
    />
  )
}
