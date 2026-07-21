import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  Receipt,
  Wallet,
  TrendingUp,
  Target,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import {
  getIndicadoresCrediario,
  getCrescimentoMensal,
  getCrediarioPorColaborador,
} from "@/services/api";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/app/clientes")({
  component: ClientesPage,
});

// Paleta colorida para os gráficos — independente da identidade visual do site
const CHART_BLUE = "hsl(217 91% 60%)";
const CHART_EMERALD = "hsl(142 71% 45%)";
const CHART_AMBER = "hsl(38 92% 50%)";
const CHART_VIOLET = "hsl(263 70% 50%)";
const INK = "hsl(0 0% 12%)";
const MUTED = "hsl(0 0% 55%)";

const formatCompact = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}k`
      : String(Math.round(n));

const formatNumber = (n: number) => n.toLocaleString("pt-BR");
const formatPct = (n: number) =>
  `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

function ClientesPage() {
  const { filialAtiva } = useAuth();
  const filialId = filialAtiva?.id ?? "";
  const [busca, setBusca] = useState("");

  const kpisQ = useQuery({
    queryKey: ["crediario-kpis", filialId],
    queryFn: () => getIndicadoresCrediario(filialId),
    enabled: !!filialId,
  });
  const crescimentoQ = useQuery({
    queryKey: ["crediario-crescimento", filialId],
    queryFn: () => getCrescimentoMensal(filialId),
    enabled: !!filialId,
  });
  const colabQ = useQuery({
    queryKey: ["crediario-colab", filialId],
    queryFn: () => getCrediarioPorColaborador(filialId),
    enabled: !!filialId,
  });

  const k = kpisQ.data;
  const metaPct = k ? Math.min(100, (k.valorTotal / k.meta) * 100) : 0;

  const donutData = useMemo(() => {
    if (!k) return [];
    return [
      { name: "Com vendas", value: k.clientesComVendas },
      { name: "Sem vendas", value: k.clientesSemVendas },
    ];
  }, [k]);

  const filtered = useMemo(() => {
    if (!colabQ.data) return [];
    const q = busca.trim().toLowerCase();
    if (!q) return colabQ.data;
    return colabQ.data.filter((c) => c.colaborador.toLowerCase().includes(q));
  }, [colabQ.data, busca]);

  const totals = useMemo(() => {
    const list = filtered;
    return list.reduce(
      (acc, c) => {
        acc.vlrVenda += c.vlrVenda;
        acc.ticketMedio += c.ticketMedio;
        acc.vlrEntrada += c.vlrEntrada;
        acc.aproveitamento += c.aproveitamento;
        acc.limiteLiberado += c.limiteLiberado;
        acc.utilizadoLimite += c.utilizadoLimite;
        return acc;
      },
      {
        vlrVenda: 0,
        ticketMedio: 0,
        vlrEntrada: 0,
        aproveitamento: 0,
        limiteLiberado: 0,
        utilizadoLimite: 0,
      },
    );
  }, [filtered]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Crediários Abertos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão de cadastros, aproveitamento e limites da filial {filialAtiva?.nome ?? ""}.
        </p>
      </header>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Cadastros totais"
          value={k ? formatNumber(k.cadastrosTotal) : null}
        />
        <KpiCard
          icon={<UserCheck className="h-4 w-4" />}
          label="Clientes com vendas"
          value={k ? formatNumber(k.clientesComVendas) : null}
        />
        <KpiCard
          icon={<UserX className="h-4 w-4" />}
          label="Clientes sem vendas"
          value={k ? formatNumber(k.clientesSemVendas) : null}
        />
        <KpiCard
          icon={<Receipt className="h-4 w-4" />}
          label="Ticket médio"
          value={k ? formatBRL(k.ticketMedio) : null}
        />
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="Soma de valor"
          value={k ? formatBRL(k.valorTotal) : null}
        />
        <KpiCard
          icon={<Target className="h-4 w-4" />}
          label="Meta"
          value={k ? formatBRL(k.meta) : null}
          footer={
            k ? (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ backgroundColor: CHART_VIOLET, width: `${metaPct}%` }}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                  {metaPct.toFixed(1)}% atingida
                </div>
              </div>
            ) : null
          }
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="% Crescimento anual"
          value={k ? formatPct(k.crescimentoAnual) : null}
          accent
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold">
              Clientes com vendas × sem vendas
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Distribuição da base de crediários por loja.
            </p>
            <div className="h-72 mt-4">
              {kpisQ.isLoading || !k ? (
                <Skeleton className="w-full h-full rounded-md" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={2}
                      stroke="hsl(0 0% 100%)"
                      strokeWidth={2}
                    >
                      <Cell fill={CHART_EMERALD} />
                      <Cell fill={CHART_AMBER} />
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatNumber(v)}
                      contentStyle={{
                        border: "1px solid hsl(0 0% 90%)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-center gap-6 text-xs">
              <Legend color={CHART_EMERALD} label={`Com vendas (${k ? formatNumber(k.clientesComVendas) : "–"})`} />
              <Legend color={CHART_AMBER} label={`Sem vendas (${k ? formatNumber(k.clientesSemVendas) : "–"})`} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-soft)]">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold">% Crescimento mensal</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Evolução do crediário mês a mês.
            </p>
            <div className="h-72 mt-4">
              {crescimentoQ.isLoading || !crescimentoQ.data ? (
                <Skeleton className="w-full h-full rounded-md" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={crescimentoQ.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 92%)" vertical={false} />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: MUTED }}
                      tickFormatter={(v: string) => v.slice(0, 3)}
                      axisLine={{ stroke: "hsl(0 0% 88%)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: MUTED }}
                      tickFormatter={(v: number) => `${v}%`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v: number) => formatPct(v)}
                      contentStyle={{
                        border: "1px solid hsl(0 0% 90%)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="crescimento"
                      stroke={CHART_BLUE}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: CHART_BLUE, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meta gauge full width */}
      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">Meta de crediário</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Realizado {k ? formatBRL(k.valorTotal) : "–"} de {k ? formatBRL(k.meta) : "–"}
              </p>
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              {metaPct.toFixed(1)}%
            </div>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden mt-4">
            <div
              className="h-full transition-all"
              style={{ backgroundColor: CHART_VIOLET, width: `${metaPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Detalhamento por colaborador</h3>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar colaborador..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Primeiro Código</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead className="text-right">Vlr. Venda</TableHead>
                  <TableHead className="text-right">Ticket médio</TableHead>
                  <TableHead className="text-right">Vlr. Entrada</TableHead>
                  <TableHead className="text-right">Aproveitamento</TableHead>
                  <TableHead className="text-right">Limite liberado</TableHead>
                  <TableHead className="text-right">Utilizado do limite (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colabQ.isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      Nenhum colaborador encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.colaborador}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {c.primeiroCodigo}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {c.loja}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(c.vlrVenda)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(c.ticketMedio)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(c.vlrEntrada)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPct(c.aproveitamento)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(c.limiteLiberado)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-medium ${
                          c.utilizadoLimite > 100 ? "text-brand" : ""
                        }`}
                      >
                        {formatPct(c.utilizadoLimite)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {filtered.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-secondary/60 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="tabular-nums">—</TableCell>
                    <TableCell className="tabular-nums">
                      {filialId.padStart(2, "0")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(totals.vlrVenda)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(totals.ticketMedio / filtered.length)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(totals.vlrEntrada)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPct(totals.aproveitamento / filtered.length)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(totals.limiteLiberado)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPct(totals.utilizadoLimite / filtered.length)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  footer,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  footer?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className="shadow-[var(--shadow-soft)]">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div
            className={`h-7 w-7 grid place-items-center rounded-md ${
              accent ? "bg-brand-soft text-brand" : "bg-secondary text-foreground/70"
            }`}
          >
            {icon}
          </div>
          <span className="text-[11px] uppercase tracking-wide truncate">{label}</span>
        </div>
        <div className={`mt-3 text-xl font-semibold tabular-nums truncate ${accent ? "text-brand" : ""}`}>
          {value ?? <Skeleton className="h-6 w-24 inline-block align-middle" />}
        </div>
        {footer}
      </CardContent>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

// Silence unused import if BarChart tree-shakes later — keep for future use.
void BarChart;
void Bar;
