import type { ReactNode } from 'react'

/** Termos de uso e política de privacidade.
 *
 *  O texto vive aqui, e não dentro da tela de cadastro, porque os dois
 *  documentos são exibidos em mais de um lugar (hoje o diálogo do registro; o
 *  perfil é o próximo) e precisam ser o MESMO texto em todos eles.
 *
 *  `version` acompanha o aceite no servidor: POST /auth/register grava a
 *  declaração junto da versão vigente e do instante em que ela ocorreu. Ao
 *  publicar uma redação nova, suba a versão aqui — é o que permite saber, mais
 *  tarde, qual redação cada pessoa aceitou.
 *
 *  CONTEÚDO AINDA NÃO ESCRITO. `body` vazio é o estado provisório combinado: a
 *  tela detecta isso e avisa que o texto está a caminho, em vez de mostrar um
 *  documento em branco como se fosse o definitivo. Para publicar, basta
 *  preencher `body` — nada na UI precisa mudar. */
export interface Policy {
  id: 'terms' | 'privacy'
  title: string
  /** Rótulo curto, usado nos links dentro da frase do aceite. */
  linkLabel: string
  version: string
  /** Data da versão vigente, `YYYY-MM-DD`. */
  updatedAt: string
  /** JSX do documento. Vazio enquanto a redação não chega. */
  body: ReactNode | null
}

export const POLICIES: Policy[] = [
  {
    id: 'terms',
    title: 'Termos de uso',
    linkLabel: 'termos de uso',
    version: '1.0',
    updatedAt: '2026-08-29',
    body: null,
  },
  {
    id: 'privacy',
    title: 'Política de privacidade',
    linkLabel: 'política de privacidade',
    version: '1.0',
    updatedAt: '2026-08-29',
    body: null,
  },
]

export function getPolicy(id: Policy['id']): Policy {
  const policy = POLICIES.find((item) => item.id === id)
  // Lista fixa e id tipado: não há caminho em que isto falhe em runtime, mas o
  // find devolve `Policy | undefined` e o retorno precisa ser `Policy`.
  if (!policy) throw new Error(`Política desconhecida: ${id}`)
  return policy
}
