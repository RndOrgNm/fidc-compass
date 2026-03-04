import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, User, Mail, AlertTriangle } from "lucide-react";
import type { CedentePipelineItem } from "./CedenteCard";
import { CEDENTES_STATUS_LABELS } from "@/data/cedentesPipelineConfig";

const SEGMENT_LABELS: Record<string, string> = {
  comercio: "Comércio",
  industria: "Indústria",
  servicos: "Serviços",
  agronegocio: "Agronegócio",
  varejo: "Varejo",
  insumos: "Insumos",
};

function formatCnpj(cnpj: string) {
  if (!cnpj) return "—";
  if (cnpj.includes("/") || cnpj.includes(".")) return cnpj;
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

interface CedenteDeleteModalProps {
  cedente: CedentePipelineItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (cedente: CedentePipelineItem) => void;
  isDeleting?: boolean;
}

export function CedenteDeleteModal({
  cedente,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}: CedenteDeleteModalProps) {
  if (!cedente) return null;

  const handleConfirm = () => {
    onConfirm(cedente);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir cedente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este cedente? Esta ação não pode ser desfeita.
          </p>

          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2 font-medium">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {cedente.companyName}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{CEDENTES_STATUS_LABELS[cedente.status]}</Badge>
              <Badge variant="outline">{SEGMENT_LABELS[cedente.segment] ?? cedente.segment}</Badge>
              {cedente.assigned_to && (
                <Badge variant="outline">Atribuído a: {cedente.assigned_to}</Badge>
              )}
              <Badge variant="outline">{cedente.days_in_status} dias no status</Badge>
            </div>
            <div className="grid gap-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>CNPJ: {formatCnpj(cedente.cnpj)}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Contato: {cedente.contactName}</span>
              </div>
              {cedente.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{cedente.contactEmail}</span>
                </div>
              )}
              {cedente.creditScore > 0 && (
                <div className="text-sm">Score: {cedente.creditScore}</div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
