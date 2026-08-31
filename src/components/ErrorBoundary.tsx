import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ServerCrash } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/** Rede de segurança para erro de RENDER.
 *
 *  Sem isto, qualquer exceção lançada durante o render desmonta a árvore inteira
 *  e o usuário fica com uma PÁGINA BRANCA, sem texto, sem botão e sem pista do
 *  que aconteceu — o pior modo de falha possível numa aplicação em produção.
 *  Erro de request já é tratado nas telas (via React Query + `toErrorMessage`);
 *  o que sobra para cá é o inesperado: um campo que a API mudou de forma e um
 *  `.map` que recebeu não-array, por exemplo.
 *
 *  Precisa ser CLASSE: `componentDidCatch`/`getDerivedStateFromError` não têm
 *  equivalente em hook — é a única parte da API do React que ainda exige
 *  classe.
 *
 *  Deliberadamente NÃO mostra `error.message` na tela: a mensagem de uma
 *  exceção de render pode conter caminho de arquivo, nome de campo interno ou
 *  fragmento de dado, e isso não é informação para o usuário final (mesma
 *  política do interceptor de 5xx em `api/client.ts`). O detalhe vai para o
 *  console, onde o desenvolvedor procura.
 *
 *  A recuperação é `window.location.reload()`, não `setState({hasError:false})`:
 *  o estado que causou o erro continuaria lá e a tela quebraria de novo no
 *  mesmo ponto. Recarregar reconstrói tudo a partir do servidor. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Único console. do projeto, e de propósito: é a última chance de o erro
    // deixar rastro antes de a árvore ser substituída pelo fallback. Quando
    // houver monitoramento (Sentry e afins), é exatamente aqui que ele entra.
    console.error('Erro não tratado no render:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          headingLevel="h1"
          icon={ServerCrash}
          title="Algo deu errado nesta tela"
          description="Tivemos um problema inesperado ao montar esta página. Recarregar costuma resolver."
          action={
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Recarregar a página
            </Button>
          }
        />
      </div>
    )
  }
}
