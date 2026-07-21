import { createServerFn } from "@tanstack/react-start";
import type { Filial } from "@/services/api";

const PROTHEUS_BASE_URL = "https://appcometa.fortiddns.com";

export interface ObterLojasInput {
  user: string;
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
    return { user: data.user.trim() };
  })
  .handler(async ({ data }): Promise<Filial[]> => {
    const url = `${PROTHEUS_BASE_URL}/ag/externos/functions/obterlojas`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ user: data.user }),
      });
    } catch (err) {
      console.error("[protheus] falha de rede ao obter lojas:", err);
      throw new Error("Não foi possível conectar ao servidor Protheus.");
    }

    const raw = await response.text();
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
          : null) ?? `Falha ao buscar lojas (HTTP ${response.status}).`;
      throw new Error(String(message));
    }

    // Aceita vários formatos: array direto, { lojas: [] }, { data: [] }, { result: [] }
    let lista: unknown[] = [];
    if (Array.isArray(parsed)) lista = parsed;
    else if (parsed && typeof parsed === "object") {
      const o = parsed as Record<string, unknown>;
      const cand = o.lojas ?? o.data ?? o.result ?? o.filiais ?? o.stores;
      if (Array.isArray(cand)) lista = cand;
    }

    return lista.map((item, idx) => {
      const o = (item ?? {}) as Record<string, unknown>;
      const codigo = String(
        o.codigo ?? o.code ?? o.cod ?? o.filial ?? o.loja ?? o.id ?? idx + 1,
      );
      const nome = String(
        o.nome ?? o.name ?? o.descricao ?? o.description ?? `Loja ${codigo}`,
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
