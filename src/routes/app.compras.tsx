import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
  Filter,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const { filialAtiva, selectedLoja, token, filiais, setFilialAtiva } = useAuth();

  // Fallback local: mesmo que /obterlojas falhe, o relatório continua funcionando.
  const [lojaFiltro, setLojaFiltro] = useState<string>(selectedLoja || "32");
  useEffect(() => {
    if (selectedLoja && selectedLoja !== lojaFiltro) setLojaFiltro(selectedLoja);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLoja]);
  const loja = lojaFiltro.trim();

  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("__all__");
  const [marcaFiltro, setMarcaFiltro] = useState<string>("__all__");

  // Estado do modal de filtros (rascunho aplicado ao confirmar)
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [draftLoja, setDraftLoja] = useState(loja);
  const [draftDataInicio, setDraftDataInicio] = useState(dataInicio);
  const [draftDataFim, setDraftDataFim] = useState(dataFim);
  const [draftCategoria, setDraftCategoria] = useState(categoriaFiltro);
  const [draftMarca, setDraftMarca] = useState(marcaFiltro);

  const abrirFiltros = () => {
    setDraftLoja(loja);
    setDraftDataInicio(dataInicio);
    setDraftDataFim(dataFim);
    setDraftCategoria(categoriaFiltro);
    setDraftMarca(marcaFiltro);
    setFiltrosOpen(true);
  };

  const aplicarFiltros = () => {
    const novaLoja = draftLoja.trim();
    setLojaFiltro(novaLoja);
    const f = filiais.find((x) => x.codigo === novaLoja);
    if (f && f.codigo !== filialAtiva?.codigo) setFilialAtiva(f);
    setDataInicio(draftDataInicio);
    setDataFim(draftDataFim);
    setCategoriaFiltro(draftCategoria);
    setMarcaFiltro(draftMarca);
    setFiltrosOpen(false);
  };

  const limparFiltros = () => {
    setDraftDataInicio("");
    setDraftDataFim("");
    setDraftCategoria("__all__");
    setDraftMarca("__all__");
  };

  const filtrosAtivos =
    (dataInicio ? 1 : 0) +
    (dataFim ? 1 : 0) +
    (categoriaFiltro !== "__all__" ? 1 : 0) +
    (marcaFiltro !== "__all__" ? 1 : 0);

  const query = useQuery({
    queryKey: ["compras-arelcmp", loja, dataInicio, dataFim],
    queryFn: () =>
      obterComprasProtheus({
        data: {
          loja,
          token: token ?? undefined,
          dataInicio: dataInicio || undefined,
          dataFim: dataFim || undefined,
        },
      }),
    // Só dispara /arelcmp quando temos uma loja válida
    enabled: Boolean(loja) && loja.trim().length > 0,
    placeholderData: keepPreviousData,
  });

  const produtos = query.data ?? [];

  const categorias = useMemo(
    () =>
      Array.from(new Set(produtos.map((p) => p.categoria).filter(Boolean))).sort(),
    [produtos],
  );
  const marcas = useMemo(
    () =>
      Array.from(new Set(produtos.map((p) => p.marca_nome).filter(Boolean))).sort(),
    [produtos],
  );

  // Cross-filter: aplica marca + categoria (filtros de BI) sobre os dados brutos.
  // KPIs, gráficos e tabela consomem daqui para reagirem em conjunto.
  const filteredDados = useMemo(() => {
    return produtos.filter((p) => {
      if (categoriaFiltro !== "__all__" && p.categoria !== categoriaFiltro) return false;
      if (marcaFiltro !== "__all__" && p.marca_nome !== marcaFiltro) return false;
      return true;
    });
  }, [produtos, categoriaFiltro, marcaFiltro]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return filteredDados.filter((p) => {
      if (!q) return true;
      return (
        p.codigo.toLowerCase().includes(q) ||
        p.descri.toLowerCase().includes(q) ||
        p.marca_nome.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q)
      );
    });
  }, [filteredDados, busca]);

  // KPIs — relatório de vendas/margem: os valores financeiros já são totais da linha
  const kpis = useMemo(() => {
    const acc = filteredDados.reduce(
      (a, p) => {
        a.custoTotal += p.vlcust * p.qtvend;
        a.vendaTotal += p.vlvend * p.qtvend;
        a.qtdEstoque += p.qtestq;
        a.qtdVendida += p.qtvend;
        return a;
      },
      { custoTotal: 0, vendaTotal: 0, qtdEstoque: 0, qtdVendida: 0, markup: 0 },
    );
    acc.markup = acc.custoTotal > 0 ? ((acc.vendaTotal - acc.custoTotal) / acc.custoTotal) * 100 : 0;
    return acc;
  }, [filteredDados]);

  // Vendas por categoria — usa o mesmo dataset filtrado das KPIs/tabela
  // para que todos os cartões e gráficos reflitam exatamente os mesmos filtros.
  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    filteredDados.forEach((p) => {
      const key = p.categoria || "Sem categoria";
      map.set(key, (map.get(key) ?? 0) + p.vlvend * p.qtvend);
    });
    return Array.from(map, ([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }, [filteredDados]);

  // Vendas por marca — idem, alimentado pelo dataset já filtrado.
  const topMarcas = useMemo(() => {
    const map = new Map<string, number>();
    filteredDados.forEach((p) => {
      const key = p.marca_nome || "Sem marca";
      map.set(key, (map.get(key) ?? 0) + p.vlvend * p.qtvend);
    });
    return Array.from(map, ([marca, valor]) => ({ marca, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }, [filteredDados]);

  // Alertas de reposição — estoque baixo
  const rupturas = useMemo(
    () =>
      [...filteredDados]
        .filter((p) => p.qtestq > 0 && p.qtestq <= 5)
        .sort((a, b) => a.qtestq - b.qtestq)
        .slice(0, 6),
    [filteredDados],
  );

  const toggleMarca = (marca: string) => {
    setMarcaFiltro((prev) => (prev === marca ? "__all__" : marca));
  };
  const toggleCategoria = (categoria: string) => {
    setCategoriaFiltro((prev) => (prev === categoria ? "__all__" : categoria));
  };
  const limparTodosFiltros = () => {
    setDataInicio("");
    setDataFim("");
    setCategoriaFiltro("__all__");
    setMarcaFiltro("__all__");
  };

  const kpiCards = [
    {
      label: "Custo",
      value: formatBRL(kpis.custoTotal),
      icon: ShoppingCart,
    },
    {
      label: "Valor",
      value: formatBRL(kpis.vendaTotal),
      icon: DollarSign,
    },
    {
      label: "Markup",
      value: `${kpis.markup.toFixed(2).replace(".", ",")}%`,
      icon: Package,
    },
    {
      label: "Quantidade",
      value: kpis.qtdVendida.toLocaleString("pt-BR"),
      icon: Boxes,
    },
    {
      label: "Estoque",
      value: kpis.qtdEstoque.toLocaleString("pt-BR"),
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
        <div className="flex items-center gap-2">
          <Dialog open={filtrosOpen} onOpenChange={(o) => (o ? abrirFiltros() : setFiltrosOpen(false))}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" onClick={abrirFiltros}>
                <Filter className="h-4 w-4 text-red-600" />
                Filtros
                {filtrosAtivos > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 tabular-nums">
                    {filtrosAtivos}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Filtros do relatório</DialogTitle>
                <DialogDescription>
                  Selecione filial, período, categoria e marca. Os filtros só são aplicados ao confirmar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Filial</Label>
                  {filiais.length > 0 ? (
                    <Select value={draftLoja || undefined} onValueChange={setDraftLoja}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione a filial" />
                      </SelectTrigger>
                      <SelectContent>
                        {filiais.map((f) => (
                          <SelectItem key={f.codigo} value={f.codigo}>
                            {f.codigo} — {f.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={draftLoja}
                      onChange={(e) => setDraftLoja(e.target.value)}
                      placeholder="Ex.: 32"
                      className="h-10"
                    />
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data inicial</Label>
                    <Input
                      type="date"
                      value={draftDataInicio}
                      onChange={(e) => setDraftDataInicio(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data final</Label>
                    <Input
                      type="date"
                      value={draftDataFim}
                      onChange={(e) => setDraftDataFim(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Categoria</Label>
                    <Select value={draftCategoria} onValueChange={setDraftCategoria}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas</SelectItem>
                        {categorias.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Marca</Label>
                    <Select value={draftMarca} onValueChange={setDraftMarca}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas</SelectItem>
                        {marcas.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="ghost" onClick={limparFiltros}>
                  Limpar
                </Button>
                <Button variant="outline" onClick={() => setFiltrosOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={aplicarFiltros} disabled={!draftLoja.trim()}>
                  Aplicar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            onClick={() => query.refetch()}
            disabled={!loja || query.isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
            Buscar
          </Button>
        </div>
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
      {filtrosAtivos > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtros ativos:</span>
          {categoriaFiltro !== "__all__" && (
            <Badge variant="secondary" className="gap-1">
              Categoria: {categoriaFiltro}
              <button
                type="button"
                onClick={() => setCategoriaFiltro("__all__")}
                className="ml-1 hover:opacity-70"
                aria-label="Remover filtro de categoria"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {marcaFiltro !== "__all__" && (
            <Badge variant="secondary" className="gap-1">
              Marca: {marcaFiltro}
              <button
                type="button"
                onClick={() => setMarcaFiltro("__all__")}
                className="ml-1 hover:opacity-70"
                aria-label="Remover filtro de marca"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {(dataInicio || dataFim) && (
            <Badge variant="secondary">
              Período: {dataInicio || "…"} → {dataFim || "…"}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={limparTodosFiltros}
            className="h-7 gap-1 text-xs"
          >
            <X className="h-3 w-3" />
            Limpar filtros
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              Vendas por Marca
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
                    <Bar
                      dataKey="valor"
                      radius={[0, 4, 4, 0]}
                      cursor="pointer"
                      onClick={(d: { marca?: string }) => {
                        if (d?.marca) toggleMarca(d.marca);
                      }}
                    >
                      {topMarcas.map((m) => {
                        const dim =
                          marcaFiltro !== "__all__" && marcaFiltro !== m.marca;
                        return (
                          <Cell
                            key={m.marca}
                            fill={CHART_TEAL}
                            fillOpacity={dim ? 0.25 : 1}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-base font-semibold tracking-tight mb-4">Vendas por Categoria</h2>
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
                      cursor="pointer"
                      onClick={(d: { categoria?: string }) => {
                        if (d?.categoria) toggleCategoria(d.categoria);
                      }}
                    >
                      {porCategoria.map((c, i) => {
                        const dim =
                          categoriaFiltro !== "__all__" &&
                          categoriaFiltro !== c.categoria;
                        return (
                          <Cell
                            key={c.categoria}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                            fillOpacity={dim ? 0.25 : 1}
                          />
                        );
                      })}
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
                <li key={c.categoria}>
                  <button
                    type="button"
                    onClick={() => toggleCategoria(c.categoria)}
                    className={`w-full flex items-center justify-between text-xs rounded px-1 py-0.5 hover:bg-secondary/60 transition ${
                      categoriaFiltro !== "__all__" && categoriaFiltro !== c.categoria
                        ? "opacity-40"
                        : ""
                    } ${categoriaFiltro === c.categoria ? "bg-secondary" : ""}`}
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
                  </button>
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
                  <TableHead className="text-right">Valor Custo</TableHead>
                  <TableHead className="text-right">Valor Venda</TableHead>
                  <TableHead className="text-right">Markup %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && produtos.length === 0 ? (
                  <TableSkeleton rows={8} cols={9} />
                ) : filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      {loja ? "Nenhum produto encontrado." : "Selecione uma loja."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtrados.slice(0, 200).map((p) => {
                    const markupLinha = p.vlcust > 0 ? ((p.vlvend - p.vlcust) / p.vlcust) * 100 : 0;
                    return (
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
                          {formatBRL(p.vlcust * p.qtvend)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatBRL(p.vlvend * p.qtvend)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {markupLinha.toFixed(2).replace(".", ",")}%
                        </TableCell>
                      </TableRow>
                    );
                  })
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
