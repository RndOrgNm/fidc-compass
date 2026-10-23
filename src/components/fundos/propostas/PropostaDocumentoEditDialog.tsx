import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { CADENCIA_LABELS } from "@/data/ativosData";
import { updateDocumento, type Cadencia, type DocumentoResponse } from "@/lib/api/documentoService";

/**
 * Edits what surrounds a proposed file: reference period, cadence and notes. The file
 * itself and the documento it was proposed for are not editable here — to change which
 * documento receives the file, reject the proposal and propose again.
 * Saving does not approve: the proposal stays pending.
 */
export function PropostaDocumentoEditDialog({
  doc,
  open,
  onOpenChange,
  onSaved,
}: {
  doc: DocumentoResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [periodo, setPeriodo] = useState("");
  const [cadencia, setCadencia] = useState<Cadencia>(doc.cadencia);
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  // Cadence follows the linked prazo while there is one, so it is not editable then.
  const cadenciaLocked = Boolean(doc.prazo);

  useEffect(() => {
    if (!open) return;
    setPeriodo(doc.periodo_referencia ?? "");
    setCadencia(doc.cadencia);
    setObservacao(doc.observacao ?? "");
  }, [open, doc]);

  const save = async () => {
    setSaving(true);
    try {
      await updateDocumento(doc.id, {
        periodo_referencia: periodo.trim(),
        observacao: observacao.trim(),
        ...(cadenciaLocked ? {} : { cadencia }),
      });
      toast({ title: "Proposta atualizada", description: "As alterações foram salvas; falta aprovar." });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar proposta</DialogTitle>
          <DialogDescription>
            Ajuste os dados do documento. Para trocar o documento que recebe o arquivo, rejeite a
            proposta e proponha de novo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="proposta-periodo">Período de referência</Label>
            <Input
              id="proposta-periodo"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              placeholder="Ex.: 2026-09"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Cadência</Label>
            <Select
              value={cadencia}
              onValueChange={(v) => setCadencia(v as Cadencia)}
              disabled={cadenciaLocked}
            >
              <SelectTrigger aria-label="Cadência">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CADENCIA_LABELS) as Cadencia[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CADENCIA_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cadenciaLocked && (
              <p className="text-[11.5px] text-muted-foreground">
                A cadência vem do prazo vinculado a este documento.
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="proposta-observacao">Observação</Label>
            <Textarea
              id="proposta-observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="min-h-[80px] resize-y"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
