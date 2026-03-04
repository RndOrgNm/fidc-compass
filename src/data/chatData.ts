export const conversationsData = [
  {
    id: "conv-001",
    userId: "user-001",
    title: "Análise de inadimplência e cobrança",
    createdAt: "2025-10-15T09:00:00",
    updatedAt: "2025-10-15T09:05:30",
    lastMessageAt: "2025-10-15T09:05:30",
    messageCount: 6
  },
  {
    id: "conv-002",
    userId: "user-001",
    title: "Status de conciliação bancária",
    createdAt: "2025-10-14T14:20:00",
    updatedAt: "2025-10-14T14:28:15",
    lastMessageAt: "2025-10-14T14:28:15",
    messageCount: 8
  },
  {
    id: "conv-003",
    userId: "user-001",
    title: "Resumo de métricas e KPIs",
    createdAt: "2025-10-13T10:15:00",
    updatedAt: "2025-10-13T10:22:45",
    lastMessageAt: "2025-10-13T10:22:45",
    messageCount: 10
  },
  {
    id: "conv-004",
    userId: "user-001",
    title: "Pipeline de onboarding de investidores",
    createdAt: "2025-10-12T16:30:00",
    updatedAt: "2025-10-12T16:35:20",
    lastMessageAt: "2025-10-12T16:35:20",
    messageCount: 4
  },
  {
    id: "conv-005",
    userId: "user-001",
    title: "Análise de exposição por cedente",
    createdAt: "2025-10-10T11:45:00",
    updatedAt: "2025-10-10T11:52:30",
    lastMessageAt: "2025-10-10T11:52:30",
    messageCount: 7
  }
];

export interface MessageSource {
  section_id: string;
  page_number: number;
  section_text: string;
  metadata?: {
    document_name?: string;
    chapter?: string;
  };
}

