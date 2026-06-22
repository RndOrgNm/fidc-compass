import { useOrganization } from "@clerk/clerk-react";

export interface TeamMember {
  id: string;
  nome: string;
  email: string;
  imageUrl?: string;
}

export function useTeamMembers(): { members: TeamMember[]; isLoaded: boolean } {
  const { isLoaded, organization, memberships } = useOrganization({
    memberships: { pageSize: 100 },
  });

  console.debug("[useTeamMembers]", { isLoaded, orgId: organization?.id, membershipsCount: memberships?.data?.length });

  if (!isLoaded || !memberships?.data) {
    return { members: [], isLoaded: false };
  }

  const members: TeamMember[] = memberships.data.map((m) => {
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

  return { members, isLoaded: true };
}
