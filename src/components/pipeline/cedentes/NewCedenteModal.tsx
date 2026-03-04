import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useCreateCedente } from "@/hooks/useCedentes";
import type { Segment } from "@/lib/api/cedenteService";

interface NewCedenteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewCedenteModal({ open, onOpenChange }: NewCedenteModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [segment, setSegment] = useState("");
  const [creditScore, setCreditScore] = useState("");
  const [approvedLimit, setApprovedLimit] = useState("");
  const [proposedLimit, setProposedLimit] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const createCedente = useCreateCedente();

  const formatCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 14) {
      return numbers
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      if (numbers.length <= 10) {
        return numbers
          .replace(/^(\d{2})(\d)/, "($1) $2")
          .replace(/(\d{4})(\d)/, "$1-$2");
      }
      return numbers
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
    return value;
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpj(formatCnpj(e.target.value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContactPhone(formatPhone(e.target.value));
  };

  /** Parse pt-BR currency: "1.500.000,50" or "150.000" or "150,50" -> number */
  const parseCurrencyInput = (str: string): number => {
    if (!str || !str.trim()) return 0;
    const s = str.trim().replace(/\s/g, "");
    const hasComma = s.includes(",");
    if (hasComma) {
      const [intPart, decPart] = s.split(",");
      const numStr = (intPart || "").replace(/\./g, "") + "." + (decPart || "0");
      return parseFloat(numStr) || 0;
    }
    const parts = s.split(".");
    if (parts.length === 1) return parseFloat(s) || 0;
    const last = parts[parts.length - 1];
    if (last.length === 3) return parseFloat(s.replace(/\./g, "")) || 0;
    if (last.length <= 2) {
      const intPart = parts.slice(0, -1).join("").replace(/\./g, "");
      return parseFloat(`${intPart}.${last}`) || 0;
    }
    return parseFloat(s.replace(/\./g, "")) || 0;
  };

  /** Format number to pt-BR: 150000 -> "150.000", 150000.5 -> "150.000,50" */
  const formatCurrencyInput = (num: number): string => {
    if (isNaN(num) || num < 0) return "";
    const fixed = num.toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return decPart === "00" ? withThousands : `${withThousands},${decPart}`;
  };

  const handleProposedLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d,.]/g, "");
    setProposedLimit(raw);
  };

  const handleProposedLimitBlur = () => {
    if (proposedLimit === "") return;
    const num = parseCurrencyInput(proposedLimit);
    if (!isNaN(num) && num >= 0) setProposedLimit(formatCurrencyInput(num));
  };

  const handleApprovedLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d,.]/g, "");
    setApprovedLimit(raw);
  };

  const handleApprovedLimitBlur = () => {
    if (approvedLimit === "") return;
    const num = parseCurrencyInput(approvedLimit);
    if (!isNaN(num) && num >= 0) setApprovedLimit(formatCurrencyInput(num));
  };

  const resetForm = () => {
    setCompanyName("");
    setCnpj("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setSegment("");
    setCreditScore("");
    setApprovedLimit("");
    setProposedLimit("");
    setAssignedTo("");
  };

  const handleSubmit = () => {
    if (!companyName || !cnpj || !contactName || !contactEmail || !contactPhone || !segment) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha: Nome da Empresa, CNPJ, Nome do Contato, E-mail, Telefone e Segmento.",
        variant: "destructive",
      });
      return;
    }

    const creditScoreNum = creditScore ? parseInt(creditScore, 10) : 0;
    if (creditScore && (isNaN(creditScoreNum) || creditScoreNum < 0 || creditScoreNum > 1000)) {
      toast({
        title: "Score inválido",
        description: "O score de crédito deve estar entre 0 e 1000.",
        variant: "destructive",
      });
      return;
    }

    const approvedLimitNum = approvedLimit ? parseCurrencyInput(approvedLimit) : 0;
    if (approvedLimit && (isNaN(approvedLimitNum) || approvedLimitNum < 0)) {
      toast({
        title: "Limite inválido",
        description: "O limite aprovado deve ser um número positivo.",
        variant: "destructive",
      });
      return;
    }

    const proposedLimitNum = proposedLimit ? parseCurrencyInput(proposedLimit) : 0;
    if (proposedLimit && (isNaN(proposedLimitNum) || proposedLimitNum < 0)) {
      toast({
        title: "Limite inválido",
        description: "O limite proposto deve ser um número positivo.",
        variant: "destructive",
      });
      return;
    }

    createCedente.mutate(
      {
        company_name: companyName,
        cnpj,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        segment: segment as Segment,
        credit_score: creditScoreNum,
        approved_limit: approvedLimitNum,
        proposed_limit: proposedLimitNum,
        assigned_to: assignedTo || null,
      },
      {
        onSuccess: (data) => {
          toast({
            title: "Cedente criado",
            description: `${data.companyName} foi adicionado ao pipeline de cedentes.`,
          });
          resetForm();
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: "Erro ao criar cedente",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Novo Cedente</DialogTitle>
          <DialogDescription>
            Cadastre um novo cedente para o pipeline de gestão. Os campos marcados com * são obrigatórios; os
            dados de crédito podem ser preenchidos agora ou atualizados depois.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-6">
        <div className="grid gap-6 py-4">
          {/* Dados da empresa */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Dados da empresa
            </p>
            <div className="grid gap-2">
            <Label htmlFor="companyName">
              Nome da Empresa <span className="text-red-500">*</span>
            </Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: Distribuidora ABC Ltda"
            />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cnpj">
                CNPJ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cnpj"
                value={cnpj}
                onChange={handleCnpjChange}
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
              <p className="text-xs text-muted-foreground">
                Usado em todas as telas (cards, detalhes e integrações). Informe o CNPJ completo.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="segment">
                Segmento <span className="text-red-500">*</span>
              </Label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comercio">Comércio</SelectItem>
                  <SelectItem value="industria">Indústria</SelectItem>
                  <SelectItem value="servicos">Serviços</SelectItem>
                  <SelectItem value="agronegocio">Agronegócio</SelectItem>
                  <SelectItem value="varejo">Varejo</SelectItem>
                  <SelectItem value="insumos">Insumos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contato principal */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Contato principal
            </p>

            <div className="grid gap-2">
              <Label htmlFor="contactName">
                Nome do Contato <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="contactEmail">
                  E-mail <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="email@empresa.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactPhone">
                  Telefone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactPhone"
                  value={contactPhone}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
            </div>
          </div>

          {/* Dados de crédito iniciais */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Dados de crédito iniciais
            </p>
            <p className="text-xs text-muted-foreground">
              Estas informações alimentam os cards nas etapas de Análise de Crédito e Comitê. São opcionais e
              podem ser ajustadas depois.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="creditScore">Score de Crédito (0–1000)</Label>
                <Input
                  id="creditScore"
                  type="number"
                  min={0}
                  max={1000}
                  value={creditScore}
                  onChange={(e) => setCreditScore(e.target.value)}
                  placeholder="Ex: 750"
                />
                <p className="text-xs text-muted-foreground">
                  Aparece no card nas colunas de Análise de Crédito e Comitê.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="proposedLimit">Limite Proposto (R$)</Label>
                <Input
                  id="proposedLimit"
                  type="text"
                  inputMode="decimal"
                  value={proposedLimit}
                  onChange={handleProposedLimitChange}
                  onBlur={handleProposedLimitBlur}
                  placeholder="Ex: 500.000"
                />
                <p className="text-xs text-muted-foreground">
                  Valor proposto no Comitê. Exibido no card na coluna Comitê de Crédito.
                </p>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="approvedLimit">Limite Aprovado (R$)</Label>
              <Input
                id="approvedLimit"
                type="text"
                inputMode="decimal"
                value={approvedLimit}
                onChange={handleApprovedLimitChange}
                onBlur={handleApprovedLimitBlur}
                placeholder="Ex: 1.000.000"
              />
              <p className="text-xs text-muted-foreground">
                Campo normalmente definido após o Comitê. Deixe em branco se ainda não houver um limite aprovado.
              </p>
            </div>
          </div>

          {/* Responsável interno */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Responsável</p>
            <div className="grid gap-2">
              <Label htmlFor="assignedTo">Atribuído a</Label>
              <Input
                id="assignedTo"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Ex: Maria Silva"
              />
              <p className="text-xs text-muted-foreground">
                Nome do analista / originador responsável. Também aparece nos cards do pipeline.
              </p>
            </div>
          </div>
        </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createCedente.isPending}>
            {createCedente.isPending ? "Criando..." : "Criar Cedente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
