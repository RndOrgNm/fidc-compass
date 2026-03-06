# FIDC Compass

Sistema de gestão para fundos de direitos creditórios (FIDC), focado em **Pipeline de Investimentos** e **Chatbot**.

## Funcionalidades

- **Home** – Página inicial com acesso aos módulos
- **Pipeline** – Mesa de Crédito com Gestão de Cedentes e Mesa de Operações
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

- Pipeline (Cedentes, Recebíveis/Mesa de Operações)
- Agente/Chatbot
- Página inicial

Foram removidos: Dashboard, Gestão de Recebimentos e CRM.
