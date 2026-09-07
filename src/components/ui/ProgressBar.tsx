/** Barra de progresso do upload.
 *
 *  `role="progressbar"` com os valores ARIA: sem eles a barra era só duas divs
 *  e quem usa leitor de tela não tinha nenhuma noção de progresso num envio
 *  que leva minutos.
 *
 *  A trilha usa `surface-200` e não `surface-300`: contra o preenchimento
 *  `brand-500` o par dava 2.69:1 no tema escuro, abaixo do 3:1 que a WCAG
 *  1.4.11 pede para componentes não textuais. Medido agora: 3.13:1 no escuro e
 *  3.85:1 no claro. (Clarear a trilha para `surface-400` pioraria — ela se
 *  aproxima do azul; o caminho é escurecer.) */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progresso'}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-200"
    >
      <div
        className="h-full rounded-full bg-brand-500 transition-[width] duration-200"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
