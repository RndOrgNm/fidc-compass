import type { Categoria } from "@/lib/api/prazoService";

/**
 * Shared types for the connector agent's proposals.
 *
 * Mapped from the funds-pipeline `proposta` fields by `lib/api/propostaMapper`;
 * the components here don't know where the data comes from.
 */

export interface PropostaFonte {
  /** Short source label — e.g. "Cláusula 4.2 · índice e data-base". */
  trecho: string;
  /** Page of the document where the source appears. */
  page: number;
  /** Quoted excerpt, shown next to the page when the document is opened. */
  texto: string;
}

export type PropostaDecisao =
  | { tipo: "aprovada" }
  | { tipo: "rejeitada"; motivo: string };

export interface PropostaArquivo {
  nome: string;
  paginas: number;
}

/**
 * Proposal linking a candidate file to a row that already exists in
 * `DocumentTable` (a document owed, pending or not, by an Ativo/Fundo).
 */
export interface PropostaDocumento {
  id: string;
  /** id of the `DocumentoResponse` (real table row) this proposal would complete. */
  documentoId: string;
  arquivo: PropostaArquivo;
  /** Reference period the proposal would assign to the document. */
  periodoReferencia?: string;
  confianca: "alta" | "media" | "baixa";
  raciocinio: string;
  fontes: PropostaFonte[];
}

/**
 * Proposal to create a new obligation (Prazo) from reading a source document.
 * The `sugestao` fields are a loose subset of `ObrigacaoFormInitial`'s fields
 * — the reject/approve flow doesn't create the obligation itself, it only
 * proposes the values.
 */
export interface PropostaPrazo {
  id: string;
  arquivo: PropostaArquivo;
  sugestao: {
    topico: string;
    categoria: Categoria;
    /** Proposed due date (ISO yyyy-mm-dd), when the source document states one. */
    dataVencimento?: string;
    observacao?: string;
    responsaveis?: string[];
  };
  raciocinio: string;
  fontes: PropostaFonte[];
}
