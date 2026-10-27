import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { DocumentTable } from "@/components/fundos/DocumentTable";
import { PrazoItem } from "@/components/fundos/PrazosContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropostaReason } from "@/components/fundos/propostas/PropostaReason";
import { PropostaPdfViewerSheet } from "@/components/fundos/propostas/PropostaPdfViewerSheet";
import { PropostaDocumentoEditDialog } from "@/components/fundos/propostas/PropostaDocumentoEditDialog";
import { ObrigacaoFormDialog } from "@/components/fundos/prazos/ObrigacaoFormDialog";
import { usePdfBytes } from "@/hooks/usePdfBytes";
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

export type PropostaKind = "documento" | "obrigacao";

type ProposalTab = "ativos" | "prazos";

function CountBadge({ count }: { count: number }) {
  return (
    <span className="rounded-full bg-background/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {count}
    </span>
  );
}

export interface PropostasContentProps {
  documentoProposals: DocumentoProposalEntry[];
  prazoProposals: PropostaPrazo[];
  /**
   * Save a decision. When both are given the decision is shown only after the save
   * succeeds, and cannot be undone here; without them it stays in local state, undoable.
   */
  onApprove?: (kind: PropostaKind, id: string) => Promise<void>;
  onReject?: (kind: PropostaKind, id: string, motivo: string) => Promise<void>;
  /**
   * Called after an edit of a proposal is saved, so the list can be reloaded. Without it the
   * cards have no "Editar" button. An edit never approves: the proposal stays pending.
   */
  onChanged?: () => void;
  /**
   * How long ago the connector last checked OneDrive — already formatted (e.g. "há 12 min").
   * The line is always shown: when the time is unknown it says so, rather than making one up.
   */
  lastSyncLabel?: string;
}

