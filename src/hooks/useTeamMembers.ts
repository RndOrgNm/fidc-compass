import { useEffect, useState } from "react";
import { useOrganization } from "@clerk/clerk-react";

export interface TeamMember {
  id: string;
  nome: string;
  email: string;
  imageUrl?: string;
}

export function useTeamMembers(): { members: TeamMember[]; isLoaded: boolean } {
  const { organization } = useOrganization();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!organization) return;
    setIsLoaded(false);
    organization
      .getMemberships({ limit: 100 })
      .then(({ data }) => {
        const mapped = data.map((m) => {
          const d = m.publicUserData;
          const nome =
            [d.firstName, d.lastName].filter(Boolean).join(" ").trim() ||
            d.identifier;
          return {
            id: d.userId,
            nome,
            email: d.identifier,
            imageUrl: d.imageUrl ?? undefined,
          };
        });
        console.log("[useTeamMembers] getMemberships →", mapped);
        setMembers(mapped);
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error("[useTeamMembers] error", err);
        setIsLoaded(true);
      });
  }, [organization]);

  return { members, isLoaded };
}
