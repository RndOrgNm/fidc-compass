# Mock Data - Entity Relationship Diagram

Este documento descreve o modelo de dados utilizado para os dados mockados da aplicação.

## Estrutura do diretório `data/`

| Arquivo / grupo | Descrição |
|-----------------|-----------|
| `dashboardData.ts` | KPIs, alertas críticos, atividades recentes |
| `receivablesData.ts` | Recebíveis, transações bancárias |
| `investorsData.ts` | Investidores, onboarding |
| `chatData.ts` | Conversas e mensagens do chat |
| `pipelineData.ts` | Fundos, cedentes, workflows, tipos de pipeline |
| **Checklists** | `*Checklist.ts` – fallbacks quando a API de checklist não está disponível |
| `allocationChecklist.ts`, `cedentesChecklist.ts`, `monitoramentoChecklist.ts`, `recebiveisChecklist.ts` | |
| **Pipeline configs** | `*PipelineConfig.ts` – labels de status, colunas e badges por pipeline |
| `allocationPipelineConfig.ts`, `cedentesPipelineConfig.ts`, `monitoramentoPipelineConfig.ts`, `recebiveisPipelineConfig.ts` | |
| `index.ts` | Barrel file – re-exporta todos os módulos acima |

## Pipeline de Investimentos

### Diagrama ER

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PIPELINE DE INVESTIMENTOS                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐         ┌─────────────────────┐
│        FUND         │         │       CEDENTE       │         │  PIPELINE_RECEIVABLE │
├─────────────────────┤         ├─────────────────────┤         ├─────────────────────┤
│ PK id               │         │ PK id               │         │ PK id               │
│    name             │         │    companyName      │    ┌───>│ FK cedenteId        │
│    code             │         │    cnpj             │    │    │    cedenteName      │
│    type             │         │    contactName      │────┘    │    cedenteCnpj      │
│    aum              │         │    contactEmail     │         │    invoiceNumber    │
│    riskProfile      │         │    contactPhone     │         │    nominalValue     │
│    eligibleSegments │         │    segment          │         │    dueDate          │
│    minTicket        │         │    creditScore      │         │    debtorName       │
│    maxConcentration │         │    status           │         │    debtorCnpj       │
│    status           │         │    totalReceivables │         │    creditAnalysisStatus│
└─────────────────────┘         │    approvedLimit    │         │    riskScore        │
         │                      │    createdAt        │         │    segment          │
         │                      └─────────────────────┘         │    rejectionReason? │
         │                               │                      │    createdAt        │
         │                               │                      └─────────────────────┘
         │                               │                               │
         │                               │ 1:N                           │
         │                               ▼                               │
         │                      ┌─────────────────────┐                  │
         │                      │ PROSPECTION_WORKFLOW│                  │
         │                      ├─────────────────────┤                  │
         │                      │ PK id               │                  │
         │                      │ FK cedenteId        │                  │
         │                      │    cedenteName      │                  │
         │                      │    cedenteCnpj      │                  │
         │                      │    cedenteSegment   │                  │
         │                      │ FK receivableId?    │◄─────────────────┘
         │                      │    receivableValue  │          (0..1)
         │                      │    status           │
         │                      │    currentStep      │
         │                      │    totalSteps       │
         │                      │    completedSteps   │
         │                      │    startedAt        │
         │                      │    lastActivityAt   │
         │                      │    assignedTo       │
         │                      │    pendingItems[]   │
         │                      │    slaDeadline      │
         │                      │    daysInProgress   │
         │                      │    estimatedVolume  │
         │                      └─────────────────────┘
         │
         │ 1:N
         │
         │                      ┌─────────────────────┐
         │                      │  MATCHING_WORKFLOW  │
         │                      ├─────────────────────┤
         │                      │ PK id               │
         │                      │ FK receivableId     │◄─── Pipeline Receivable (após aprovação)
         │                      │    receivableNumber │
         │                      │    cedenteName      │
         │                      │    cedenteCnpj      │
         │                      │    debtorName       │
         │                      │    nominalValue     │
         │                      │    dueDate          │
         │                      │    riskScore        │
         │                      │    segment          │
         └─────────────────────>│ FK fundId?          │
                       (0..1)   │    fundName         │
                                │    status           │
                                │    currentStep      │
                                │    totalSteps       │
                                │    completedSteps   │
                                │    startedAt        │
                                │    lastActivityAt   │
                                │    assignedTo       │
                                │    pendingItems[]   │
                                │    slaDeadline      │
                                │    daysInProgress   │
                                │    allocationDate?  │
                                └─────────────────────┘
