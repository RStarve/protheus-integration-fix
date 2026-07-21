import { createServerFn } from "@tanstack/react-start";
import type { Filial } from "@/services/api";

const PROTHEUS_BASE_URL = "https://appcometa.fortiddns.com";

export interface ObterLojasInput {
  user: string;
  token?: string;
}

/**
 * Busca as lojas/filiais que o usuário logado tem permissão de visualizar.
 * Roda no server pra evitar CORS.
 */
export const obterLojasProtheus = createServerFn({ method: "POST" })
  .inputValidator((data: ObterLojasInput) => {
    if (!data || typeof data.user !== "string" || !data.user.trim()) {
      throw new Error("Usuário é obrigatório para buscar lojas.");
    }
    return { user: data.user.trim(), token: data.token };
  })
  .handler(async ({ data }): Promise<Filial[]> => {
    const url = `${PROTHEUS_BASE_URL}/ag/externos/functions/obterlojas`;

    console.log("[protheus] POST /obterlojas — user:", JSON.stringify(data.user));

    let response: Response;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (data.token) headers.Authorization = `Bearer ${data.token}`;
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ user: data.user }),
      });
    } catch (err) {
      console.error("[protheus] falha de rede ao obter lojas:", err);
      throw new Error("Não foi possível conectar ao servidor Protheus.");
    }

    const raw = await response.text();
    console.log("[protheus] /obterlojas status:", response.status, "raw:", raw?.slice(0, 500));
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      // não-JSON
    }

    if (!response.ok) {
      const message =
        (parsed && typeof parsed === "object" && parsed !== null
          ? ((parsed as Record<string, unknown>).message ??
            (parsed as Record<string, unknown>).error)
          : null) ?? `HTTP ${response.status}`;
      console.warn(
        "[protheus] /obterlojas rejeitou requisição:",
        response.status,
        String(message),
      );
      // Não lança: retorna lista vazia para que a UI trate como "sem filiais".
      return [];
    }

    // Aceita vários formatos: array direto, { lojas: [] }, { data: [] }, { result: [] }
    let lista: unknown[] = [];
    if (Array.isArray(parsed)) lista = parsed;
    else if (parsed && typeof parsed === "object") {
      const o = parsed as Record<string, unknown>;
      const cand =
        o.lojas ??
        o.data ??
        o.result ??
        o.filiais ??
        o.stores ??
        o.retorno ??
        o.records ??
        o.items;
      if (Array.isArray(cand)) lista = cand;
    }

    console.log("[protheus] /obterlojas normalizado — total:", lista.length);

    return lista.map((item, idx) => {
      const o = (item ?? {}) as Record<string, unknown>;
      const codigo = String(
        o.codigo ??
          o.code ??
          o.cod ??
          o.cod_filial ??
          o.codFilial ??
          o.cCodFilial ??
          o.filial ??
          o.M0_CODFIL ??
          o.loja ??
          o.id ??
          idx + 1,
      );
      const nome = String(
        o.nome ??
          o.name ??
          o.descricao ??
          o.descrição ??
          o.description ??
          o.desc ??
          o.fantasia ??
          o.razao ??
          o.M0_FILIAL ??
          `Loja ${codigo}`,
      );
      const uf = String(o.uf ?? o.estado ?? o.state ?? "").toUpperCase();
      return {
        id: String(o.id ?? codigo),
        codigo,
        nome,
        uf,
      } satisfies Filial;
    });
  });
