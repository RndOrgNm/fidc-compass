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
  it("carries the chunk's page range and id", () => {
    expect(
      normalizeFontes([
        { chunk_id: "c12", trecho: "Balancete trimestral", page: 3, page_end: 4, texto: "Texto completo." },
      ]),
    ).toEqual([
      { trecho: "Balancete trimestral", page: 3, pageEnd: 4, texto: "Texto completo.", chunkId: "c12" },
    ]);
  });

  it("keeps the page null when the source has none (Word) or it is not a valid page", () => {
    const [word, bad] = normalizeFontes([
      { chunk_id: "c5", trecho: "Um parágrafo", page: null, texto: "Um parágrafo." },
      { trecho: "x", page: 0, texto: "x" },
    ]);

    expect(word.page).toBeNull();
    expect(bad.page).toBeNull();
  });

  it("falls back between trecho and texto, and accepts the portuguese page key", () => {
    expect(normalizeFontes([{ pagina: 3, trecho: "cl. 4" }, { texto: "x" }, "solto"])).toEqual([
      { trecho: "cl. 4", page: 3, pageEnd: null, texto: "cl. 4", chunkId: undefined },
      { trecho: "x", page: null, pageEnd: null, texto: "x", chunkId: undefined },
      { trecho: "solto", page: null, texto: "solto" },
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

  it("carries the source file's name and download url when the proposal has one", () => {
    const out = prazoProposals([
      {
        id: "1", topico: "Balancete", categoria: "REGULATORIO", ativa: true, responsaveis: [],
        proposta: true, arquivo_origem_nome: "Acordo.pdf", download_url: "https://files.example/a.pdf",
      } as ObrigacaoResponse,
    ]);

    expect(out[0].arquivo.nome).toBe("Acordo.pdf");
    expect(out[0].fileUrl).toBe("https://files.example/a.pdf");
  });

  it("carries the OneDrive link of the source file", () => {
    const out = prazoProposals([
      {
        id: "1", topico: "x", categoria: "REGULATORIO", ativa: true, responsaveis: [],
        proposta: true, onedrive_url: "https://onedrive.example/a",
      } as ObrigacaoResponse,
    ]);

    expect(out[0].onedriveUrl).toBe("https://onedrive.example/a");
  });

  it("has no file url when the proposal came without a source file", () => {
    const out = prazoProposals([
      { id: "1", topico: "x", categoria: "REGULATORIO", ativa: true, responsaveis: [], proposta: true } as ObrigacaoResponse,
    ]);

    expect(out[0].fileUrl).toBeNull();
  });
});
