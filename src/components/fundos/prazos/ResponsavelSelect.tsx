import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TeamMember } from "@/hooks/useTeamMembers";

interface ResponsavelSelectProps {
  members: TeamMember[];
  isLoaded: boolean;
  value: string[];
  onChange: (value: string[]) => void;
}

export function initials(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function ResponsavelSelect({
  members,
  isLoaded,
  value,
  onChange,
}: ResponsavelSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = members.filter((m) => value.includes(m.id));

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={!isLoaded}
        >
          {selected.length === 0 ? (
            <span className="text-muted-foreground">
              {isLoaded ? "Não atribuído" : "Carregando…"}
            </span>
          ) : (
            <span className="flex items-center gap-2 min-w-0">
              <span className="flex -space-x-2 shrink-0">
                {selected.slice(0, 3).map((m) => (
                  <Avatar key={m.id} className="h-5 w-5 ring-2 ring-background">
                    {m.imageUrl && <AvatarImage src={m.imageUrl} alt={m.nome} />}
                    <AvatarFallback className="text-[9px]">{initials(m.nome)}</AvatarFallback>
                  </Avatar>
                ))}
              </span>
              <span className="truncate text-sm">
                {selected.length === 1 ? selected[0].nome : `${selected.length} responsáveis`}
              </span>
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar membro…" />
          <CommandList>
            <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
            <CommandGroup>
              {members.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`${m.nome} ${m.email}`}
                  onSelect={() => toggle(m.id)}
                >
                  <Avatar className="mr-2 h-5 w-5 shrink-0">
                    {m.imageUrl && (
                      <AvatarImage src={m.imageUrl} alt={m.nome} />
                    )}
                    <AvatarFallback className="text-[9px]">
                      {initials(m.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm">{m.nome}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {m.email}
                    </p>
                  </div>
                  {value.includes(m.id) && (
                    <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