export const messagesData: Record<string, any[]> = {
  "conv-001": [
    {
      id: "msg-001",
      conversationId: "conv-001",
      role: "assistant",
      content: "Olá! Como posso ajudá-lo hoje?",
      createdAt: "2025-10-15T09:00:00"
    },
    {
      id: "msg-002",
      conversationId: "conv-001",
      role: "user",
      content: "Qual é o valor total de recebíveis vencidos hoje?",
      createdAt: "2025-10-15T09:01:15"
    },
    {
      id: "msg-003",
      conversationId: "conv-001",
      role: "assistant",
      content: "Analisando os dados...\n\n**Recebíveis Vencidos Hoje (15/10/2025)**\n\n• Total: 23 recebíveis\n• Valor: R$ 1.847.500,00\n\n**Principais sacados:**\n1. Empresa XYZ: R$ 450.000 (3 recebíveis)\n2. Comércio ABC: R$ 380.000 (2 recebíveis)\n3. Distribuidora DEF: R$ 290.000 (1 recebível)\n\nDeseja que eu crie alertas de cobrança para estes casos?",
      createdAt: "2025-10-15T09:01:18",
      sources: [
        {
          section_id: "Art. 5º - §2º",
          page_number: 12,
          section_text: "Detalhamento sobre recebíveis vencidos e procedimentos de cobrança conforme regulamentação vigente...",
          metadata: {
            document_name: "Manual de Operações FIDC",
            chapter: "Capítulo 3 - Gestão de Recebíveis"
          }
        },
        {
          section_id: "Art. 12 - Inciso III",
          page_number: 28,
          section_text: "Normas específicas para classificação de inadimplência e prazos de vencimento...",
          metadata: {
            document_name: "Regulamento CVM",
            chapter: "Seção 2"
          }
        },
        {
          section_id: "Anexo B - Tabela 3",
          page_number: 45,
          section_text: "Tabela de classificação de risco por dias de atraso e valores envolvidos...",
          metadata: {
            document_name: "Manual de Risco",
            chapter: "Anexos"
          }
        }
      ]
    },
    {
      id: "msg-004",
      conversationId: "conv-001",
      role: "user",
      content: "Sim, quais são os 3 casos mais críticos?",
      createdAt: "2025-10-15T09:03:20"
    },
    {
      id: "msg-005",
      conversationId: "conv-001",
      role: "assistant",
      content: "**Top 3 Casos Mais Críticos:**\n\n**1. Empresa XYZ Ltda**\n• Valor: R$ 150.000\n• Dias de atraso: 7 dias\n• Histórico: 2 promessas não cumpridas\n• Risco: CRÍTICO 🔴\n• Ação sugerida: Contato jurídico imediato\n\n**2. Comércio ABC S.A.**\n• Valor: R$ 125.000\n• Dias de atraso: 5 dias\n• Score de crédito: Caiu de 720 para 580\n• Risco: ALTO 🟠\n• Ação sugerida: Ligação do gestor + carta de cobrança\n\n**3. Distribuidora DEF**\n• Valor: R$ 95.000\n• Dias de atraso: 3 dias\n• Primeiro atraso deste cliente\n• Risco: MÉDIO 🟡\n• Ação sugerida: WhatsApp + email de lembrete\n\nPosso criar workflows de cobrança automáticos para estes casos?",
      createdAt: "2025-10-15T09:03:25",
      sources: [
        {
          section_id: "Art. 8º - Cobrança",
          page_number: 19,
          section_text: "Procedimentos escalonados de cobrança conforme gravidade do atraso e valor envolvido...",
          metadata: {
            document_name: "Manual de Cobrança",
            chapter: "Capítulo 2"
          }
        },
        {
          section_id: "Seção 4 - Workflows",
          page_number: 67,
          section_text: "Definição de workflows automáticos por tier de inadimplência e ações correspondentes...",
          metadata: {
            document_name: "Sistema de Gestão",
            chapter: "Automações"
          }
        }
      ]
    },
    {
      id: "msg-006",
      conversationId: "conv-001",
      role: "user",
      content: "Perfeito, crie os workflows",
      createdAt: "2025-10-15T09:05:30"
    }
  ],
  "conv-002": [
    {
      id: "msg-007",
      conversationId: "conv-002",
      role: "assistant",
      content: "Olá! Como posso ajudá-lo hoje?",
      createdAt: "2025-10-14T14:20:00"
    },
    {
      id: "msg-008",
      conversationId: "conv-002",
      role: "user",
      content: "Qual o status da conciliação bancária de hoje?",
      createdAt: "2025-10-14T14:21:30"
    },
    {
      id: "msg-009",
      conversationId: "conv-002",
      role: "assistant",
      content: "**Status de Conciliação - 14/10/2025**\n\n✅ **Conciliados Automaticamente:** 1.652 transações (92,1%)\n\n⏳ **Pendentes de Revisão:** 112 transações (6,2%)\n• Valor total: R$ 3,2M\n• Principais causas:\n  - Pagamentos parciais: 45 casos\n  - Valores com diferença: 38 casos\n  - Origem não identificada: 29 casos\n\n❌ **Não Identificados:** 31 transações (1,7%)\n• Valor total: R$ 890k\n• Requer ação manual urgente\n\n**Eficiência geral:** 92,1% (↑1,2% vs ontem)\n\nDeseja ver detalhes das pendências?",
      createdAt: "2025-10-14T14:21:35",
      sources: [
        {
          section_id: "Art. 15 - §1º",
          page_number: 34,
          section_text: "Regulamentação sobre processos de conciliação e prazos estabelecidos...",
          metadata: {
            document_name: "Manual Operacional",
            chapter: "Capítulo 5"
          }
        },
        {
          section_id: "Seção 3 - Controles",
          page_number: 56,
          section_text: "Descrição dos controles internos e procedimentos de auditoria...",
          metadata: {
            document_name: "Compliance",
            chapter: "Seção 3"
          }
        }
      ]
    },
    {
      id: "msg-010",
      conversationId: "conv-002",
      role: "user",
      content: "Sim, mostre as 5 pendências de maior valor",
      createdAt: "2025-10-14T14:23:10"
    },
    {
      id: "msg-011",
      conversationId: "conv-002",
      role: "assistant",
      content: "**Top 5 Pendências por Valor:**\n\n1. TED R$ 450.000,00 - 14/10\n   • Origem: CNPJ 12.345.678/0001-90\n   • Problema: Empresa não cadastrada\n   • Ação: Verificar com cedente\n\n2. PIX R$ 320.000,00 - 14/10\n   • Origem: Industria ABC LTDA\n   • Problema: Pagamento parcial (esperado R$ 500k)\n   • Ação: Solicitar complemento\n\n3. TED R$ 280.000,00 - 13/10\n   • Origem: CNPJ 98.765.432/0001-11\n   • Problema: Diferença de R$ 50 (juros?)\n   • Ação: Aceitar com ajuste\n\n4. PIX R$ 185.000,00 - 14/10\n   • Origem: Comercio XYZ S.A.\n   • Problema: Data divergente (2 dias adiantado)\n   • Ação: Conciliar manualmente\n\n5. TED R$ 150.000,00 - 14/10\n   • Origem: Nome truncado \"EMPRESA DE...\"\n   • Problema: Identificação incompleta\n   • Ação: Buscar por valor e data\n\nTotal das 5 pendências: R$ 1.385.000,00\n\nPosso sugerir ações automáticas para cada caso?",
      createdAt: "2025-10-14T14:23:18"
    }
  ],
  "conv-003": [
    {
      id: "msg-012",
      conversationId: "conv-003",
      role: "assistant",
      content: "Olá! Como posso ajudá-lo hoje?",
      createdAt: "2025-10-13T10:15:00"
    },
    {
      id: "msg-013",
      conversationId: "conv-003",
      role: "user",
      content: "Me dê um resumo das principais métricas de hoje",
      createdAt: "2025-10-13T10:16:20"
    },
    {
      id: "msg-014",
      conversationId: "conv-003",
      role: "assistant",
      content: "**📊 Resumo Executivo - 13/10/2025**\n\n**Patrimônio e Performance**\n• AuM Total: R$ 234,5M (↑2,3% no mês)\n• Rentabilidade média: CDI + 2,8%\n• Fundos ativos: 8\n\n**Operacional**\n• Recebíveis ativos: 1.823\n• Valor total: R$ 187,3M\n• Vencimentos hoje: 45 (R$ 8,2M)\n• Conciliação: 93,8%\n\n**Risco e Inadimplência**\n• Taxa de inadimplência: 2,1% (↓0,2%)\n• Valor em atraso: R$ 4,8M\n• Alertas críticos: 3\n• Exposição top 5 cedentes: 42,3%\n\n**Investidores**\n• Total: 247 investidores\n• Aplicações hoje: R$ 1,2M (2 investidores)\n• Resgates pendentes: R$ 450k (1 investidor)\n• Pipeline onboarding: 4\n\n**Destaques do Dia**\n🟢 Novo fundo captou R$ 15M\n🟡 2 cedentes aguardando renovação de limite\n🔴 1 recebível de R$ 200k com 10 dias de atraso\n\nDeseja detalhes de alguma área específica?",
      createdAt: "2025-10-13T10:16:28"
    }
  ],
  "conv-004": [
    {
      id: "msg-015",
      conversationId: "conv-004",
      role: "assistant",
      content: "Olá! Como posso ajudá-lo hoje?",
      createdAt: "2025-10-12T16:30:00"
    },
    {
      id: "msg-016",
      conversationId: "conv-004",
      role: "user",
      content: "Quantos investidores estão no pipeline de onboarding?",
      createdAt: "2025-10-12T16:32:15"
    },
    {
      id: "msg-017",
      conversationId: "conv-004",
      role: "assistant",
      content: "**Pipeline de Onboarding - 12/10/2025**\n\n**Total:** 5 investidores em processo\n\n**Por Status:**\n• 📝 Documentação pendente: 2\n• 🔍 Em análise de compliance: 2\n• ✅ Aguardando aprovação final: 1\n\n**Detalhamento:**\n\n1. **Maria Oliveira Costa** (PF)\n   • Status: Documentação pendente\n   • Tempo no processo: 1 dia\n   • Pendências: Comprovante de residência\n   • SLA: 2 dias restantes\n\n2. **Tech Ventures LTDA** (PJ)\n   • Status: Documentação pendente\n   • Tempo no processo: 2 dias\n   • Pendências: Contrato social atualizado\n   • SLA: 1 dia restante ⚠️\n\n3. **Carlos Eduardo Ferreira** (PF)\n   • Status: Análise de compliance\n   • Tempo no processo: 4 dias\n   • Atribuído a: Ana Costa\n   • SLA: 3 dias restantes\n\n4. **Holding Investments S.A.** (PJ)\n   • Status: Análise de compliance\n   • Tempo no processo: 3 dias\n   • Atribuído a: Ana Costa\n   • SLA: 4 dias restantes\n\n5. **Roberto Almeida** (PF)\n   • Status: Aprovação final\n   • Tempo no processo: 8 dias\n   • Aprovação prevista: Hoje\n\nDeseja ver detalhes de algum investidor específico?",
      createdAt: "2025-10-12T16:32:22"
    }
  ],
  "conv-005": [
    {
      id: "msg-018",
      conversationId: "conv-005",
      role: "assistant",
      content: "Olá! Como posso ajudá-lo hoje?",
      createdAt: "2025-10-10T11:45:00"
    },
    {
      id: "msg-019",
      conversationId: "conv-005",
      role: "user",
      content: "Mostre a exposição de risco por cedente",
      createdAt: "2025-10-10T11:46:30"
    },
    {
      id: "msg-020",
      conversationId: "conv-005",
      role: "assistant",
      content: "**Exposição por Cedente - Top 10**\n\n**Concentração Total:** R$ 187,3M\n**Limite de concentração individual:** 15%\n\n1. **Fornecedor ABC S.A.**\n   • Exposição: R$ 28,5M (15,2%) 🔴 ACIMA DO LIMITE\n   • Recebíveis: 156\n   • Score: 780\n   • Rating: AA\n   • Ação: Reduzir exposição em R$ 500k\n\n2. **Distribuidora XYZ Ltda**\n   • Exposição: R$ 24,8M (13,2%)\n   • Recebíveis: 134\n   • Score: 720\n   • Rating: A\n\n3. **Indústria DEF S.A.**\n   • Exposição: R$ 19,3M (10,3%)\n   • Recebíveis: 98\n   • Score: 850\n   • Rating: AAA\n\n4. **Atacadista GHI Ltda**\n   • Exposição: R$ 16,7M (8,9%)\n   • Recebíveis: 87\n   • Score: 690\n   • Rating: BBB\n\n5. **Comercial JKL S.A.**\n   • Exposição: R$ 14,2M (7,6%)\n   • Recebíveis: 72\n   • Score: 750\n   • Rating: A\n\n*Top 5 representa 55,2% da carteira*\n\n6. Varejista MNO: R$ 11,8M (6,3%)\n7. Logística PQR: R$ 9,4M (5,0%)\n8. Factoring STU: R$ 7,9M (4,2%)\n9. Agrícola VWX: R$ 6,5M (3,5%)\n10. Serviços YZ: R$ 5,8M (3,1%)\n\n**Alertas:**\n🔴 Fornecedor ABC: acima do limite\n🟡 Distribuidora XYZ: próximo ao limite (13,2%)\n\nRecomendação: Diversificar aquisições nos próximos 30 dias.\n\nDeseja análise detalhada de algum cedente?",
      createdAt: "2025-10-10T11:46:40"
    }
  ]
};

