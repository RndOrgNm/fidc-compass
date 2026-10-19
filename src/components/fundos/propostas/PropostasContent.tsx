import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { DocumentTable } from "@/components/fundos/DocumentTable";
import { PrazoItem } from "@/components/fundos/PrazosContent";
import { PropostaReason } from "@/components/fundos/propostas/PropostaReason";
import { PropostaPdfViewerSheet } from "@/components/fundos/propostas/PropostaPdfViewerSheet";
import type { DocumentoResponse } from "@/lib/api/documentoService";
import type { PropostaDecisao, PropostaDocumento, PropostaFonte, PropostaPrazo } from "@/types/propostas";

/**
 * A document proposal pairs the agent's candidate file with the already
 * existing, pending `doc` row it would complete, plus the short owner name
 * (Ativo/SPE or Gestora) `DocumentTable` needs for its "Criar prazo" prefill.
 */
export interface DocumentoProposalEntry {
  doc: DocumentoResponse;
  proposta: PropostaDocumento;
  contextName: string;
}

export interface PropostasContentProps {
  documentoProposals: DocumentoProposalEntry[];
  prazoProposals: PropostaPrazo[];
  /** How long ago the connector last checked OneDrive — already formatted (e.g. "há 12 min"). */
  lastSyncLabel?: string;
}

interface ViewerState {
  arquivoNome: string;
  startPage: number;
  fontes: PropostaFonte[];
}

/**
 * Orchestrates the "Propostas" tab: one section per proposal kind (Ativos'
 * document links, Prazos' new obligations), each item showing the agent's
 * reasoning above the same card used by the real tab it mirrors
 * (`DocumentTable` for documents, `PrazoItem` for obligations) in proposal
 * mode. No data source of its own — decisions live only in local state until
 * a backend exists to persist them.
 */
export function PropostasContent({
  documentoProposals,
  prazoProposals,
  lastSyncLabel = "há poucos minutos",
}: PropostasContentProps) {
  const [decisions, setDecisions] = useState<Record<string, PropostaDecisao>>({});
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const decide = (id: string, decision: PropostaDecisao | null) => {
    setDecisions((prev) => {
      const next = { ...prev };
      if (decision) next[id] = decision;
      else delete next[id];
      return next;
    });
  };

  const openSource = (arquivoNome: string, fontes: PropostaFonte[], page: number) =>
    setViewer({ arquivoNome, startPage: page, fontes });

  return (
    <div>
      <div className="mb-5 flex items-center justify-end gap-3">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5" /> OneDrive verificado {lastSyncLabel}
        </span>
      </div>

      {documentoProposals.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[15px] font-semibold text-foreground">Ativos</span>
            <span className="h-px flex-1 bg-border" />
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {documentoProposals.length}
            </span>
          </div>
          <div className="flex flex-col gap-5">
            {documentoProposals.map(({ doc, proposta, contextName }) => {
              const decision = decisions[proposta.id] ?? null;
              return (
                <div key={proposta.id}>
                  {!decision && (
                    <PropostaReason
                      raciocinio={proposta.raciocinio}
                      fontes={proposta.fontes}
                      arquivoNome={proposta.arquivo.nome}
                      onOpenSource={(page) => openSource(proposta.arquivo.nome, proposta.fontes, page)}
                    />
                  )}
                  <div className="rounded-lg border border-l-[3px] border-border border-l-primary bg-card/50 px-5 py-4">
                    <div className="mb-3 text-sm font-semibold text-foreground">{contextName}</div>
                    <DocumentTable
                      docs={[doc]}
                      contextName={contextName}
                      orderBy={undefined}
                      orderDir="asc"
                      onSortChange={() => {}}
                      onView={() => {}}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      onCreatePrazo={() => {}}
                      onVerPrazo={() => {}}
                      emptyMessage=""
                      proposal={{
                        proposta,
                        decision,
                        onApprove: () => decide(proposta.id, { tipo: "aprovada" }),
                        onReject: (motivo) => decide(proposta.id, { tipo: "rejeitada", motivo }),
                        onUndo: () => decide(proposta.id, null),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {prazoProposals.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[15px] font-semibold text-foreground">Prazos</span>
            <span className="h-px flex-1 bg-border" />
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {prazoProposals.length}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {prazoProposals.map((proposta) => {
              const decision = decisions[proposta.id] ?? null;
              return (
                <div key={proposta.id}>
                  {!decision && (
                    <PropostaReason
                      raciocinio={proposta.raciocinio}
                      fontes={proposta.fontes}
                      arquivoNome={proposta.arquivo.nome}
                      onOpenSource={(page) => openSource(proposta.arquivo.nome, proposta.fontes, page)}
                    />
                  )}
                  <PrazoItem
                    proposal={{
                      proposta,
                      decision,
                      onApprove: () => decide(proposta.id, { tipo: "aprovada" }),
                      onReject: (motivo) => decide(proposta.id, { tipo: "rejeitada", motivo }),
                      onUndo: () => decide(proposta.id, null),
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {documentoProposals.length === 0 && prazoProposals.length === 0 && (
        <p className="py-10 text-center text-[13px] text-muted-foreground">
          Nenhuma proposta pendente no momento.
        </p>
      )}

      <PropostaPdfViewerSheet
        open={viewer != null}
        onOpenChange={(o) => !o && setViewer(null)}
        arquivoNome={viewer?.arquivoNome ?? ""}
        fileData={null}
        startPage={viewer?.startPage ?? 1}
        fontes={viewer?.fontes ?? []}
      />
    </div>
  );
}
