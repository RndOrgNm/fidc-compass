import { HardHat } from "lucide-react";

interface EmConstrucaoProps {
  title: string;
}

export function EmConstrucao({ title }: EmConstrucaoProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <HardHat className="h-7 w-7" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">Em construção — disponível em breve.</p>
      </div>
    </div>
  );
}
