import { createServerFn } from "@tanstack/react-start";

const PROTHEUS_BASE_URL = "https://appcometa.fortiddns.com";

export interface ProdutoCompra {
  codigo: string;
  descri: string;
  marca_nome: string;
  categoria: string;
  qtestq: number;
  qtvend: number;
  vlvend: number;
  vlcust: number;
}

export interface ObterComprasInput {
  loja: string;
  token?: string;
  dataInicio?: string;
  dataFim?: string;
}

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const toStr = (v: unknown): string =>
  typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();

export const obterComprasProtheus = createServerFn({ method: "POST" })
  .inputValidator((data: ObterComprasInput) => {
    if (!data || typeof data.loja !== "string" || !data.loja.trim()) {
      throw new Error("Loja é obrigatória.");
    }
    return {
      loja: data.loja.trim(),
      token: data.token,
      dataInicio: data.dataInicio?.trim() || undefined,
      dataFim: data.dataFim?.trim() || undefined,
    };
  })
  .handler(async ({ data }): Promise<ProdutoCompra[]> => {
    const url = `${PROTHEUS_BASE_URL}/ag/externos/reports/arelcmp`;

    let response: Response;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (data.token) headers.Authorization = `Bearer ${data.token}`;
      // YYYY-MM-DD -> YYYYMMDD (padrão Protheus). Enviamos as duas variações
      // de nome para compatibilidade com o backend.
      const toProtheusDate = (v?: string) =>
        v ? v.replace(/-/g, "").slice(0, 8) : undefined;
      const di = toProtheusDate(data.dataInicio);
      const df = toProtheusDate(data.dataFim);
      const body: Record<string, string> = { loja: data.loja };
      if (di) {
        body.dataInicio = di;
        body.data_inicio = di;
      }
      if (df) {
        body.dataFim = df;
        body.data_fim = df;
      }
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error("[protheus] falha de rede em arelcmp:", err);
      throw new Error("Não foi possível conectar ao servidor Protheus.");
    }

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`Falha ao buscar compras (HTTP ${response.status}).`);
    }

    let envelope: unknown = null;
    try {
      envelope = raw ? JSON.parse(raw) : null;
    } catch {
      throw new Error("Resposta inválida do Protheus (envelope).");
    }

    // A propriedade `dados` vem como STRING JSON
    let dadosRaw: unknown = null;
    if (envelope && typeof envelope === "object") {
      const o = envelope as Record<string, unknown>;
      dadosRaw = o.dados ?? o.data ?? o.result;
    }

    let lista: unknown[] = [];
    if (typeof dadosRaw === "string") {
      try {
        const parsed = JSON.parse(dadosRaw);
        if (Array.isArray(parsed)) lista = parsed;
      } catch {
        throw new Error("Resposta inválida do Protheus (dados).");
      }
    } else if (Array.isArray(dadosRaw)) {
      lista = dadosRaw;
    }

    return lista.map((item) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return {
        codigo: toStr(o.codigo),
        descri: toStr(o.descri),
        marca_nome: toStr(o.marca_nome),
        categoria: toStr(o.categoria),
        qtestq: toNumber(o.qtestq),
        qtvend: toNumber(o.qtvend),
        vlvend: toNumber(o.vlvend),
        vlcust: toNumber(o.vlcust),
      } satisfies ProdutoCompra;
    });
  });
