import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, User, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CedentePipelineItem } from "./CedenteCard";
import type { CedentePipelineStatus } from "@/data/pipelineData";
import { CEDENTES_STATUS_LABELS } from "@/data/cedentesPipelineConfig";

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
}

export function CedenteDetailsModal({
  cedente,
  checklist,
  open,
  onOpenChange,
  onUpdatePendingItems,
}: CedenteDetailsModalProps) {
  if (!cedente) return null;

  const checklistItems = checklist[cedente.status] ?? [];

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
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {cedente.companyName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 flex-1 min-h-0 flex flex-col">
          <div className="space-y-3 shrink-0">
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
              <div className="pt-2 space-y-1 text-muted-foreground">
                {cedente.creditScore > 0 && <p>Score: {cedente.creditScore}</p>}
                <p>Limite proposto: {formatCurrency(cedente.proposedLimit ?? 0)}</p>
                <p>Limite aprovado: {formatCurrency(cedente.approvedLimit ?? 0)}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-2">
            <h4 className="font-medium text-sm shrink-0">Checklist — {CEDENTES_STATUS_LABELS[cedente.status]}</h4>
            <p className="text-xs text-muted-foreground shrink-0">
              Marque os itens concluídos. Quando todos estiverem concluídos, o cedente poderá avançar para o próximo status.
            </p>
            <ScrollArea className="flex-1 pr-3 -mr-2 border rounded-md p-4 min-h-[200px]">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
