import { FUNDS_AGENT_API_URL } from "./config";
import { apiFetch } from "./client";
import { ApiRequestError } from "./threadsService";

export type VersionStatus = "draft" | "published";

export interface SkillRef {
  id: string;
  version: number;
}

export interface MiddlewareSpec {
  name: string;
  config: Record<string, unknown>;
}

/** One version of an agent of the registry. */
export interface AgentVersion {
  id: string;
  version: number;
  status: VersionStatus;
  name: string;
  description: string;
  engine: string;
  provider: string;
  model: string;
  instructions: string;
  skills: SkillRef[];
  mcps: string[];
  middlewares: MiddlewareSpec[];
  output_schema: Record<string, unknown> | null;
  visible_in_chat: boolean;
  /** The configuration page owns this agent's model, prompt and skills. */
  managed_in_page: boolean;
  created_at: string;
  created_by: string | null;
}

/** One version of a skill of the registry. */
export interface SkillVersion {
  id: string;
  version: number;
  status: VersionStatus;
  name: string;
  description: string;
  instructions: string;
  active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface McpServer {
  id: string;
  name: string;
  active: boolean;
}

/** A model an agent may use, as GET /models offers it. */
export interface ModelOption {
  provider: string;
  model: string;
  label: string;
}

export interface AgentChanges {
  provider?: string;
  model?: string;
  instructions?: string;
  skills?: SkillRef[];
}

/** The detail of an error: a text, or the list of problems a publication found. */
async function failure(response: Response): Promise<ApiRequestError> {
  let detail: unknown;
  try {
    detail = (await response.json()).detail;
  } catch {
    detail = undefined;
  }
  const text = Array.isArray(detail)
    ? detail.map(String).join("; ")
    : typeof detail === "string"
      ? detail
      : response.statusText || `HTTP ${response.status}`;
  return new ApiRequestError(response.status, text);
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw await failure(response);
  return response.json();
}

function send(path: string, method: "PATCH" | "POST", body?: unknown): Promise<Response> {
  return apiFetch(`${FUNDS_AGENT_API_URL}${path}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** The latest version of every agent, published or not. */
export async function listAgents(): Promise<AgentVersion[]> {
  const response = await apiFetch(`${FUNDS_AGENT_API_URL}/agents`);
  return (await json<{ agents: AgentVersion[] }>(response)).agents;
}

/** Every version of an agent, oldest first. */
export async function listAgentVersions(agentId: string): Promise<AgentVersion[]> {
  const response = await apiFetch(`${FUNDS_AGENT_API_URL}/agents/${encodeURIComponent(agentId)}/versions`);
  return (await json<{ agents: AgentVersion[] }>(response)).agents;
}

export async function getSkillVersion(skillId: string, version: number): Promise<SkillVersion> {
  const response = await apiFetch(`${FUNDS_AGENT_API_URL}/skills/${encodeURIComponent(skillId)}/versions/${version}`);
  return json<SkillVersion>(response);
}

export async function listMcpServers(): Promise<McpServer[]> {
  const response = await apiFetch(`${FUNDS_AGENT_API_URL}/mcp-servers`);
  return (await json<{ mcp_servers: McpServer[] }>(response)).mcp_servers;
}

export async function listModels(): Promise<ModelOption[]> {
  const response = await apiFetch(`${FUNDS_AGENT_API_URL}/models`);
  return (await json<{ models: ModelOption[] }>(response)).models;
}

/** Edits the latest version when it is a draft; on a published one, creates the next, as a draft. */
export async function patchAgent(agentId: string, changes: AgentChanges): Promise<AgentVersion> {
  return json<AgentVersion>(await send(`/agents/${encodeURIComponent(agentId)}`, "PATCH", changes));
}

export async function patchSkill(skillId: string, changes: { instructions: string }): Promise<SkillVersion> {
  return json<SkillVersion>(await send(`/skills/${encodeURIComponent(skillId)}`, "PATCH", changes));
}

export async function publishAgent(agentId: string, version: number): Promise<AgentVersion> {
  return json<AgentVersion>(await send(`/agents/${encodeURIComponent(agentId)}/versions/${version}/publish`, "POST"));
}

export async function publishSkill(skillId: string, version: number): Promise<SkillVersion> {
  return json<SkillVersion>(await send(`/skills/${encodeURIComponent(skillId)}/versions/${version}/publish`, "POST"));
}
