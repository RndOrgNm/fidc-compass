// Funds Pipeline API (funds-pipeline backend)
const rawFundsUrl = import.meta.env.VITE_FUNDS_API_URL || "http://localhost:8000";
export const FUNDS_API_BASE_URL = rawFundsUrl.replace(/\/+$/, "");

// Agent Services API (LangChain agents with MCP tools — /pipeline/ask, /search/ask)
const rawFundsAgentUrl = import.meta.env.VITE_FUNDS_AGENT_URL || "http://localhost:8001";
export const FUNDS_AGENT_API_URL = rawFundsAgentUrl.replace(/\/+$/, "");

// Conversation Service (shared persistence for all agents)
const rawConvUrl = import.meta.env.VITE_CONVERSATION_SERVICE_URL || "http://localhost:8002";
export const CONVERSATION_SERVICE_URL = rawConvUrl.replace(/\/+$/, "");

// PDF viewer for CVM sources (resol175consolid.pdf) — served by agent-services at /static/pdf/
const rawRagUrl = import.meta.env.VITE_RAG_API_URL || import.meta.env.VITE_FUNDS_AGENT_URL || "http://localhost:8001";
export const RAG_API_BASE_URL = rawRagUrl.replace(/\/+$/, "");
