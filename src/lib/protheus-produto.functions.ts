import { createServerFn } from "@tanstack/react-start";

const PROTHEUS_BASE_URL = "https://appcometa.fortiddns.com";

export interface ObterProdutoDetalheInput {
  loja: string;
  codigo: string;
  token?: string;
}

export interface ProdutoDetalhe {
  raw: unknown;
  campos: Array<{ chave: string; valor: string }>;
}

const toDisplay = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v.trim();
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

export const obterProdutoDetalheProtheus = createServerFn({ method: "POST" })
  .inputValidator((data: ObterProdutoDetalheInput) => {
    if (!data || typeof data.loja !== "string" || !data.loja.trim()) {
      throw new Error("Loja é obrigatória.");
    }
    if (!data.codigo || !String(data.codigo).trim()) {
      throw new Error("Código do produto é obrigatório.");
    }
    return {
      loja: data.loja.trim(),
      codigo: String(data.codigo).trim(),
      token: data.token,
    };
  })
  .handler(async ({ data }): Promise<ProdutoDetalhe> => {
    const url = `${PROTHEUS_BASE_URL}/ag/externos/reports/abuscgrd`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (data.token) headers.Authorization = `Bearer ${data.token}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ loja: data.loja, codigo: data.codigo }),
      });
    } catch (err) {
      console.error("[protheus] falha de rede em abuscgrd:", err);
      throw new Error("Não foi possível conectar ao servidor Protheus.");
    }

    const raw = await response.text();
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "UNAUTHORIZED: Sessão expirada ou usuário sem permissão. Faça login novamente.",
        );
      }
      throw new Error(`Falha ao buscar detalhes do produto (HTTP ${response.status}).`);
    }

    let envelope: unknown = null;
    try {
      envelope = raw ? JSON.parse(raw) : null;
    } catch {
      throw new Error("Resposta inválida do Protheus (detalhe).");
    }

    // dados pode vir como string JSON, objeto ou array
    let dadosRaw: unknown = envelope;
    if (envelope && typeof envelope === "object") {
      const o = envelope as Record<string, unknown>;
      dadosRaw = o.dados ?? o.data ?? o.result ?? envelope;
    }
    if (typeof dadosRaw === "string") {
      try {
        dadosRaw = JSON.parse(dadosRaw);
      } catch {
        // mantém como string bruta
      }
    }

    let obj: Record<string, unknown> = {};
    if (Array.isArray(dadosRaw)) {
      obj = (dadosRaw[0] as Record<string, unknown>) ?? {};
    } else if (dadosRaw && typeof dadosRaw === "object") {
      obj = dadosRaw as Record<string, unknown>;
    }

    const campos = Object.entries(obj).map(([chave, valor]) => ({
      chave,
      valor: toDisplay(valor),
    }));

    return { raw: dadosRaw, campos };
  });