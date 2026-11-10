import {
  getSkillVersion,
  listAgentVersions,
  listAgents,
  listMcpServers,
  listModels,
  patchAgent,
  patchSkill,
  publishAgent,
  publishSkill,
  type AgentVersion,
  type SkillRef,
  type SkillVersion,
} from "@/lib/api/agentConfigService";
import { ApiRequestError } from "@/lib/api/threadsService";
import {
  MODEL_OPTIONS,
  contentOf,
  publishedOf,
  sameContent,
  slugOf,
  type AgentConfig,
  type ConfigContent,
  type VersionView,
} from "@/lib/agentConfig";

async function configOf(latest: AgentVersion): Promise<AgentConfig> {
  const [versions, mcps, models] = await Promise.all([
    listAgentVersions(latest.id),
    listMcpServers(),
    // an older registry has no /models: the menu then offers the models the page knows
    listModels().catch(() => MODEL_OPTIONS),
  ]);

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
    skills: agent.skills
      .map((ref) => skills.get(`${ref.id}@${ref.version}`))
      .filter((s): s is SkillVersion => s !== undefined),
  }));
  const newest = versions.at(-1) ?? latest;
  return {
    id: newest.id,
    slug: slugOf(newest.name),
    name: newest.name,
    description: newest.description,
    versions: views,
    mcps: mcps.filter((m) => newest.mcps.includes(m.id)),
    models,
  };
}

/** The agents the registry marks as the page's, with every version, their skills and MCP servers. */
export async function loadAgentConfigs(): Promise<AgentConfig[]> {
  const agents = await listAgents();
  return Promise.all(agents.filter((a) => a.managed_in_page).map(configOf));
}

/**
 * Keeps what was typed as the draft: the instructions of each skill that changed go to the skill (a
 * new draft of it when its latest version is published), then the draft of the agent points at
 * those versions, and at the ones it had for the skills that did not change.
 */
export async function saveDraft(config: AgentConfig, content: ConfigContent): Promise<void> {
  const latest = config.versions.at(-1);
  if (!latest) throw new Error("The agent has no version");
  const had = new Map(latest.skills.map((s) => [s.id, s]));
  const skills: SkillRef[] = [];
  for (const [id, text] of Object.entries(content.skills)) {
    const ref = latest.agent.skills.find((r) => r.id === id);
    if (ref && had.get(id)?.instructions === text) {
      skills.push(ref);
      continue;
    }
    const saved = await patchSkill(id, { instructions: text });
    skills.push({ id: saved.id, version: saved.version });
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
