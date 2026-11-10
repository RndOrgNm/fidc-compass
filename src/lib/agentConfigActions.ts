import {
  getSkillVersion,
  listAgentVersions,
  listAgents,
  listMcpServers,
  patchAgent,
  patchSkill,
  publishAgent,
  publishSkill,
  type AgentVersion,
  type SkillVersion,
} from "@/lib/api/agentConfigService";
import { ApiRequestError } from "@/lib/api/threadsService";
import {
  CONFIGURABLE_AGENTS,
  EDITABLE_SKILL,
  contentOf,
  publishedOf,
  sameContent,
  slugOf,
  type AgentConfig,
  type ConfigContent,
  type VersionView,
} from "@/lib/agentConfig";

async function configOf(latest: AgentVersion): Promise<AgentConfig> {
  const [versions, mcps] = await Promise.all([listAgentVersions(latest.id), listMcpServers()]);

  const refs = new Map<string, { id: string; version: number }>();
  for (const v of versions) for (const ref of v.skills) refs.set(`${ref.id}@${ref.version}`, ref);
  const skills = new Map<string, SkillVersion>();
  await Promise.all(
    [...refs].map(async ([key, ref]) => {
      skills.set(key, await getSkillVersion(ref.id, ref.version));
    }),
  );

  const views: VersionView[] = versions.map((agent) => ({
    agent,
    skill:
      agent.skills
        .map((ref) => skills.get(`${ref.id}@${ref.version}`))
        .find((s): s is SkillVersion => s?.name === EDITABLE_SKILL) ?? null,
  }));
  const newest = versions.at(-1) ?? latest;
  return {
    id: newest.id,
    slug: slugOf(newest.name),
    name: newest.name,
    description: newest.description,
    versions: views,
    mcps: mcps.filter((m) => newest.mcps.includes(m.id)),
  };
}

/** The agents the page offers, with every version, its skill and its MCP servers. */
export async function loadAgentConfigs(): Promise<AgentConfig[]> {
  const agents = await listAgents();
  const offered = agents.filter((a) => CONFIGURABLE_AGENTS.includes(a.name));
  return Promise.all(offered.map(configOf));
}

/**
 * Keeps what was typed as the draft: the skill's instructions go to the skill (a new draft of it
 * when its latest version is published), then the draft of the agent points at that version.
 */
export async function saveDraft(config: AgentConfig, content: ConfigContent): Promise<void> {
  const latest = config.versions.at(-1);
  if (!latest) throw new Error("The agent has no version");
  let skills = latest.agent.skills;
  if (latest.skill && content.skill !== latest.skill.instructions) {
    const saved = await patchSkill(latest.skill.id, { instructions: content.skill });
    skills = skills.map((ref) => (ref.id === saved.id ? { id: saved.id, version: saved.version } : ref));
  }
  await patchAgent(config.id, {
    provider: content.provider,
    model: content.model,
    instructions: content.prompt,
    skills,
  });
}

/**
 * Makes the draft the version in use: saves what was typed, publishes the skill the draft points
 * at, then the draft. `expectedVersion` is the number the person saw in the dialog: when the
 * agent moved on in the meantime, nothing is published.
 */
export async function publishDraft(
  config: AgentConfig,
  content: ConfigContent,
  expectedVersion: number,
): Promise<AgentVersion> {
  const latest = config.versions.at(-1);
  if (latest && !sameContent(contentOf(latest), content)) await saveDraft(config, content);

  const draft = (await listAgentVersions(config.id)).at(-1);
  if (!draft || draft.status !== "draft" || draft.version !== expectedVersion) {
    throw new ApiRequestError(409, "Outra pessoa mudou este agente enquanto você editava.");
  }
  for (const ref of draft.skills) {
    if ((await getSkillVersion(ref.id, ref.version)).status === "draft") {
      try {
        await publishSkill(ref.id, ref.version);
      } catch (error) {
        // someone published it between the read and now: it is what we wanted
        if (!(error instanceof ApiRequestError && error.status === 409)) throw error;
      }
    }
  }
  return publishAgent(config.id, draft.version);
}

/** The registry deletes no draft: it is taken back to the version in use, and then is no draft. */
export async function discardDraft(config: AgentConfig): Promise<void> {
  const published = publishedOf(config);
  const latest = config.versions.at(-1);
  if (!published || !latest || latest.agent.status === "published") return;
  await patchAgent(config.id, {
    provider: published.agent.provider,
    model: published.agent.model,
    instructions: published.agent.instructions,
    skills: published.agent.skills,
  });
}
