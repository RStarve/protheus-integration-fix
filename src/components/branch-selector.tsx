import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

export function BranchSelector() {
  const { usuario, filialAtiva, filiais, filiaisLoading, filiaisError, setFilialAtiva } = useAuth();
  const [open, setOpen] = useState(false);
  if (!usuario) return null;

  const unica = filiais.length === 1;
  const desabilitado = filiaisLoading || unica || filiais.length === 0;

  const label = filiaisLoading
    ? "Carregando lojas..."
    : filiaisError
      ? "Erro ao carregar"
      : filialAtiva
        ? `${filialAtiva.codigo} · ${filialAtiva.nome}`
        : "Selecionar filial";

  return (
    <DropdownMenu open={open} onOpenChange={(o) => !desabilitado && setOpen(o)}>
      <DropdownMenuTrigger asChild disabled={desabilitado}>
        <Button variant="outline" className="gap-2 h-9" disabled={desabilitado}>
          {filiaisLoading ? (
            <Loader2 className="h-4 w-4 text-brand animate-spin" />
          ) : (
            <Building2 className="h-4 w-4 text-brand" />
          )}
          <span className="hidden sm:inline text-sm font-medium">{label}</span>
          <span className="sm:hidden text-sm font-medium">
            {filiaisLoading ? "..." : filialAtiva?.codigo ?? "Filial"}
          </span>
          {!unica && !filiaisLoading && <ChevronsUpDown className="h-4 w-4 opacity-60" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Suas lojas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {filiais.map((f) => {
          const ativa = filialAtiva?.codigo === f.codigo;
          return (
            <DropdownMenuItem
              key={f.codigo}
              data-value={f.codigo}
              onClick={() => setFilialAtiva(f)}
              className="gap-2"
            >
              <Check className={`h-4 w-4 ${ativa ? "opacity-100 text-brand" : "opacity-0"}`} />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{f.nome}</span>
                <span className="text-xs text-muted-foreground">
                  Cód. {f.codigo}
                  {f.uf ? ` · ${f.uf}` : ""}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
