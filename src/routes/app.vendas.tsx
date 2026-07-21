import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  AlertCircle,
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Search,
  TicketPercent,
  X,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import {
  obterVendasProtheus,
  obterIndicadoresVendasProtheus,
} from "@/lib/protheus-vendas.functions";
import type { Venda } from "@/services/api";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/vendas")({
  component: VendasPage,
});

// Paleta colorida para os gráficos — independente da identidade visual do site
const CHART_BLUE = "hsl(217 91% 60%)";
const CHART_EMERALD = "hsl(142 71% 45%)";
const CHART_AMBER = "hsl(38 92% 50%)";
const CHART_VIOLET = "hsl(263 70% 50%)";
const CHART_ROSE = "hsl(346 84% 56%)";
const CHART_TEAL = "hsl(168 76% 42%)";
const INK = "hsl(0 0% 12%)";
const MUTED = "hsl(0 0% 55%)";

const STATUS_COLORS: Record<Venda["status"], string> = {
  Faturada: CHART_BLUE,
  "Em aberto": CHART_AMBER,
  Cancelada: CHART_ROSE,
};

const PAGE_SIZE = 50;

const formatCompact = (n: number) =>
  n >= 1_000_000
    ? `R$ ${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
      ? `R$ ${(n / 1_000).toFixed(1)}k`
      : `R$ ${n.toFixed(0)}`;

const formatMil = (n: number) => `${(n / 1_000).toFixed(2)} Mil`;

function VendasPage() {
  const { filialAtiva, token, usuario } = useAuth();
  const filialId = filialAtiva?.id ?? "";
  const user = usuario?.id ?? usuario?.nome ?? "";

  // ----- Filtros (enviados pra API) -----
  const [filtroStatus, setFiltroStatus] = useState<Venda["status"] | null>(null);
  const [filtroMes, setFiltroMes] = useState<string | null>(null);
  const [buscaInput, setBuscaInput] = useState("");
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);

  // Reset de página quando filtros ou filial mudam
  const filtrosKey = `${filialId}|${filtroStatus ?? ""}|${filtroMes ?? ""}|${busca}`;

  const indicadores = useQuery({
    queryKey: ["vendas-indicadores", filialId],
    queryFn: () =>
      obterIndicadoresVendasProtheus({
        data: { filial: filialId, token: token ?? undefined, user },
      }),
    enabled: !!filialId,
  });

  const listaQuery = useQuery({
    queryKey: ["vendas-lista", filtrosKey, page],
    queryFn: () =>
      obterVendasProtheus({
        data: {
          filial: filialId,
          token: token ?? undefined,
          user,
          page,
          pageSize: PAGE_SIZE,
          busca: busca || undefined,
          status: filtroStatus ?? undefined,
        },
      }),
    enabled: !!filialId,
    placeholderData: keepPreviousData,
  });

  const resetPage = () => setPage(1);

  const kpis = [
    {
      label: "Total",
      value: indicadores.data ? formatBRL(indicadores.data.total) : null,
      icon: DollarSign,
    },
    {
      label: "Entradas",
      value: indicadores.data ? formatBRL(indicadores.data.entradas) : null,
      icon: ArrowDownCircle,
    },
    {
      label: "Descontos",
      value: indicadores.data ? formatBRL(indicadores.data.descontos) : null,
      icon: TicketPercent,
    },
  ];

  const gaugeData = useMemo(() => {
    if (!indicadores.data) return null;
    const { total, metaMax } = indicadores.data;
    const pct = metaMax > 0 ? Math.min(1, total / metaMax) : 0;
    return [
      { name: "atingido", value: pct },
      { name: "restante", value: 1 - pct },
    ];
  }, [indicadores.data]);

  const totalRegistros = listaQuery.data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / PAGE_SIZE));
  const vendas = listaQuery.data?.vendas ?? [];

  const temFiltro = !!filtroStatus || !!filtroMes || !!busca;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Relatório de Vendas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Desempenho de vendas da filial {filialAtiva?.nome ?? ""}.
        </p>
      </header>

      {/* Cross-filter charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Vendas por status</h2>
                <p className="text-xs text-muted-foreground">
                  Clique em uma fatia para filtrar a tabela
                </p>
              </div>
              {filtroStatus && (
                <Badge
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-secondary/80"
                  onClick={() => {
                    setFiltroStatus(null);
                    resetPage();
                  }}
                >
                  {filtroStatus}
                  <X className="h-3 w-3" />
                </Badge>
              )}
            </div>
            <div className="h-64">
              {!indicadores.data ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(0 0% 90%)",
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatBRL(v)}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(v) => <span style={{ color: INK }}>{v}</span>}
                    />
                    <Pie
                      data={indicadores.data.porStatus}
                      dataKey="valor"
                      nameKey="status"
                      innerRadius={55}
                      outerRadius={90}
                      stroke="#fff"
                      strokeWidth={2}
                      onClick={(d: { status: Venda["status"] }) => {
                        setFiltroStatus((atual) => (atual === d.status ? null : d.status));
                        resetPage();
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {indicadores.data.porStatus.map((entry) => {
                        const active = !filtroStatus || filtroStatus === entry.status;
                        return (
                          <Cell
                            key={entry.status}
                            fill={STATUS_COLORS[entry.status]}
                            opacity={active ? 1 : 0.25}
                          />
                        );
                      })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Vendas por mês</h2>
                <p className="text-xs text-muted-foreground">
                  Referência visual dos últimos meses
                </p>
              </div>
              {filtroMes && (
                <Badge
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-secondary/80"
                  onClick={() => setFiltroMes(null)}
                >
                  {filtroMes}
                  <X className="h-3 w-3" />
                </Badge>
              )}
            </div>
            <div className="h-64">
              {!indicadores.data ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={indicadores.data.porMes}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: MUTED }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: MUTED }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatCompact}
                      width={60}
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
                      radius={[4, 4, 0, 0]}
                      onClick={(d: { mes: string }) =>
                        setFiltroMes((atual) => (atual === d.mes ? null : d.mes))
                      }
                      style={{ cursor: "pointer" }}
                    >
                      {indicadores.data.porMes.map((entry) => {
                        const active = !filtroMes || filtroMes === entry.mes;
                        return (
                          <Cell key={entry.mes} fill={CHART_VIOLET} opacity={active ? 1 : 0.25} />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de vendas com paginação server-side */}
      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Vendas detalhadas</h2>
              <p className="text-xs text-muted-foreground">
                {listaQuery.isLoading
                  ? "Carregando..."
                  : listaQuery.error
                    ? "Erro ao carregar"
                    : `${totalRegistros.toLocaleString("pt-BR")} registro${totalRegistros === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <form
                className="relative"
                onSubmit={(e) => {
                  e.preventDefault();
                  setBusca(buscaInput.trim());
                  resetPage();
                }}
              >
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={buscaInput}
                  onChange={(e) => setBuscaInput(e.target.value)}
                  placeholder="Buscar nota, cliente, vendedor..."
                  className="pl-9 h-9 w-64"
                />
              </form>
              {temFiltro && (
                <>
                  {filtroStatus && (
                    <Badge
                      variant="outline"
                      className="gap-1 cursor-pointer border-brand/40 text-brand hover:bg-brand-soft"
                      onClick={() => {
                        setFiltroStatus(null);
                        resetPage();
                      }}
                    >
                      Status: {filtroStatus}
                      <X className="h-3 w-3" />
                    </Badge>
                  )}
                  {busca && (
                    <Badge
                      variant="outline"
                      className="gap-1 cursor-pointer border-brand/40 text-brand hover:bg-brand-soft"
                      onClick={() => {
                        setBusca("");
                        setBuscaInput("");
                        resetPage();
                      }}
                    >
                      Busca: {busca}
                      <X className="h-3 w-3" />
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-brand hover:text-brand hover:bg-brand-soft"
                    onClick={() => {
                      setFiltroStatus(null);
                      setFiltroMes(null);
                      setBusca("");
                      setBuscaInput("");
                      resetPage();
                    }}
                  >
                    Limpar filtros
                  </Button>
                </>
              )}
            </div>
          </div>

          {listaQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="font-medium">Falha ao carregar vendas</div>
                <div className="text-xs opacity-80 mt-0.5">
                  {(listaQuery.error as Error).message}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => listaQuery.refetch()}>
                Tentar de novo
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nota</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaQuery.isLoading && !listaQuery.data ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : vendas.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendas.map((v) => (
                      <TableRow key={v.id} className={listaQuery.isFetching ? "opacity-70" : ""}>
                        <TableCell className="font-medium">{v.numeroNota}</TableCell>
                        <TableCell>{v.cliente}</TableCell>
                        <TableCell>{v.vendedor}</TableCell>
                        <TableCell>{formatDate(v.data)}</TableCell>
                        <TableCell>
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-medium"
                            style={{ color: STATUS_COLORS[v.status] }}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: STATUS_COLORS[v.status] }}
                            />
                            {v.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatBRL(v.valor)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginação */}
          {!listaQuery.error && totalRegistros > 0 && (
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <div>
                Página <span className="tabular-nums font-medium text-foreground">{page}</span> de{" "}
                <span className="tabular-nums font-medium text-foreground">{totalPaginas}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={page <= 1 || listaQuery.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={page >= totalPaginas || listaQuery.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs + Meta */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
          {kpis.map((c) => (
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
                  {c.value ? (
                    <div className="text-2xl font-semibold tabular-nums tracking-tight">
                      {c.value}
                    </div>
                  ) : (
                    <Skeleton className="h-8 w-32" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Meta por loja - gauge semicircular */}
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold tracking-tight">Meta por loja</h2>
            <div className="relative h-40 mt-2">
              {!indicadores.data || !gaugeData ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gaugeData}
                        dataKey="value"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={70}
                        outerRadius={100}
                        cy="85%"
                        stroke="none"
                      >
                        <Cell fill={CHART_BLUE} />
                        <Cell fill="hsl(0 0% 92%)" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-x-0 bottom-2 text-center">
                    <div className="text-lg font-semibold tabular-nums">
                      {formatMil(indicadores.data.total)}
                    </div>
                  </div>
                </>
              )}
            </div>
            {indicadores.data && (
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>{formatMil(indicadores.data.metaMin)}</span>
                <span className="text-foreground">
                  Meta: {formatMil(indicadores.data.meta)}
                </span>
                <span>{formatMil(indicadores.data.metaMax)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vendas por dia + Venda por vendedor */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-[var(--shadow-soft)]">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold tracking-tight">Vendas por dia</h2>
              <p className="text-xs text-muted-foreground">
                Soma de valor de venda nos últimos 30 dias
              </p>
            </div>
            <div className="h-72">
              {indicadores.isLoading || !indicadores.data ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={indicadores.data.porDia}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="dia"
                      tick={{ fontSize: 11, fill: MUTED }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(iso) => {
                        const d = new Date(iso);
                        return `${String(d.getDate()).padStart(2, "0")}/${String(
                          d.getMonth() + 1,
                        ).padStart(2, "0")}`;
                      }}
                      minTickGap={30}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: MUTED }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatCompact}
                      width={60}
                    />
                    <Tooltip
                      cursor={{ stroke: "hsl(0 0% 80%)" }}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(0 0% 90%)",
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatBRL(v)}
                      labelFormatter={(iso) =>
                        new Date(iso as string).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                        })
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="valor"
                      stroke={CHART_EMERALD}
                      strokeWidth={2.5}
                      dot={{ r: 2.5, fill: CHART_EMERALD, stroke: CHART_EMERALD }}
                      activeDot={{ r: 5, fill: CHART_TEAL, stroke: CHART_EMERALD, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold tracking-tight">Venda por vendedor</h2>
              <p className="text-xs text-muted-foreground">Ranking por valor faturado</p>
            </div>
            <div className="h-[420px]">
              {indicadores.isLoading || !indicadores.data ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={indicadores.data.porVendedor}
                    layout="vertical"
                    margin={{ top: 4, right: 40, left: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="vendedor"
                      tick={{ fontSize: 11, fill: INK }}
                      axisLine={false}
                      tickLine={false}
                      width={130}
                      interval={0}
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
                      fill={CHART_TEAL}
                      radius={[0, 4, 4, 0]}
                      label={{
                        position: "right",
                        formatter: (v: number) => formatMil(v),
                        fontSize: 11,
                        fill: MUTED,
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
