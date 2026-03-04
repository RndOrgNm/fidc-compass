import type { RecebivelStatus } from "@/lib/api/prospectionService";

/**
 * Fallback checklist when GET /recebiveis/checklist fails.
 * Backend (funds-pipeline/src/data/checklists.py) is the source of truth.
 */
export const RECEBIVEIS_CHECKLIST: Record<RecebivelStatus, string[]> = {
  recepcao_bordero: [
    "Validação de Layout (CNAB/XML): Verificar se o arquivo de remessa ou borderô está no padrão correto e sem erros de leitura.",
    "Trava de Unicidade (Duplicidade): O sistema deve varrer todos os FIDCs para garantir que esse título não foi cedido anteriormente.",
    "Checagem de Limite Disponível do Cedente: Verificar se o valor deste lote cabe dentro do limite aprovado na etapa de Habilitação.",
    "Validação Básica de Sacados: Identificar se os sacados (devedores) já estão cadastrados ou se precisam de análise de crédito rápida.",
  ],
  checagem_lastro: [
    "Validação SEFAZ (Chave NFe): Verificar se a nota fiscal está \"Autorizada\" e não foi cancelada ou substituída.",
    "Confirmação de Performance (Mercadoria Entregue): Confirmar que a mercadoria foi entregue ou o serviço prestado (anexar evidência digital).",
    "Checagem de Protestos do Sacado: Consultar se o sacado possui protestos ou restrições em bureaus de crédito.",
    "Confirmação de Veracidade (Call com Sacado): Realizar contato com o sacado para que ele confirme que a dívida existe e será paga ao FIDC.",
  ],
  enquadramento_alocacao: [
    "Seleção do Fundo Elegível (Regulamento): Classificar o título e filtrar os fundos cujo regulamento permite a aquisição.",
    "Teste de Concentração (Sacado/Cedente): Verificar se a alocação não estourará limites de concentração por sacado ou cedente no fundo.",
    "Validação de Taxa/Benchmark do Fundo: Confirmar que a taxa (deságio) do título atende ao objetivo de rentabilidade mínima do fundo.",
    "Marcação do Fundo Comprador (fund_id): Registrar o fundo selecionado para aquisição do título.",
  ],
  formalizacao_cessao: [
    "Geração do Termo de Cessão: Gerar o documento jurídico que transfere a propriedade do cedente para o fundo.",
    "Assinatura Digital (Cedente + Gestora): Coletar assinaturas digitais de ambas as partes no termo de cessão.",
    "Envio para Registradora (CERC/B3): Efetuar o registro do ativo na registradora central para garantir unicidade.",
    "Validação de Aceite da Registradora: Confirmar que a registradora aceitou e registrou a cessão sem pendências.",
  ],
  aguardando_liquidacao: [
    "Autorização do Custodiante: Obter validação do banco custodiante para a nova aquisição na carteira do fundo.",
    "Checagem de Conta Favorecida (Travada): Verificar se a conta destino do pagamento possui trava bancária correta.",
    "Comando de Pagamento (TED/Pix): Comandar o pagamento ao cedente, descontando as taxas (deságio).",
    "Conciliação Bancária (Comprovante): Confirmar o recebimento do comprovante de pagamento e conciliar com o sistema.",
  ],
  liquidado: [],
  reprovado_cancelado: [
    "Registro do Motivo (Risco/Fraude/Desistência): Documentar a razão da recusa ou cancelamento.",
    "Notificação ao Cedente: Comunicar formalmente o cedente sobre a reprovação ou cancelamento.",
    "Estorno de Limite/Caixa: Reverter reservas de limite e caixa que foram alocadas para esta operação.",
    "Arquivamento Auditável: Consolidar todos os documentos para futuras auditorias.",
  ],
};
