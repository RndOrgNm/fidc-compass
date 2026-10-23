import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePropostas } from "./usePropostas";

const listDocumentosByFundo = vi.fn();
const listObrigacoes = vi.fn();
vi.mock("@/lib/api/documentoService", () => ({
  listDocumentosByFundo: (...args: unknown[]) => listDocumentosByFundo(...args),
}));
vi.mock("@/lib/api/prazoService", () => ({
  listObrigacoes: (...args: unknown[]) => listObrigacoes(...args),
}));

const emptyDocs = { fundo: { nome: "Fundo", documentos: [] }, assets: [] };
const obrigacao = (topico: string) => ({
  id: topico, topico, categoria: "OPERACIONAL", ativa: true, proposta: true, responsaveis: [],
});

describe("usePropostas", () => {
  beforeEach(() => {
    listDocumentosByFundo.mockReset().mockResolvedValue(emptyDocs);
    listObrigacoes.mockReset().mockResolvedValue({ items: [obrigacao("Antes")] });
  });

  it("loads the proposals of the fund", async () => {
    const { result } = renderHook(() => usePropostas(1));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prazoProposals.map((p) => p.sugestao.topico)).toEqual(["Antes"]);
  });

  it("reloads without flashing the loading state, keeping the cards on screen", async () => {
    const { result } = renderHook(() => usePropostas(1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    listObrigacoes.mockResolvedValue({ items: [obrigacao("Depois")] });

    act(() => result.current.reload());

    expect(result.current.loading).toBe(false);
    expect(result.current.prazoProposals).toHaveLength(1);
    await waitFor(() =>
      expect(result.current.prazoProposals.map((p) => p.sugestao.topico)).toEqual(["Depois"]),
    );
    expect(listObrigacoes).toHaveBeenCalledTimes(2);
  });
});
