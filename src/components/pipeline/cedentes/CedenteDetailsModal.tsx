import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, User, Mail, Phone, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CedentePipelineItem } from "./CedenteCard";
import { CEDENTES_STATUS_LABELS } from "@/data/cedentesPipelineConfig";
import { EntityNotesSection } from "@/components/pipeline/shared/EntityNotesSection";
import { EntityEventsSection } from "@/components/pipeline/shared/EntityEventsSection";

const SEGMENT_BADGES: Record<string, { label: string; className: string }> = {
  comercio: { label: "Comércio", className: "bg-blue-100 text-blue-800" },
  industria: { label: "Indústria", className: "bg-purple-100 text-purple-800" },
  servicos: { label: "Serviços", className: "bg-cyan-100 text-cyan-800" },
  agronegocio: { label: "Agronegócio", className: "bg-green-100 text-green-800" },
  varejo: { label: "Varejo", className: "bg-orange-100 text-orange-800" },
  insumos: { label: "Insumos", className: "bg-amber-100 text-amber-800" },
};

function getSegmentBadge(segment: string | null) {
  if (!segment) return null;
  const seg = SEGMENT_BADGES[segment] || { label: segment, className: "bg-gray-100 text-gray-800" };
  return <Badge className={seg.className}>{seg.label}</Badge>;
}

function formatCnpj(cnpj: string) {
  if (!cnpj) return "—";
  if (cnpj.includes("/") || cnpj.includes(".")) return cnpj;
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface CedenteDetailsModalProps {
  cedente: CedentePipelineItem | null;
  checklist: Record<string, string[]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdatePendingItems: (cedenteId: string, pendingItems: string[]) => void;
  onUpdateFinancials?: (
    cedenteId: string,
    payload: { credit_score?: number; approved_limit?: number; proposed_limit?: number }
  ) => Promise<void>;
}

export function CedenteDetailsModal({
  cedente,
  checklist,
  open,
  onOpenChange,
  onUpdatePendingItems,
  onUpdateFinancials,
}: CedenteDetailsModalProps) {
  const [creditScore, setCreditScore] = useState<string>("0");
  const [proposedLimit, setProposedLimit] = useState<string>("0");
  const [approvedLimit, setApprovedLimit] = useState<string>("0");
  const [savingFinancials, setSavingFinancials] = useState(false);
  const [financialsDirty, setFinancialsDirty] = useState(false);

  useEffect(() => {
    if (!cedente) return;
    setFinancialsDirty(false);
    setCreditScore(String(cedente.creditScore ?? 0));
    setProposedLimit(String(cedente.proposedLimit ?? 0));
    setApprovedLimit(String(cedente.approvedLimit ?? 0));
  }, [cedente?.id]);

  if (!cedente) return null;

  const handleSaveFinancials = async () => {
    if (!onUpdateFinancials) return;
    setSavingFinancials(true);
    try {
      const cs = parseInt(creditScore, 10);
      const pl = parseFloat(proposedLimit) || 0;
      const al = parseFloat(approvedLimit) || 0;
      await onUpdateFinancials(cedente.id, {
        credit_score: isNaN(cs) ? undefined : Math.max(0, Math.min(1000, cs)),
        proposed_limit: isNaN(pl) ? undefined : pl,
        approved_limit: isNaN(al) ? undefined : al,
      });
      setFinancialsDirty(false);
    } finally {
      setSavingFinancials(false);
    }
  };

  const markDirty = () => setFinancialsDirty(true);

  const canonicalItems = checklist[cedente.status] ?? [];
  const pending = cedente.pending_items ?? [];
  // Merge: show all canonical items + any pending items not in canonical (legacy/different format)
  const checklistItems = [...canonicalItems];
  for (const p of pending) {
    if (!canonicalItems.includes(p)) checklistItems.push(p);
  }

  const handleCheckChange = (item: string, checked: boolean) => {
    const current = cedente.pending_items ?? [];
    if (checked) {
      onUpdatePendingItems(cedente.id, current.filter((i) => i !== item));
    } else {
      onUpdatePendingItems(cedente.id, [...current, item]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {cedente.companyName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pl-6 pr-10 space-y-6">
          <section className="space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{CEDENTES_STATUS_LABELS[cedente.status]}</Badge>
                {getSegmentBadge(cedente.segment)}
                {cedente.assigned_to && (
                  <Badge variant="outline">Atribuído a: {cedente.assigned_to}</Badge>
                )}
                <Badge variant="outline">{cedente.days_in_status} dias no status</Badge>
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>CNPJ: {formatCnpj(cedente.cnpj)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{cedente.contactName}</span>
                </div>
                {cedente.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{cedente.contactEmail}</span>
                  </div>
                )}
                {cedente.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{cedente.contactPhone}</span>
                  </div>
                )}
                <div className="pt-2 space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Dados financeiros</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="cedente-score" className="text-sm">
                        Score
                      </Label>
                      <Input
                        id="cedente-score"
                        type="number"
                        min={0}
                        max={1000}
                        value={creditScore}
                        onChange={(e) => {
                          setCreditScore(e.target.value);
                          markDirty();
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cedente-proposed" className="text-sm">
                        Limite proposto
                      </Label>
                      <Input
                        id="cedente-proposed"
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="R$"
                        value={proposedLimit}
                        onChange={(e) => {
                          setProposedLimit(e.target.value);
                          markDirty();
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cedente-approved" className="text-sm">
                        Limite aprovado
                      </Label>
                      <Input
                        id="cedente-approved"
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="R$"
                        value={approvedLimit}
                        onChange={(e) => {
                          setApprovedLimit(e.target.value);
                          markDirty();
                        }}
                        className="h-9"
                      />
                    </div>
                  </div>
                  {onUpdateFinancials && financialsDirty && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleSaveFinancials}
                      disabled={savingFinancials}
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      {savingFinancials ? "Salvando..." : "Salvar alterações"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="font-medium text-sm">Checklist — {CEDENTES_STATUS_LABELS[cedente.status]}</h4>
              <p className="text-xs text-muted-foreground">
                Marque os itens concluídos. Quando todos estiverem concluídos, o cedente poderá avançar para o próximo status.
              </p>
              <ScrollArea className="pr-3 -mr-2 border rounded-md p-4 min-h-[120px] max-h-[320px]">
                <div className="space-y-4">
                  {checklistItems.map((item, idx) => {
                    const isChecked = !(cedente.pending_items ?? []).includes(item);
                    return (
                      <div key={idx} className="flex items-start gap-3">
                        <Checkbox
                          id={`check-${cedente.id}-${idx}`}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleCheckChange(item, checked === true)
                          }
                          className="mt-0.5 shrink-0"
                        />
                        <Label
                          htmlFor={`check-${cedente.id}-${idx}`}
                          className={cn(
                            "text-sm cursor-pointer leading-relaxed",
                            isChecked && "text-muted-foreground line-through"
                          )}
                        >
                          {item}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </section>

          <section>
            <h4 className="font-medium text-sm mb-2">Eventos</h4>
            <EntityEventsSection
              entityType="cedente"
              entityId={cedente.id}
              enabled={open}
            />
          </section>

          <section>
            <h4 className="font-medium text-sm mb-2">Notas Livres</h4>
            <EntityNotesSection
              entityType="cedente"
              entityId={cedente.id}
              enabled={open}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
