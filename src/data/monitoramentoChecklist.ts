import type { MonitoramentoPipelineStatus } from "./pipelineData";

/**
 * Canonical checklists for each Monitoramento pipeline status.
 * A card can only advance when pending_items is empty.
 */
export const MONITORAMENTO_CHECKLIST: Record<MonitoramentoPipelineStatus, string[]> = {
  alertas_deteccao: [
    "Monitoramento de Inadimplência (D+1): Identificar automaticamente títulos que não foram liquidados no dia do vencimento.",
    "Check de Notas Canceladas/Inutilizadas: Cruzar com a SEFAZ para ver se o cedente cancelou alguma nota fiscal após a cessão.",
    "Alerta de Concentração Pós-Evento: Verificar se o inadimplemento de um título fez o fundo desenquadrar por concentração (o ativo \"podre\" aumenta o peso relativo dos outros).",
    "Downgrade de Rating: Monitorar se o Cedente ou os maiores Sacados tiveram queda de nota em agências de risco ou birôs de crédito.",
    "Vencimento de Seguros/Garantias: Alertar se apólices de seguro de crédito ou garantias reais estão perdendo a validade.",
  ],
  correcoes_acoes: [
    "Acionamento de Recompra: Notificar o cedente para que ele cumpra a cláusula de recompra dos títulos inadimplentes.",
    "Substituição de Ativos: Formalizar a troca de um título com problema por outro \"limpo\" (respeitando as regras do regulamento).",
    "Régua de Cobrança Extrajudicial: Iniciar protestos, ligações e notificações extrajudiciais para os sacados devedores.",
    "Bloqueio Preventivo de Limite: Travar novas operações no Pipeline de Recebíveis para este cedente até que o alerta seja sanado.",
    "Execução de Colaterais: Iniciar os trâmites para acessar fundos de reserva ou garantias reais (se houver).",
  ],
  relatorios_em_andamento: [
    "Relatório de Aging (Idade da Dívida): Consolidar o atraso por faixas (1-15 dias, 16-30 dias, etc.) para cada FIDC.",
    "Cálculo de Provisão (PDD): Gerar o relatório de quanto o fundo deve provisionar para perdas conforme as regras contábeis.",
    "Relatórios para Investidores/CVM: Preparar os dados para o Informe Mensal e o Informe Diário (PL, cota, rentabilidade).",
    "Performance de Recuperação: Medir o sucesso das ações de cobrança (quanto do que foi para \"Correções\" voltou para o caixa).",
  ],
  em_conformidade_auditoria: [
    "Conciliação do Custodiante: Validar se os movimentos de baixa e recompra foram aceitos e registrados pelo banco custodiante.",
    "Check de Desenquadramento Passivo: Garantir que o gestor está tomando as medidas legais para reenquadrar o fundo em até 15 dias (conforme CVM 175).",
    "Trilha de Auditoria (Logs): Garantir que todas as decisões de monitoramento e correção tenham um \"rastro\" digital (quem aprovou e por quê).",
    "Validação de Lastro Amostral: Realizar checagens periódicas (circularização) para confirmar se os devedores reconhecem o saldo devedor.",
  ],
  encerrado: [
    "Atualização do Score do Cedente: Alimentar o Pipeline de Cedentes com o histórico desse evento (isso afetará o limite futuro dele).",
    "Baixa no Sistema de Risco: Remover o alerta e liberar os travamentos operacionais após a regularização.",
    "Feedback para o Comercial/Originação: Relatar ao time de frente quais sacados ou setores estão gerando mais alertas para ajustar a prospecção.",
    "Arquivo Morto Digital: Consolidar todos os documentos e comunicações do incidente para futuras auditorias anuais.",
  ],
};
