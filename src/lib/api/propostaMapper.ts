import type { DocumentoResponse, FundoDocumentosResponse } from "./documentoService";
import type { ObrigacaoResponse } from "./prazoService";
import type { DocumentoProposalEntry } from "@/components/fundos/propostas/PropostasContent";
import type { PropostaFonte, PropostaPrazo } from "@/types/propostas";

function pageOrNull(value: unknown): number | null {
  const n = Number(value);
  return value != null && Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Sources come from the connector agent's document chunks: `page` is null for
 * Word (no pages), `page_end` is set when a chunk spans several pages.
 */
export function normalizeFontes(raw: unknown[] | null | undefined): PropostaFonte[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item === "string") return [{ trecho: item, page: null, texto: item }];
    if (!item || typeof item !== "object") return [];
    const f = item as Record<string, unknown>;
    const trecho = String(f.trecho ?? f.texto ?? "");
    return [
      {
        trecho,
        page: pageOrNull(f.page ?? f.pagina),
        pageEnd: pageOrNull(f.page_end),
        texto: String(f.texto ?? f.trecho ?? ""),
        chunkId: typeof f.chunk_id === "string" ? f.chunk_id : undefined,
      },
    ];
  });
}

export function documentoProposals(res: FundoDocumentosResponse): DocumentoProposalEntry[] {
  const groups = [
    { contextName: res.fundo.nome, docs: res.fundo.documentos },
    ...res.assets.map((a) => ({ contextName: a.nome, docs: a.documentos })),
  ];
  return groups.flatMap(({ contextName, docs }) =>
    docs
      .filter((d: DocumentoResponse) => d.proposta && d.tipo_proposta === "arquivo")
      .map((doc) => ({
        doc,
        contextName,
        proposta: {
          id: doc.id,
          documentoId: doc.id,
          arquivo: { nome: doc.arquivo_nome ?? "arquivo", paginas: 0 },
          periodoReferencia: doc.periodo_referencia ?? undefined,
          confianca: doc.confianca ?? "media",
          raciocinio: doc.raciocinio ?? "",
          fontes: normalizeFontes(doc.fontes),
        },
      })),
  );
}

export function prazoProposals(obrigacoes: ObrigacaoResponse[]): PropostaPrazo[] {
  return obrigacoes
    .filter((o) => o.proposta && o.ativa)
    .map((o) => ({
      id: o.id,
      arquivo: { nome: o.arquivo_origem_nome ?? o.resumo_arquivo ?? "documento de origem", paginas: 0 },
      fileUrl: o.download_url ?? null,
      sugestao: {
        topico: o.topico,
        categoria: o.categoria,
        observacao: o.observacao ?? undefined,
        responsaveis: o.responsaveis.map((r) => r.nome),
      },
      raciocinio: o.raciocinio ?? "",
      fontes: normalizeFontes(o.fontes),
    }));
}
