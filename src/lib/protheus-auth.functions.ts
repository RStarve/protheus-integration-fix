import { createServerFn } from "@tanstack/react-start";

const PROTHEUS_BASE_URL = "https://appcometa.fortiddns.com";

export interface ProtheusLoginInput {
  username: string;
  password: string;
}

export interface ProtheusRefreshInput {
  refresh_token: string;
}

export interface ProtheusTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  lojas?: string;
}

/**
 * Autentica no Protheus via OAuth2 (grant_type=password).
 * Roda no server pra evitar CORS e não expor a URL interna ao cliente.
 */
export const loginProtheus = createServerFn({ method: "POST" })
  .inputValidator((data: ProtheusLoginInput) => {
    if (!data || typeof data.username !== "string" || typeof data.password !== "string") {
      throw new Error("Usuário e senha são obrigatórios.");
    }
    if (!data.username.trim() || !data.password) {
      throw new Error("Usuário e senha são obrigatórios.");
    }
    return { username: data.username.trim(), password: data.password };
  })
  .handler(async ({ data }) => {
    const url = `${PROTHEUS_BASE_URL}/api/oauth2/v1/token`;

    // Envio seguro dos parâmetros pelo Corpo (Body) da requisição
    const bodyParams = new URLSearchParams();
    bodyParams.set("grant_type", "password");
    bodyParams.set("username", data.username);
    bodyParams.set("password", data.password);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyParams.toString(),
      });
    } catch (err) {
      console.error("[protheus] falha de rede ao autenticar:", err);
      throw new Error("Não foi possível conectar ao servidor Protheus. Verifique a rede/VPN.");
    }

    const raw = await response.text();
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      // resposta não-JSON
    }

    if (!response.ok) {
      const message =
        (parsed && typeof parsed === "object" && parsed !== null
          ? ((parsed as Record<string, unknown>).error_description ??
            (parsed as Record<string, unknown>).message ??
            (parsed as Record<string, unknown>).error)
          : null) ?? `Falha na autenticação (HTTP ${response.status}).`;
      throw new Error(String(message));
    }

    const token = parsed as ProtheusTokenResponse | null;
    if (!token?.access_token) {
      throw new Error("Resposta do Protheus não contém access_token.");
    }

    return {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_type: token.token_type ?? "Bearer",
      expires_in: token.expires_in,
      scope: token.scope,
      username: data.username,
    };
  });

/**
 * Renova o token do Protheus via OAuth2 (grant_type=refresh_token).
 * Usa o refresh_token salvo no cliente para buscar um novo access_token.
 */
export const refreshProtheusToken = createServerFn({ method: "POST" })
  .inputValidator((data: ProtheusRefreshInput) => {
    if (!data || typeof data.refresh_token !== "string" || !data.refresh_token.trim()) {
      throw new Error("Refresh token é obrigatório.");
    }
    return { refresh_token: data.refresh_token.trim() };
  })
  .handler(async ({ data }) => {
    const url = `${PROTHEUS_BASE_URL}/api/oauth2/v1/token`;

    // Envio seguro dos parâmetros pelo Corpo (Body) da requisição
    const bodyParams = new URLSearchParams();
    bodyParams.set("grant_type", "refresh_token");
    bodyParams.set("refresh_token", data.refresh_token);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyParams.toString(),
      });
    } catch (err) {
      console.error("[protheus] falha de rede ao renovar token:", err);
      throw new Error("Não foi possível conectar ao servidor Protheus para renovar o token.");
    }

    const raw = await response.text();
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      // resposta não-JSON
    }

    if (!response.ok) {
      const message =
        (parsed && typeof parsed === "object" && parsed !== null
          ? ((parsed as Record<string, unknown>).error_description ??
            (parsed as Record<string, unknown>).message ??
            (parsed as Record<string, unknown>).error)
          : null) ?? `Falha ao renovar token (HTTP ${response.status}).`;
      throw new Error(String(message));
    }

    const token = parsed as ProtheusTokenResponse | null;
    if (!token?.access_token) {
      throw new Error("Resposta do Protheus não contém novo access_token.");
    }

    // Retorna os novos tokens para o frontend atualizar o armazenamento
    return {
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? data.refresh_token, // Se não vier um novo, mantém o antigo
      token_type: token.token_type ?? "Bearer",
      expires_in: token.expires_in,
      scope: token.scope,
    };
  });
