import { useQuery } from "@tanstack/react-query";

import { loadAgentConfigs } from "@/lib/agentConfigActions";

export const agentConfigsKey = ["agent-configs"] as const;

/** The agents the configuration page offers, with their versions. */
export function useAgentConfigs() {
  return useQuery({ queryKey: agentConfigsKey, queryFn: loadAgentConfigs });
}
