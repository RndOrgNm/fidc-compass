import { useState } from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";
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
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

function initials(nome: string): string {
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
  const selected = members.find((m) => m.id === value);

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
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              <Avatar className="h-5 w-5 shrink-0">
                {selected.imageUrl && (
                  <AvatarImage src={selected.imageUrl} alt={selected.nome} />
                )}
                <AvatarFallback className="text-[9px]">
                  {initials(selected.nome)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selected.nome}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              {isLoaded ? "Não atribuído" : "Carregando…"}
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
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Não atribuído</span>
                {!value && <Check className="ml-auto h-4 w-4" />}
              </CommandItem>
              {members.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`${m.nome} ${m.email}`}
                  onSelect={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
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
                  {value === m.id && <Check className="ml-auto h-4 w-4 shrink-0" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
