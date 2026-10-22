import { describe, expect, it } from "vitest";

import { documentoProposals, normalizeFontes, prazoProposals } from "./propostaMapper";
import type { DocumentoResponse, FundoDocumentosResponse } from "./documentoService";
import type { ObrigacaoResponse } from "./prazoService";

const baseDoc = {
  tipo: "balancete",
  cadencia: "mensal",
  status: "pendente",
  criado_em: "2026-10-01T00:00:00",
  atualizado_em: "2026-10-01T00:00:00",
} as const;

function doc(over: Partial<DocumentoResponse>): DocumentoResponse {
  return { id: "d1", ...baseDoc, ...over } as DocumentoResponse;
}

describe("normalizeFontes", () => {
  it("accepts both portuguese and english keys and defaults the page", () => {
    expect(normalizeFontes([{ pagina: 3, trecho: "cl. 4" }, { texto: "x" }, "solto"])).toEqual([
      { trecho: "cl. 4", page: 3, texto: "cl. 4" },
      { trecho: "x", page: 1, texto: "x" },
      { trecho: "solto", page: 1, texto: "" },
    ]);
  });

  it("returns an empty list for missing input", () => {
    expect(normalizeFontes(null)).toEqual([]);
  });
});

describe("documentoProposals", () => {
  it("keeps only pending file proposals, from the fund card and its assets", () => {
    const res = {
      fundo: {
        ativo_id: "f",
        nome: "Fundo",
        documentos: [doc({ id: "a", proposta: true, tipo_proposta: "arquivo", arquivo_nome: "a.pdf", confianca: "alta" })],
      },
      assets: [
        {
          ativo_id: "s",
          nome: "SPE 1",
          documentos: [
            doc({ id: "b", proposta: true, tipo_proposta: "regra_prazo_nova" }),
            doc({ id: "c", proposta: false }),
            doc({ id: "d", proposta: true, tipo_proposta: "arquivo", raciocinio: "porque" }),
          ],
        },
      ],
    } as FundoDocumentosResponse;

    const out = documentoProposals(res);

    expect(out.map((e) => [e.proposta.id, e.contextName])).toEqual([
      ["a", "Fundo"],
      ["d", "SPE 1"],
    ]);
    expect(out[0].proposta.confianca).toBe("alta");
    expect(out[1].proposta.raciocinio).toBe("porque");
  });
});

describe("prazoProposals", () => {
  it("maps pending active obligations and skips the rest", () => {
    const ob = (over: Partial<ObrigacaoResponse>) =>
      ({ id: "o", topico: "Balancete", categoria: "REGULATORIO", ativa: true, responsaveis: [], ...over }) as ObrigacaoResponse;

    const out = prazoProposals([
      ob({ id: "1", proposta: true, responsaveis: [{ id: "u", nome: "Ana" }] }),
      ob({ id: "2", proposta: false }),
      ob({ id: "3", proposta: true, ativa: false }),
    ]);

    expect(out).toHaveLength(1);
    expect(out[0].sugestao.responsaveis).toEqual(["Ana"]);
  });
});
