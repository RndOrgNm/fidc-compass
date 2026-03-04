# FIDC Compass

Sistema de gestão para fundos de direitos creditórios (FIDC), focado em **Pipeline de Investimentos** e **Chatbot**.

## Funcionalidades

- **Home** – Página inicial com acesso aos módulos
- **Pipeline** – Mesa de Crédito com Gestão de Cedentes, Mesa de Operações e Monitoramento
- **Chatbot** – Assistente inteligente para consultas e análises

## Tecnologias

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- TanStack Query

## Como executar

```sh
# Instalar dependências
npm i

# Modo desenvolvimento
npm run dev

# Build de produção
npm run build
```

## Estrutura

O fidc-compass é uma versão enxuta do fidic-compass, mantendo apenas:

- Pipeline (Cedentes, Recebíveis/Mesa de Operações, Monitoramento)
- Agente/Chatbot
- Página inicial

Foram removidos: Dashboard, Gestão de Recebimentos e CRM.
