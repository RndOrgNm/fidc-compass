import type { DocumentoResponse, FundoDocumentosResponse } from "./documentoService";
import type { ObrigacaoResponse } from "./prazoService";
import type { DocumentoProposalEntry } from "@/components/fundos/propostas/PropostasContent";
import type { PropostaFonte, PropostaPrazo } from "@/types/propostas";

/** The agent writes sources as free-form JSON; accept the spellings it may use. */
export function normalizeFontes(raw: unknown[] | null | undefined): PropostaFonte[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item === "string") return [{ trecho: item, page: 1, texto: "" }];
    if (!item || typeof item !== "object") return [];
    const f = item as Record<string, unknown>;
    const page = Number(f.page ?? f.pagina ?? 1);
    const trecho = String(f.trecho ?? f.texto ?? "");
    const texto = String(f.texto ?? f.trecho ?? "");
    return [{ trecho, page: Number.isFinite(page) && page > 0 ? page : 1, texto }];
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
      arquivo: { nome: o.resumo_arquivo ?? "documento de origem", paginas: 0 },
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
