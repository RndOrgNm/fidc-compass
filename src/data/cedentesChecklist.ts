import type { CedentePipelineStatus } from "./pipelineData";

/**
 * Fallback checklist when GET /cedentes/checklist fails.
 * Backend (funds-pipeline/src/data/checklists.py) is the source of truth.
 */
export const CEDENTES_CHECKLIST: Record<CedentePipelineStatus, string[]> = {
  em_prospeccao: [
    "Pré-Enquadramento na Política (CNAE/Setor): Verificar se o CNAE da empresa é aceito pelos regulamentos dos FIDCs ativos.",
    "Estimativa de Volume Mensal: Confirmar se o volume mensal de recebíveis atende ao ticket mínimo da operação.",
    "Checagem de Concorrência (Outros FIDCs): Verificar se o cedente já opera com outros FIDCs concorrentes (risco de duplicidade).",
    "Reunião de Apresentação: Agendar e realizar reunião para apresentar o modelo de antecipação via FIDC.",
  ],
  coleta_documentos: [
    "Contrato Social e Alterações: Coletar contrato social atualizado e todas as alterações contratuais.",
    "Faturamento (DRE/Balanço): Solicitar demonstrações financeiras (DRE e Balanço) dos últimos 2-3 anos.",
    "Documentos dos Sócios: Validar documentos pessoais dos sócios (RG, CPF, comprovante de residência).",
    "Certidões Negativas (CNDs): Obter certidões negativas de débitos federais, estaduais e municipais.",
  ],
  analise_credito: [
    "Consulta Bureau (Serasa/Boa Vista): Consultar score de crédito do CNPJ e dos sócios nos principais bureaus.",
    "Consulta SCR (Bacen): Verificar a posição de crédito no Sistema de Informações de Crédito do Banco Central.",
    "Análise de Capacidade Técnica: Avaliar a capacidade operacional e técnica da empresa para gerar recebíveis.",
    "KYC/PLD (Mídia Negativa): Pesquisa de mídia negativa, processos judiciais e listas restritivas (AML/PLD).",
  ],
  comite_credito: [
    "Elaboração do Parecer de Crédito: Preparar documento técnico consolidando todas as análises realizadas.",
    "Definição de Limite Global (R$): Propor o limite máximo de exposição aprovado para o cedente.",
    "Definição de Taxa Mínima: Estabelecer a taxa mínima de deságio para operações com este cedente.",
    "Votação/Aprovação da Alçada: Submeter o parecer ao comitê e registrar o resultado da votação.",
  ],
  habilitado: [
    "Assinatura do Contrato Mãe: Coletar assinatura digital do contrato principal de cessão e aditivos.",
    "Abertura de Conta Escrow: Configurar a conta escrow onde os sacados pagarão os boletos (trava bancária).",
    "Cadastro no Sistema do Custodiante: Garantir que o cedente está cadastrado no sistema do banco custodiante do fundo.",
    "Liberação de Acesso ao Portal: Conceder acesso ao portal de envio de borderôs e acompanhamento de operações.",
  ],
  bloqueado_desistencia: [
    "Motivo da Saída: Registrar se foi por risco (bloqueio) ou por vontade do cliente (desistência).",
    "Check de Recompra: Verificar se existem títulos vencidos que o cedente ainda precisa pagar/recomprar.",
    "Baixa em Garantias: Liberar travas bancárias ou garantias caso a relação tenha sido encerrada sem dívidas.",
    "Blacklist Interna: Marcar o CNPJ para que não entre novamente no pipeline sem um alerta de segurança.",
  ],
};
