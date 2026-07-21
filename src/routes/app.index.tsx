import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/app/")({
  component: OverviewPage,
});

const modulos = [
  {
    title: "Relatórios de Compras",
    desc: "Pedidos, fornecedores e status de recebimento.",
    icon: ShoppingCart,
    to: "/app/compras",
  },
  {
    title: "Relatórios de Vendas",
    desc: "Faturamento, ticket médio e vendas recentes.",
    icon: TrendingUp,
    to: "/app/vendas",
  },
  {
    title: "Cadastro de Clientes",
    desc: "Base ativa de clientes com busca por nome, código ou CNPJ.",
    icon: Users,
    to: "/app/clientes",
  },
] as const;

function OverviewPage() {
  const { usuario, filialAtiva } = useAuth();
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">Olá, {usuario?.nome}</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Painel {filialAtiva ? `— ${filialAtiva.nome}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione um módulo para visualizar os relatórios corporativos.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modulos.map((m) => (
          <Link key={m.to} to={m.to} className="group">
            <Card className="border-border shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] hover:border-brand/40 transition-all h-full">
              <CardContent className="p-6 flex flex-col gap-4 h-full">
                <div className="h-10 w-10 rounded-md bg-brand-soft grid place-items-center">
                  <m.icon className="h-5 w-5 text-brand" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold tracking-tight">{m.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{m.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-brand">
                  Abrir módulo
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
