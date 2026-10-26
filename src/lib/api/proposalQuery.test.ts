import { afterEach, describe, expect, it, vi } from "vitest";

import { listDocumentosByFundo } from "./documentoService";
import { listObrigacoes } from "./prazoService";

// The two list calls the Propostas tab shares with the Ativos and Prazos tabs: only the
// Propostas tab asks for the pending proposals.
function stubFetch() {
  // A fresh response per call: a body can only be read once.
  const fetchMock = vi.fn().mockImplementation(
    async () =>
      new Response(JSON.stringify({ items: [], fundo: { documentos: [] }, assets: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const requestedUrl = (fetchMock: ReturnType<typeof vi.fn>) => new URL(String(fetchMock.mock.calls[0][0]));

describe("asking for pending proposals", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("leaves them out of the rules and documents lists by default", async () => {
    const fetchMock = stubFetch();

    await listObrigacoes({ fundo_id: 1 });
    expect(requestedUrl(fetchMock).searchParams.has("include_proposals")).toBe(false);

    fetchMock.mockClear();
    await listDocumentosByFundo(1);
    expect(requestedUrl(fetchMock).searchParams.has("include_proposals")).toBe(false);
  });

  it("asks for them with include_proposals when told to", async () => {
    const fetchMock = stubFetch();

    await listObrigacoes({ fundo_id: 1 }, { includeProposals: true });
    expect(requestedUrl(fetchMock).searchParams.get("include_proposals")).toBe("true");
    expect(requestedUrl(fetchMock).searchParams.get("fundo_id")).toBe("1");

    fetchMock.mockClear();
    await listDocumentosByFundo(1, undefined, "asc", { includeProposals: true });
    expect(requestedUrl(fetchMock).searchParams.get("include_proposals")).toBe("true");
  });
});