```

### Entidades

#### Fund (Fundo de Investimento)
Representa os fundos de investimento (FIDCs) que podem receber recebíveis.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único (PK) |
| name | string | Nome completo do fundo |
| code | string | Código identificador do fundo |
| type | enum | Tipo: `multissetorial`, `agro`, `varejo`, `high_yield` |
| aum | number | Assets Under Management (patrimônio) |
| riskProfile | enum | Perfil de risco: `conservative`, `moderate`, `aggressive` |
| eligibleSegments | string[] | Segmentos elegíveis para o fundo |
| minTicket | number | Valor mínimo de aquisição |
| maxConcentration | number | Concentração máxima por cedente (%) |
| status | enum | Status: `active`, `inactive`, `closed` |

#### Cedente (Empresa Cedente)
Representa empresas que vendem/cedem seus recebíveis para os fundos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único (PK) |
| companyName | string | Razão social |
| cnpj | string | CNPJ da empresa |
| contactName | string | Nome do contato principal |
| contactEmail | string | Email do contato |
| contactPhone | string | Telefone do contato |
| segment | enum | Segmento: `comercio`, `industria`, `servicos`, `agronegocio`, `varejo` |
| creditScore | number | Score de crédito (0-1000) |
| status | enum | Status: `lead`, `pending_approval`, `active`, `inactive` |
| totalReceivables | number | Volume total de recebíveis cedidos |
| approvedLimit | number | Limite de crédito aprovado |
| createdAt | datetime | Data de cadastro |

#### PipelineReceivable (Recebível no Pipeline)
Representa recebíveis individuais em processo de análise/aquisição.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único (PK) |
| cedenteId | string | ID do cedente (FK) |
| cedenteName | string | Nome do cedente (desnormalizado) |
| cedenteCnpj | string | CNPJ do cedente (desnormalizado) |
| invoiceNumber | string | Número da nota fiscal |
| nominalValue | number | Valor nominal do recebível |
| dueDate | date | Data de vencimento |
| debtorName | string | Nome do sacado (devedor) |
| debtorCnpj | string | CNPJ do sacado |
| creditAnalysisStatus | enum | Status: `pending_documents`, `in_analysis`, `approved`, `rejected` |
| riskScore | number | Score de risco calculado (0-100) |
| segment | string | Segmento do recebível |
| rejectionReason | string? | Motivo de rejeição (quando aplicável) |
| createdAt | datetime | Data de entrada no pipeline |

#### ProspectionWorkflow (Workflow de Prospecção)
Representa o fluxo de trabalho da etapa de prospecção de novos cedentes/recebíveis.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único (PK) |
| cedenteId | string | ID do cedente (FK) |
| cedenteName | string | Nome do cedente (desnormalizado) |
| cedenteCnpj | string | CNPJ do cedente (desnormalizado) |
| cedenteSegment | string | Segmento do cedente |
| receivableId | string? | ID do recebível associado (FK, opcional) |
| receivableValue | number | Valor do recebível (quando aplicável) |
| status | enum | Status do workflow (ver estados abaixo) |
| currentStep | string | Etapa atual do processo |
| totalSteps | number | Total de etapas |
| completedSteps | number | Etapas concluídas |
| startedAt | datetime | Início do workflow |
| lastActivityAt | datetime | Última atividade |
| assignedTo | string? | Responsável atribuído |
| pendingItems | string[] | Itens pendentes |
| slaDeadline | datetime? | Prazo do SLA |
| daysInProgress | number | Dias em andamento |
| estimatedVolume | number | Volume estimado de operação |

**Status do Workflow de Prospecção:**
- `lead` - Lead identificado
- `contact` - Em contato
- `documents` - Coleta de documentação
- `credit_analysis` - Análise de crédito
- `approved` - Aprovado

#### MatchingWorkflow (Workflow de Alocação)
Representa o fluxo de trabalho da etapa de alocação de recebíveis em fundos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único (PK) |
| receivableId | string | ID do recebível (FK) |
| receivableNumber | string | Número do recebível/NF |
| cedenteName | string | Nome do cedente |
| cedenteCnpj | string | CNPJ do cedente |
| debtorName | string | Nome do sacado |
| nominalValue | number | Valor nominal |
| dueDate | date | Data de vencimento |
| riskScore | number | Score de risco |
| segment | string | Segmento |
| fundId | string? | ID do fundo selecionado (FK, opcional) |
| fundName | string? | Nome do fundo (desnormalizado) |
| status | enum | Status do workflow (ver estados abaixo) |
| currentStep | string | Etapa atual |
| totalSteps | number | Total de etapas |
| completedSteps | number | Etapas concluídas |
| startedAt | datetime | Início do workflow |
| lastActivityAt | datetime | Última atividade |
| assignedTo | string? | Responsável atribuído |
| pendingItems | string[] | Itens pendentes |
| slaDeadline | datetime? | Prazo do SLA |
| daysInProgress | number | Dias em andamento |
| allocationDate | datetime? | Data de alocação (quando concluído) |

**Status do Workflow de Alocação:**
- `pending_match` - Aguardando seleção de fundo
- `fund_selection` - Fundo em avaliação
- `compliance_check` - Verificação de compliance
- `allocated` - Alocado no fundo

### Relacionamentos

| Origem | Destino | Cardinalidade | Descrição |
|--------|---------|---------------|-----------|
| Cedente | PipelineReceivable | 1:N | Um cedente pode ter múltiplos recebíveis |
| Cedente | ProspectionWorkflow | 1:N | Um cedente pode ter múltiplos workflows de prospecção |
| PipelineReceivable | ProspectionWorkflow | 1:0..1 | Um recebível pode estar associado a um workflow de prospecção |
| PipelineReceivable | MatchingWorkflow | 1:1 | Um recebível aprovado gera um workflow de alocação |
| Fund | MatchingWorkflow | 1:N | Um fundo pode ter múltiplos recebíveis em processo de alocação |

### Fluxo do Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PROSPECÇÃO                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   ┌────────┐    ┌────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌────────┐│
│   │  Lead  │───>│ Em Contato │───>│ Documentação │───>│ Análise Crédito │───>│Aprovado││
│   └────────┘    └────────────┘    └──────────────┘    └─────────────────┘    └────────┘│
│                                                                                     │    │
└─────────────────────────────────────────────────────────────────────────────────────│────┘
                                                                                      │
                                                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ALOCAÇÃO EM FUNDOS                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   ┌────────────────┐    ┌────────────────┐    ┌────────────────────┐    ┌────────────┐ │
│   │ Aguardando     │───>│ Seleção de     │───>│ Verificação        │───>│  Alocado   │ │
│   │ Match          │    │ Fundo          │    │ Compliance         │    │            │ │
│   └────────────────┘    └────────────────┘    └────────────────────┘    └────────────┘ │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Arquivos de Dados

Os dados mockados estão organizados nos seguintes arquivos:

| Arquivo | Entidades |
|---------|-----------|
| `pipelineData.ts` | Fund, Cedente, PipelineReceivable, ProspectionWorkflow, MatchingWorkflow |
| `dashboardData.ts` | KPIs, alertas críticos, atividades recentes |
| `receivablesData.ts` | Recebíveis, transações bancárias, exceções, alertas |
| `investorsData.ts` | Investidores, onboarding, documentos, compliance |
| `chatData.ts` | Conversas, mensagens, respostas do bot |
| `index.ts` | Barrel file (re-exporta todos os dados) |
