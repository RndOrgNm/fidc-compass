import type { AllocationStatus } from "@/lib/api/allocationService";

/**
 * Canonical checklists for each Alocação pipeline status.
 * A card can only advance when pending_items is empty.
 */
export const ALLOCATION_CHECKLIST: Record<AllocationStatus, string[]> = {
  pending_match: [
    "Identificação de Classe de Ativo: Classificar se o título é comercial, agronegócio, financeiro ou imobiliário para filtrar os fundos elegíveis.",
    "Verificação de Prazo (Duration): Checar se o vencimento do título é compatível com o ciclo de vida do fundo (ex: um fundo que encerra em 6 meses não pode comprar um título de 12 meses).",
    "Expectativa de Yield: Validar se a taxa (deságio) do título atende ao objetivo de rentabilidade mínima (target) dos fundos disponíveis.",
    "Disponibilidade de Caixa: Cruzar o valor total do lote com o saldo livre em conta de cada FIDC da casa.",
  ],
  fund_selection: [
    "Análise de Concentração por Sacado: Verificar qual fundo tem mais \"espaço\" para aquele devedor específico sem estourar o limite do regulamento (ex: 10% ou 20% do PL).",
    "Análise de Concentração Setorial: Distribuir os ativos para que nenhum fundo fique exposto demais a um único setor da economia.",
    "Equilíbrio de Rating: Alocar ativos de maior risco em fundos com perfil High Yield e ativos mais conservadores em fundos Senior.",
    "Simulação de Impacto no PL: Rodar um \"teste de estresse\" para ver como a nova aquisição altera a nota de crédito e a liquidez do fundo escolhido.",
  ],
  compliance_check: [
    "Check de Regulamento (CVM): Garantir que a alocação respeita as normas da CVM 175 (ou a regulamentação vigente) e o regulamento interno do fundo.",
    "Limites de Concentração por Cedente: Validar se o total comprado deste cedente não ultrapassa o limite máximo permitido para aquele fundo específico.",
    "Verificação de Co-obrigação: Checar se o nível de retenção de risco pelo cedente (cotas subordinadas) é suficiente para suportar a nova alocação.",
    "Parecer do Gestor/Compliance: Registro de aprovação final do responsável pelo enquadramento do fundo.",
  ],
  allocated: [
    "Registro na Carteira (Asset Position): Atualizar o inventário de ativos do fundo no sistema contábil.",
    "Interface com Custodiante: Enviar o arquivo de movimentação para o banco custodiante validar a custódia física/digital.",
    "Atualização de Valor da Cota: Integrar os dados para o cálculo do valor patrimonial da cota (VPC) do dia.",
    "Relatórios de Investidores: Alimentar o dashboard de transparência para que os cotistas vejam a nova composição da carteira.",
  ],
  rejected: [],
  withdrawn: [],
  superseded: [],
};
