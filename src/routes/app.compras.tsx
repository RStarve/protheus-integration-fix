import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Boxes,
  DollarSign,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/table-skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { obterComprasProtheus } from "@/lib/protheus-compras.functions";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/app/compras")({
  component: ComprasPage,
});

// Paleta colorida para os gráficos — independente da identidade visual do site
const CHART_BLUE = "hsl(217 91% 60%)";
const CHART_EMERALD = "hsl(142 71% 45%)";
const CHART_AMBER = "hsl(38 92% 50%)";
const CHART_VIOLET = "hsl(263 70% 50%)";
const CHART_ROSE = "hsl(346 84% 56%)";
const CHART_CYAN = "hsl(199 89% 48%)";
const CHART_TEAL = "hsl(168 76% 42%)";
const CHART_COLORS = [
  CHART_BLUE,
  CHART_EMERALD,
  CHART_AMBER,
  CHART_VIOLET,
  CHART_ROSE,
  CHART_CYAN,
  CHART_TEAL,
];

const formatCompact = (n: number) =>
  n >= 1_000_000
    ? `R$ ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `R$ ${(n / 1_000).toFixed(0)}k`
      : `R$ ${n.toFixed(0)}`;

function ComprasPage() {
  const { filialAtiva } = useAuth();
  const loja = filialAtiva?.codigo ?? "";

  const [busca, setBusca] = useState("");

  const query = useQuery({
    queryKey: ["compras-arelcmp", loja],
    queryFn: () => obterComprasProtheus({ data: { loja } }),
    enabled: !!loja,
    placeholderData: keepPreviousData,
  });

  const produtos = query.data ?? [];

  const filtrados = useMemo(() => {
    if (!busca) return produtos;
    const q = busca.toLowerCase();
    return produtos.filter(
      (p) =>
        p.codigo.toLowerCase().includes(q) ||
        p.descri.toLowerCase().includes(q) ||
        p.marca_nome.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q),
    );
  }, [produtos, busca]);

  // KPIs
  const kpis = useMemo(() => {
    const acc = produtos.reduce(
      (a, p) => {
        a.custoTotal += p.vlcust * p.qtestq;
        a.vendaTotal += p.vlvend * p.qtestq;
        a.qtdEstoque += p.qtestq;
        a.qtdVendida += p.qtvend;
        return a;
      },
      { custoTotal: 0, vendaTotal: 0, qtdEstoque: 0, qtdVendida: 0 },
    );
    return acc;
  }, [produtos]);

  // Estoque por categoria
  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    produtos.forEach((p) => {
      const key = p.categoria || "Sem categoria";
      map.set(key, (map.get(key) ?? 0) + p.vlcust * p.qtestq);
    });
    return Array.from(map, ([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }, [produtos]);

  // Top marcas por valor de estoque
  const topMarcas = useMemo(() => {
    const map = new Map<string, number>();
    produtos.forEach((p) => {
      const key = p.marca_nome || "Sem marca";
      map.set(key, (map.get(key) ?? 0) + p.vlcust * p.qtestq);
    });
    return Array.from(map, ([marca, valor]) => ({ marca, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }, [produtos]);

  // Alertas de reposição — estoque baixo
  const rupturas = useMemo(
    () =>
      [...produtos]
        .filter((p) => p.qtestq > 0 && p.qtestq <= 5)
        .sort((a, b) => a.qtestq - b.qtestq)
        .slice(0, 6),
    [produtos],
  );

  const kpiCards = [
    {
      label: "Custo total em estoque",
      value: formatBRL(kpis.custoTotal),
      icon: ShoppingCart,
    },
    {
      label: "Valor de venda em estoque",
      value: formatBRL(kpis.vendaTotal),
      icon: DollarSign,
    },
    {
      label: "Quantidade em estoque",
      value: kpis.qtdEstoque.toLocaleString("pt-BR"),
      icon: Boxes,
    },
    {
      label: "Quantidade vendida",
      value: kpis.qtdVendida.toLocaleString("pt-BR"),
      icon: Package,
    },
  ];

  const isLoading = query.isLoading || query.isFetching;
  const errorMsg =
    query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatório de Compras & Estoque</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Posição de estoque e vendas da loja{" "}
            <span className="font-medium text-foreground">
              {filialAtiva?.nome ?? "—"} {loja && `(${loja})`}
            </span>
          </p>
        </div>
        <Button
          onClick={() => query.refetch()}
          disabled={!loja || query.isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
          Buscar
        </Button>
      </header>

      {!loja && (
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Selecione uma loja no seletor acima para carregar o relatório.
          </CardContent>
        </Card>
      )}

      {errorMsg && (
        <Card className="border-brand/40 bg-brand-soft/40 shadow-[var(--shadow-soft)]">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-brand shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Não foi possível carregar os dados.</p>
              <p className="text-muted-foreground">{errorMsg}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((c) => (
          <Card key={c.label} className="shadow-[var(--shadow-soft)]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {c.label}
                </span>
                <div className="h-8 w-8 rounded-md bg-brand-soft grid place-items-center">
                  <c.icon className="h-4 w-4 text-brand" />
                </div>
              </div>
              <div className="mt-3">
                {isLoading && produtos.length === 0 ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <div className="text-2xl font-semibold tabular-nums tracking-tight">
                    {c.value}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-[var(--shadow-soft)]">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-base font-semibold tracking-tight mb-4">
              Top marcas por valor em estoque
            </h2>
            <div className="h-72">
              {isLoading && topMarcas.length === 0 ? (
                <Skeleton className="h-full w-full" />
              ) : topMarcas.length === 0 ? (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">
                  Sem dados.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topMarcas}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: "hsl(0 0% 45%)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatCompact}
                    />
                    <YAxis
                      type="category"
                      dataKey="marca"
                      tick={{ fontSize: 12, fill: "hsl(0 0% 20%)" }}
                      axisLine={false}
                      tickLine={false}
                      width={140}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(0 0% 96%)" }}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(0 0% 90%)",
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatBRL(v)}
                    />
                    <Bar dataKey="valor" fill={CHART_TEAL} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-base font-semibold tracking-tight mb-4">Estoque por categoria</h2>
            <div className="h-72">
              {isLoading && porCategoria.length === 0 ? (
                <Skeleton className="h-full w-full" />
              ) : porCategoria.length === 0 ? (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">
                  Sem dados.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={porCategoria}
                      dataKey="valor"
                      nameKey="categoria"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      stroke="hsl(0 0% 100%)"
                      strokeWidth={2}
                    >
                      {porCategoria.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(0 0% 90%)",
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatBRL(v)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <ul className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
              {porCategoria.map((c, i) => (
                <li
                  key={c.categoria}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-sm shrink-0"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-foreground truncate">{c.categoria}</span>
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
                    {formatBRL(c.valor)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de reposição */}
      {rupturas.length > 0 && (
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-md bg-brand-soft grid place-items-center">
                <AlertTriangle className="h-4 w-4 text-brand" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight">Alertas de reposição</h2>
                <p className="text-xs text-muted-foreground">Produtos com estoque crítico (≤ 5)</p>
              </div>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {rupturas.map((p) => (
                <li
                  key={p.codigo}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.descri}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.codigo} • {p.marca_nome}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-brand-soft text-brand border-brand/30 tabular-nums shrink-0"
                  >
                    {p.qtestq} un
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Tabela detalhada */}
      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Produtos</h2>
              <p className="text-xs text-muted-foreground">
                {filtrados.length} {filtrados.length === 1 ? "item" : "itens"}
              </p>
            </div>
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar código, descrição, marca..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Qtd. Vendida</TableHead>
                  <TableHead className="text-right">Valor Venda</TableHead>
                  <TableHead className="text-right">Valor Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && produtos.length === 0 ? (
                  <TableSkeleton rows={8} cols={8} />
                ) : filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      {loja ? "Nenhum produto encontrado." : "Selecione uma loja."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtrados.slice(0, 200).map((p) => (
                    <TableRow key={`${p.codigo}-${p.descri}`}>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {p.codigo}
                      </TableCell>
                      <TableCell className="font-medium max-w-[280px] truncate">
                        {p.descri}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.marca_nome}</TableCell>
                      <TableCell className="text-muted-foreground">{p.categoria}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={
                            p.qtestq > 0 && p.qtestq <= 5
                              ? "inline-block px-2 py-0.5 rounded bg-brand-soft text-brand font-medium"
                              : ""
                          }
                        >
                          {p.qtestq}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {p.qtvend}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(p.vlvend)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(p.vlcust)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filtrados.length > 200 && (
            <p className="text-xs text-muted-foreground text-center">
              Exibindo os primeiros 200 itens de {filtrados.length}. Refine a busca para ver outros.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
