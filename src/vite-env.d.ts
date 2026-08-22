/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API Spring Boot. Obrigatória no build de produção — sem
   *  default, e `vite.config.ts` falha o build quando ela falta. Não é
   *  opcional de propósito: o `?` fazia o `tsc -b` aprovar um build que
   *  embutia localhost no bundle público. */
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