export const botAutoResponses = {
  resumo: "**📊 Resumo Rápido**\n\n• Recebíveis ativos: 1.847\n• Conciliação hoje: 94,2%\n• Taxa inadimplência: 2,3%\n• Alertas críticos: 5\n• Investidores: 247\n\nDeseja detalhes de alguma área?",
  
  conciliacao: "**Status Conciliação**\n\n✅ Automático: 92%\n⏳ Revisão: 6%\n❌ Não identificado: 2%\n\nTotal processado: 1.795 transações",
  
  inadimplencia: "**Inadimplência Atual**\n\n• Taxa: 2,3%\n• Valor: R$ 5,4M\n• Casos críticos: 5\n• Casos em cobrança: 23\n\nTop 3 por valor:\n1. Empresa XYZ: R$ 320k\n2. Atacadista ABC: R$ 280k\n3. Comércio DEF: R$ 185k",
  
  investidores: "**Investidores**\n\n• Total: 247\n• Onboarding: 5 em processo\n• Aplicações hoje: R$ 850k\n• Resgates pendentes: 2 (R$ 620k)",
  
  default: "Entendi sua pergunta. Posso ajudá-lo com:\n\n• Resumos e métricas\n• Status de conciliação\n• Análise de inadimplência\n• Informações de investidores\n• Exposição de risco\n\nPor favor, seja mais específico ou escolha um dos tópicos acima."
};

export const pdfPagesData: Record<number, string> = {
  12: "https://images.unsplash.com/photo-1568667256549-094345857637?w=600&h=800&fit=crop",
  19: "https://images.unsplash.com/photo-1554224311-beee460c201e?w=600&h=800&fit=crop",
  28: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=800&fit=crop",
  34: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=600&h=800&fit=crop",
  45: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600&h=800&fit=crop",
  56: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=800&fit=crop",
  67: "https://images.unsplash.com/photo-1568667256549-094345857637?w=600&h=800&fit=crop"
};