interface ViewerState {
  arquivoNome: string;
  fonte: PropostaFonte;
  /** Where the file can be downloaded from, when the proposal has one. */
  fileUrl?: string | null;
  /** Where the original file is in the OneDrive, for the panel's "Abrir no OneDrive" button. */
  onedriveUrl?: string | null;
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
  onApprove,
  onReject,
  onChanged,
  lastSyncLabel,
}: PropostasContentProps) {
  const [decisions, setDecisions] = useState<Record<string, PropostaDecisao>>({});
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentoProposalEntry | null>(null);
  const [editingPrazo, setEditingPrazo] = useState<PropostaPrazo | null>(null);
  const persisted = onApprove != null && onReject != null;

  // Until the reader picks a tab, it follows the data: Ativos if there are any, else Prazos.
  const [chosenTab, setChosenTab] = useState<ProposalTab | null>(null);
  const activeTab: ProposalTab = chosenTab ?? (documentoProposals.length > 0 ? "ativos" : "prazos");
  // A saved decision takes the card off the tab (the list is reloaded right after); a local-only
  // decision keeps it on screen so it can be undone. Either way the count is what is still pending.
  const visibleDocumentos = persisted
    ? documentoProposals.filter((p) => !decisions[p.proposta.id])
    : documentoProposals;
  const visiblePrazos = persisted ? prazoProposals.filter((p) => !decisions[p.id]) : prazoProposals;
  const pendingDocumentos = documentoProposals.filter((p) => !decisions[p.proposta.id]).length;
  const pendingPrazos = prazoProposals.filter((p) => !decisions[p.id]).length;

  // Builds the approve/reject/undo callbacks a proposal card needs.
  const actionsFor = (kind: PropostaKind, id: string) => {
    const save = async (decision: PropostaDecisao, request?: () => Promise<void>) => {
      try {
        await request?.();
        setSaveError(null);
        decide(id, decision);
        if (request) onChanged?.();
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Não foi possível salvar a decisão");
      }
    };
    return {
      onApprove: () => save({ tipo: "aprovada" }, onApprove && (() => onApprove(kind, id))),
      onReject: (motivo: string) =>
        save({ tipo: "rejeitada", motivo }, onReject && (() => onReject(kind, id, motivo))),
      onUndo: persisted ? undefined : () => decide(id, null),
    };
  };

  const decide = (id: string, decision: PropostaDecisao | null) => {
    setDecisions((prev) => {
      const next = { ...prev };
      if (decision) next[id] = decision;
      else delete next[id];
      return next;
    });
  };

  // Only a PDF can be drawn by the viewer; anything else shows the cited text alone.
  const isPdf = viewer != null && /\.pdf$/i.test(viewer.arquivoNome);
  const file = usePdfBytes(isPdf ? viewer.fileUrl : null);

  const openSource = (
    arquivoNome: string,
    fonte: PropostaFonte,
    fileUrl?: string | null,
    onedriveUrl?: string | null,
  ) => setViewer({ arquivoNome, fonte, fileUrl, onedriveUrl });

  return (
    <div>
      <div className="mb-5 flex items-center justify-end gap-3">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5" />
          {lastSyncLabel ? `OneDrive verificado ${lastSyncLabel}` : "OneDrive: última verificação indisponível"}
        </span>
      </div>

      {saveError && (
        <p role="alert" className="mb-4 text-[13px] text-destructive">
          {saveError}
        </p>
      )}

      {visibleDocumentos.length + visiblePrazos.length > 0 && (
        <Tabs value={activeTab} onValueChange={(v) => setChosenTab(v as ProposalTab)}>
          <TabsList className="mb-5">
            <TabsTrigger value="ativos" className="gap-2">
              Ativos <CountBadge count={pendingDocumentos} />
            </TabsTrigger>
            <TabsTrigger value="prazos" className="gap-2">
              Prazos <CountBadge count={pendingPrazos} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ativos" className="mt-0">
            {visibleDocumentos.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-muted-foreground">
                Nenhuma proposta de ativos no momento.
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                {visibleDocumentos.map(({ doc, proposta, contextName }) => {
                  const decision = decisions[proposta.id] ?? null;
                  return (
                    <div key={proposta.id}>
                      {!decision && (
                        <PropostaReason
                          raciocinio={proposta.raciocinio}
                          fontes={proposta.fontes}
                          onOpenSource={(fonte) =>
                            openSource(proposta.arquivo.nome, fonte, doc.download_url, doc.onedrive_url)
                          }
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
                            ...actionsFor("documento", proposta.id),
                            onEdit: onChanged ? () => setEditingDoc({ doc, proposta, contextName }) : undefined,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="prazos" className="mt-0">
            {visiblePrazos.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-muted-foreground">
                Nenhuma proposta de prazos no momento.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {visiblePrazos.map((proposta) => {
                  const decision = decisions[proposta.id] ?? null;
                  return (
                    <div key={proposta.id}>
                      {!decision && (
                        <PropostaReason
                          raciocinio={proposta.raciocinio}
                          fontes={proposta.fontes}
                          onOpenSource={(fonte) =>
                            openSource(proposta.arquivo.nome, fonte, proposta.fileUrl, proposta.onedriveUrl)
                          }
                        />
                      )}
                      <PrazoItem
                        proposal={{
                          proposta,
                          decision,
                          ...actionsFor("obrigacao", proposta.id),
                          onEdit: onChanged && proposta.obrigacao ? () => setEditingPrazo(proposta) : undefined,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {visibleDocumentos.length === 0 && visiblePrazos.length === 0 && (
        <p className="py-10 text-center text-[13px] text-muted-foreground">
          Nenhuma proposta pendente no momento.
        </p>
      )}

      {editingDoc && (
        <PropostaDocumentoEditDialog
          doc={editingDoc.doc}
          open
          onOpenChange={(o) => !o && setEditingDoc(null)}
          onSaved={() => onChanged?.()}
        />
      )}

      {editingPrazo?.obrigacao && (
        <ObrigacaoFormDialog
          owner={
            editingPrazo.obrigacao.fundo_id != null
              ? { fundo_id: editingPrazo.obrigacao.fundo_id }
              : { gestora_id: editingPrazo.obrigacao.gestora_id! }
          }
          open
          onOpenChange={(o) => !o && setEditingPrazo(null)}
          initial={{
            id: editingPrazo.obrigacao.id,
            topico: editingPrazo.obrigacao.topico,
            observacao: editingPrazo.obrigacao.observacao,
            categoria: editingPrazo.obrigacao.categoria,
            tipo_prazo: editingPrazo.obrigacao.tipo_prazo,
            parametros: editingPrazo.obrigacao.parametros,
            antecedencia_alerta_dias: editingPrazo.obrigacao.antecedencia_alerta_dias,
            recorrente: editingPrazo.obrigacao.recorrente,
            intervalo_meses: editingPrazo.obrigacao.intervalo_meses,
            responsaveis: editingPrazo.obrigacao.responsaveis,
          }}
          onUpdated={() => onChanged?.()}
        />
      )}

      <PropostaPdfViewerSheet
        open={viewer != null}
        onOpenChange={(o) => !o && setViewer(null)}
        arquivoNome={viewer?.arquivoNome ?? ""}
        fileData={file.data}
        loading={file.loading}
        fonte={viewer?.fonte ?? null}
        rawUrl={viewer?.onedriveUrl ?? undefined}
      />
    </div>
  );
}
