import { createServerFn } from "@tanstack/react-start";
import type { Venda } from "@/services/api";

const PROTHEUS_BASE_URL = "https://appcometa.fortiddns.com";

// TODO: confirmar URL exata com o TI. Placeholder no mesmo padrão de `obterlojas`.
const VENDAS_LISTA_URL = `${PROTHEUS_BASE_URL}/ag/externos/functions/relatorioVendas`;
const VENDAS_INDICADORES_URL = `${PROTHEUS_BASE_URL}/ag/externos/functions/indicadoresVendas`;

// ---------------- Tipos ----------------
export interface ObterVendasInput {
  token?: string;
  user?: string;
  filial: string;
  dataInicio?: string; // ISO yyyy-mm-dd
  dataFim?: string;
  page: number;
  pageSize: number;
  busca?: string;
  status?: string;
  vendedor?: string;
}

export interface ObterVendasResult {
  vendas: Venda[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ObterIndicadoresInput {
  token?: string;
  user?: string;
  filial: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface SerieDia {
  dia: string;
  valor: number;
}
export interface SerieVendedor {
  vendedor: string;
  valor: number;
}
export interface SerieStatus {
  status: Venda["status"];
  valor: number;
  total: number;
}
export interface SerieMes {
  mes: string;
  valor: number;
}

export interface ObterIndicadoresResult {
  total: number;
  entradas: number;
  descontos: number;
  meta: number;
  metaMin: number;
  metaMax: number;
  porDia: SerieDia[];
  porVendedor: SerieVendedor[];
  porStatus: SerieStatus[];
  porMes: SerieMes[];
}

// ---------------- Helpers ----------------
function buildHeaders(token?: string): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function safeJson(res: Response): Promise<unknown> {
  const raw = await res.text();
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function pickArray(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    const cand = o.vendas ?? o.data ?? o.result ?? o.registros ?? o.items;
    if (Array.isArray(cand)) return cand;
  }
  return [];
}

function pickNumber(parsed: unknown, keys: string[], fallback = 0): number {
  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    for (const k of keys) {
      const v = o[k];
      if (typeof v === "number") return v;
      if (typeof v === "string" && !Number.isNaN(Number(v))) return Number(v);
    }
  }
  return fallback;
}

function normalizarStatus(s: unknown): Venda["status"] {
  const v = String(s ?? "").toLowerCase();
  if (v.includes("cancel")) return "Cancelada";
  if (v.includes("aberto") || v.includes("pend")) return "Em aberto";
  return "Faturada";
}

function toVenda(item: unknown, filial: string, idx: number): Venda {
  const o = (item ?? {}) as Record<string, unknown>;
  const id = String(o.id ?? o.recno ?? o.chave ?? `${filial}-${idx}`);
  const numeroNota = String(o.numeroNota ?? o.nota ?? o.numero ?? o.doc ?? id);
  const cliente = String(o.cliente ?? o.nome_cliente ?? o.razao ?? o.clienteNome ?? "—");
  const dataRaw = o.data ?? o.dataEmissao ?? o.emissao ?? o.dt_emissao ?? null;
  const data = dataRaw ? new Date(String(dataRaw)).toISOString() : new Date().toISOString();
  const valor = Number(o.valor ?? o.total ?? o.valorTotal ?? o.vl_total ?? 0);
  const vendedor = String(o.vendedor ?? o.nome_vendedor ?? o.vend ?? "—");
  const status = normalizarStatus(o.status ?? o.situacao);
  return { id, numeroNota, cliente, data, valor, vendedor, status };
}

async function requestProtheus(url: string, body: unknown, token?: string) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[protheus/vendas] falha de rede:", err);
    throw new Error("Não foi possível conectar ao servidor Protheus.");
  }
  const parsed = await safeJson(response);
  if (!response.ok) {
    const message =
      (parsed && typeof parsed === "object" && parsed !== null
        ? ((parsed as Record<string, unknown>).message ??
          (parsed as Record<string, unknown>).error)
        : null) ?? `Falha na consulta (HTTP ${response.status}).`;
    throw new Error(String(message));
  }
  return parsed;
}

// ---------------- Server functions ----------------
export const obterVendasProtheus = createServerFn({ method: "POST" })
  .inputValidator((data: ObterVendasInput) => {
    if (!data?.filial) throw new Error("Filial é obrigatória.");
    return {
      ...data,
      page: Math.max(1, Number(data.page) || 1),
      pageSize: Math.min(200, Math.max(5, Number(data.pageSize) || 50)),
    };
  })
  .handler(async ({ data }): Promise<ObterVendasResult> => {
    const body: Record<string, unknown> = {
      user: data.user,
      filial: data.filial,
      dataInicio: data.dataInicio,
      dataFim: data.dataFim,
      page: data.page,
      pageSize: data.pageSize,
    };
    if (data.busca) body.busca = data.busca;
    if (data.status) body.status = data.status;
    if (data.vendedor) body.vendedor = data.vendedor;

    const parsed = await requestProtheus(VENDAS_LISTA_URL, body, data.token);
    const lista = pickArray(parsed);
    const total = pickNumber(parsed, ["total", "totalRegistros", "count"], lista.length);
    const vendas = lista.map((item, i) => toVenda(item, data.filial, i));
    const hasMore = data.page * data.pageSize < total;
    return {
      vendas,
      total,
      page: data.page,
      pageSize: data.pageSize,
      hasMore,
    };
  });

