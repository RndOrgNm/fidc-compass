import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

import {
  createObrigacao,
  updateObrigacao,
  type Categoria,
  type TipoPrazo,
} from "@/lib/api/prazoService";
import { prazoKeys, alertaKeys } from "@/lib/queryKeys";
import { CAT_META, CAT_ORDER, TIPO_LABEL } from "./prazoMeta";

const TIPOS: TipoPrazo[] = [
  "DIA_FIXO",
  "DIA_UTIL",
  "DIAS_ANTES_DU",
  "DIAS_APOS_EVENTO",
  "FINAL_DO_MES",
];

// Optional integer field: an empty/blank input (or a hidden field still holding
// "") becomes `undefined` BEFORE coercion, so fields irrelevant to the selected
// tipo_prazo never produce phantom validation errors that block submit.
const optInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(min).max(max).optional()
  );

const schema = z
  .object({
    topico: z.string().trim().min(1, "Informe o tópico"),
    categoria: z.enum(["REGULATORIO", "OPERACIONAL", "RECEBIVEL", "COTISTA"]),
    tipo_prazo: z.enum([
      "DIA_FIXO",
      "DIA_UTIL",
      "DIAS_ANTES_DU",
      "DIAS_APOS_EVENTO",
      "FINAL_DO_MES",
    ]),
    antecedencia_alerta_dias: z.coerce.number().int().min(0).max(365),
    dia: optInt(1, 31),
    n_util: optInt(1, 23),
    dias_antes: optInt(0, 90),
    ref_util: optInt(1, 23),
    dias_apos: optInt(0, 90),
  })
  .superRefine((val, ctx) => {
    const req = (field: keyof typeof val) => {
      if (val[field] === undefined || Number.isNaN(val[field] as number)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "Campo obrigatório para este tipo",
        });
      }
    };
    if (val.tipo_prazo === "DIA_FIXO") req("dia");
    if (val.tipo_prazo === "DIA_UTIL") req("n_util");
    if (val.tipo_prazo === "DIAS_ANTES_DU") {
      req("dias_antes");
      req("ref_util");
    }
    if (val.tipo_prazo === "DIAS_APOS_EVENTO") req("dias_apos");
  });

type FormValues = z.infer<typeof schema>;

function buildParametros(v: FormValues): Record<string, number> {
  switch (v.tipo_prazo) {
    case "DIA_FIXO":
      return { dia: v.dia! };
    case "DIA_UTIL":
      return { n_util: v.n_util! };
    case "DIAS_ANTES_DU":
      return { dias_antes: v.dias_antes!, ref_util: v.ref_util! };
    case "DIAS_APOS_EVENTO":
      return { dias_apos: v.dias_apos! };
    case "FINAL_DO_MES":
    default:
      return {};
  }
}

export interface ObrigacaoFormInitial {
  id?: string;
  topico: string;
  categoria: Categoria;
  tipo_prazo: TipoPrazo;
  parametros: Record<string, number>;
  antecedencia_alerta_dias: number;
}

interface Props {
  fundoId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ObrigacaoFormInitial;
}

export function ObrigacaoFormDialog({ fundoId, open, onOpenChange, initial }: Props) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const isEdit = Boolean(initial?.id);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      topico: "",
      categoria: "REGULATORIO",
      tipo_prazo: "DIA_FIXO",
      antecedencia_alerta_dias: 7,
    },
  });

  // Refill the form whenever the dialog opens (create resets, edit prefills).
  useEffect(() => {
    if (!open) return;
    reset({
      topico: initial?.topico ?? "",
      categoria: initial?.categoria ?? "REGULATORIO",
      tipo_prazo: initial?.tipo_prazo ?? "DIA_FIXO",
      antecedencia_alerta_dias: initial?.antecedencia_alerta_dias ?? 7,
      dia: initial?.parametros?.dia,
      n_util: initial?.parametros?.n_util,
      dias_antes: initial?.parametros?.dias_antes,
      ref_util: initial?.parametros?.ref_util,
      dias_apos: initial?.parametros?.dias_apos,
    });
  }, [open, initial, reset]);

  const tipo = watch("tipo_prazo");

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const parametros = buildParametros(values);
      if (isEdit && initial?.id) {
        return updateObrigacao(initial.id, {
          topico: values.topico,
          categoria: values.categoria,
          tipo_prazo: values.tipo_prazo,
          parametros,
          antecedencia_alerta_dias: values.antecedencia_alerta_dias,
        });
      }
      return createObrigacao({
        fundo_id: fundoId,
        topico: values.topico,
        categoria: values.categoria,
        tipo_prazo: values.tipo_prazo,
        parametros,
        antecedencia_alerta_dias: values.antecedencia_alerta_dias,
        criado_por: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prazoKeys.all });
      queryClient.invalidateQueries({ queryKey: alertaKeys.all });
      toast({
        title: isEdit ? "Obrigação atualizada" : "Obrigação criada",
        description: isEdit
          ? "As alterações foram salvas."
          : "A obrigação foi adicionada ao calendário do fundo.",
      });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Não foi possível salvar",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const numField = (
    name: "dia" | "n_util" | "dias_antes" | "ref_util" | "dias_apos",
    label: string,
    hint?: string
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type="number" {...register(name)} />
      {hint && !errors[name] && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
      {errors[name] && (
        <p className="text-[11px] text-destructive">{errors[name]?.message}</p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar obrigação" : "Nova obrigação"}</DialogTitle>
          <DialogDescription>
            Defina a regra recorrente. A data de vencimento do ciclo é calculada
            automaticamente pelo tipo de prazo.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="topico">Tópico</Label>
            <Input id="topico" placeholder="Ex.: Informe mensal CVM" {...register("topico")} />
            {errors.topico && (
              <p className="text-[11px] text-destructive">{errors.topico.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Controller
                control={control}
                name="categoria"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAT_ORDER.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CAT_META[c].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de prazo</Label>
              <Controller
                control={control}
                name="tipo_prazo"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIPO_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Conditional parameter fields per tipo_prazo */}
          <div className="grid grid-cols-2 gap-4">
            {tipo === "DIA_FIXO" && numField("dia", "Dia do mês", "1–31 (ajusta p/ fim de mês)")}
            {tipo === "DIA_UTIL" && numField("n_util", "N-ésimo dia útil", "Ex.: 5 = 5º dia útil")}
            {tipo === "DIAS_ANTES_DU" && (
              <>
                {numField("dias_antes", "Dias corridos antes")}
                {numField("ref_util", "Do N-ésimo dia útil")}
              </>
            )}
            {tipo === "DIAS_APOS_EVENTO" &&
              numField("dias_apos", "Dias após o evento", "Vencimento definido no gatilho")}
            {tipo === "FINAL_DO_MES" && (
              <p className="col-span-2 text-[12px] text-muted-foreground">
                Vence no último dia de cada mês — sem parâmetros.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="antecedencia_alerta_dias">Antecedência do alerta (dias)</Label>
            <Input
              id="antecedencia_alerta_dias"
              type="number"
              className="w-32"
              {...register("antecedencia_alerta_dias")}
            />
            {errors.antecedencia_alerta_dias && (
              <p className="text-[11px] text-destructive">
                {errors.antecedencia_alerta_dias.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando…" : isEdit ? "Salvar" : "Criar obrigação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
