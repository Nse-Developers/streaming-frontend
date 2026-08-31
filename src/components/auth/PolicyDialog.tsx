import { Modal } from '@/components/ui/Modal'
import { formatLongDateBR } from '@/lib/format'
import type { Policy } from '@/lib/policies'

interface PolicyDialogProps {
  policy: Policy | null
  onClose: () => void
}

/** Leitura de um dos documentos, sem sair do formulário.
 *
 *  Diálogo e não rota nova de propósito: navegar para /termos no meio do
 *  cadastro descartaria tudo que já foi digitado (o formulário não persiste), e
 *  voltar traria a tela em branco.
 *
 *  Ler NÃO é aceitar: fechar o diálogo não marca a caixa. O aceite é um ato
 *  explícito do usuário no formulário, que é exatamente o que o servidor grava. */
export function PolicyDialog({ policy, onClose }: PolicyDialogProps) {
  return (
    <Modal isOpen={policy !== null} onClose={onClose} title={policy?.title}>
      {policy && (
        <div className="space-y-4">
          <p className="text-xs text-surface-600">
            Versão {policy.version} — atualizada em {formatLongDateBR(policy.updatedAt)}
          </p>

          {policy.body ?? (
            /* Estado provisório: a redação ainda não foi escrita. Dizer isso é
               melhor do que um painel vazio, que pareceria falha de
               carregamento. */
            <p className="text-sm leading-relaxed text-surface-700">
              O texto deste documento ainda será publicado. Enquanto isso, o aceite
              registra a versão {policy.version}.
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