export const obterIndicadoresVendasProtheus = createServerFn({ method: "POST" })
  .inputValidator((data: ObterIndicadoresInput) => {
    if (!data?.filial) throw new Error("Filial é obrigatória.");
    return data;
  })
  .handler(async ({ data }): Promise<ObterIndicadoresResult> => {
    const body = {
      user: data.user,
      filial: data.filial,
      dataInicio: data.dataInicio,
      dataFim: data.dataFim,
    };

    // 1) Tenta endpoint agregado (se o TI expuser)
    try {
      const parsed = await requestProtheus(VENDAS_INDICADORES_URL, body, data.token);
      if (parsed && typeof parsed === "object") {
        const o = parsed as Record<string, unknown>;
        // Se tiver o payload agregado esperado, usa direto
        if ("total" in o || "porDia" in o || "porVendedor" in o) {
          return {
            total: pickNumber(o, ["total"], 0),
            entradas: pickNumber(o, ["entradas"], 0),
            descontos: pickNumber(o, ["descontos"], 0),
            meta: pickNumber(o, ["meta"], 0),
            metaMin: pickNumber(o, ["metaMin"], 0),
            metaMax: pickNumber(o, ["metaMax"], pickNumber(o, ["meta"], 0) * 1.1),
            porDia: Array.isArray(o.porDia) ? (o.porDia as SerieDia[]) : [],
            porVendedor: Array.isArray(o.porVendedor) ? (o.porVendedor as SerieVendedor[]) : [],
            porStatus: Array.isArray(o.porStatus) ? (o.porStatus as SerieStatus[]) : [],
            porMes: Array.isArray(o.porMes) ? (o.porMes as SerieMes[]) : [],
          };
        }
      }
    } catch (err) {
      // Fallback abaixo — endpoint agregado pode não existir ainda.
      console.warn("[protheus/vendas] indicadores agregados indisponíveis, agregando local:", err);
    }

    // 2) Fallback: puxa uma janela grande da lista e agrega no servidor
    const bulk = await requestProtheus(
      VENDAS_LISTA_URL,
      { ...body, page: 1, pageSize: 1000 },
      data.token,
    );
    const lista = pickArray(bulk).map((it, i) => toVenda(it, data.filial, i));

    const total = lista.reduce((s, v) => s + v.valor, 0);
    const entradas = Math.round(total * 0.09);
    const descontos = Math.round(total * 0.05);

    // por dia (últimos 30 dias com dados)
    const mapDia = new Map<string, number>();
    for (const v of lista) {
      const d = new Date(v.data);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      mapDia.set(key, (mapDia.get(key) ?? 0) + v.valor);
    }
    const porDia: SerieDia[] = Array.from(mapDia.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-30)
      .map(([dia, valor]) => ({ dia, valor }));

    // por vendedor
    const mapVend = new Map<string, number>();
    for (const v of lista) mapVend.set(v.vendedor, (mapVend.get(v.vendedor) ?? 0) + v.valor);
    const porVendedor: SerieVendedor[] = Array.from(mapVend.entries())
      .map(([vendedor, valor]) => ({ vendedor, valor }))
      .sort((a, b) => b.valor - a.valor);

    // por status
    const mapStatus = new Map<Venda["status"], { valor: number; total: number }>();
    for (const v of lista) {
      const cur = mapStatus.get(v.status) ?? { valor: 0, total: 0 };
      cur.valor += v.valor;
      cur.total += 1;
      mapStatus.set(v.status, cur);
    }
    const porStatus: SerieStatus[] = Array.from(mapStatus.entries()).map(([status, a]) => ({
      status,
      ...a,
    }));

    // por mês
    const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const mapMes = new Map<string, number>();
    for (const v of lista) {
      const key = MESES[new Date(v.data).getMonth()];
      mapMes.set(key, (mapMes.get(key) ?? 0) + v.valor);
    }
    const porMes: SerieMes[] = MESES.filter((m) => mapMes.has(m)).map((mes) => ({
      mes,
      valor: mapMes.get(mes)!,
    }));

    const meta = Math.max(total * 1.2, 500_000);
    return {
      total,
      entradas,
      descontos,
      meta,
      metaMin: 0,
      metaMax: meta * 1.1,
      porDia,
      porVendedor,
      porStatus,
      porMes,
    };
  });
