import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Filial, Usuario } from "@/services/api";

// DESCOMENTAMOS A IMPORTAÇÃO: Vamos usar a função que arrumamos!
import { obterLojasProtheus } from "@/lib/protheus-lojas.functions";

const FILIAL_PADRAO_CODIGO = "32";

interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  filialAtiva: Filial | null;
  selectedLoja: string;
  filiais: Filial[];
  filiaisLoading: boolean;
  filiaisError: string | null;
  setSession: (data: { token: string; usuario: Usuario }) => void;
  setFilialAtiva: (f: Filial) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "protheus.session.v1";

interface Persisted {
  token: string;
  usuario: Usuario;
  filialAtivaCodigo?: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [filialAtiva, setFilialAtivaState] = useState<Filial | null>(null);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filiaisLoading, setFiliaisLoading] = useState(false);
  const [filiaisError, setFiliaisError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pendingFilialCodigo, setPendingFilialCodigo] = useState<string | undefined>();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p: Persisted = JSON.parse(raw);
        setToken(p.token);
        setUsuario(p.usuario);
        setPendingFilialCodigo(p.filialAtivaCodigo);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Efeito que busca as filiais na API de verdade usando a função corrigida
  useEffect(() => {
    let isMounted = true;

    async function carregarLojas() {
      if (!usuario) {
        setFiliais([]);
        setFilialAtivaState(null);
        setFiliaisError(null);
        setFiliaisLoading(false);
        return;
      }

      setFiliaisLoading(true);
      setFiliaisError(null);

      try {
        // Chamada assíncrona para a função do servidor
        // Passamos o usuario.id (que guarda o username) e o token
        const filiaisUsuario = await obterLojasProtheus({
          user: usuario.id || (usuario as any).username || "",
          token: token || undefined,
        });

        if (!isMounted) return;

        setFiliais(filiaisUsuario);

        // Auto-seleção: se houver apenas 1 filial, seleciona automaticamente.
        const escolhida =
          filiaisUsuario.length === 1
            ? filiaisUsuario[0]
            : (filiaisUsuario.find((l) => l.codigo === pendingFilialCodigo) ??
              filiaisUsuario.find((l) => l.codigo === FILIAL_PADRAO_CODIGO) ??
              filiaisUsuario[0] ??
              null);

        setFilialAtivaState(escolhida);
        if (escolhida) persist({ filialAtivaCodigo: escolhida.codigo });
      } catch (error) {
        if (!isMounted) return;
        console.error("[AuthProvider] Erro ao carregar lojas:", error);
        setFiliaisError("Não foi possível carregar suas lojas.");
      } finally {
        if (isMounted) setFiliaisLoading(false);
      }
    }

    carregarLojas();

    return () => {
      isMounted = false;
    };
    // Re-executa sempre que o usuário logar
  }, [usuario, token, pendingFilialCodigo]);

  const persist = (next: Partial<Persisted> | null) => {
    if (!next) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const current: Persisted | null = (() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();
    const merged = { ...(current ?? {}), ...next } as Persisted;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  };

  const setSession = ({ token, usuario }: { token: string; usuario: Usuario }) => {
    setToken(token);
    setUsuario(usuario);
    setPendingFilialCodigo(undefined);
    persist({ token, usuario, filialAtivaCodigo: undefined });
    if (typeof window !== "undefined") {
      if (usuario.id) localStorage.setItem("username", usuario.id);
    }
  };

  const setFilialAtiva = (f: Filial) => {
    setFilialAtivaState(f);
    persist({ filialAtivaCodigo: f.codigo });
  };

  const logout = () => {
    setToken(null);
    setUsuario(null);
    setFilialAtivaState(null);
    setFiliais([]);
    persist(null);
    if (typeof window !== "undefined") localStorage.removeItem("username");
  };

  if (!hydrated) return null;

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        filialAtiva,
        selectedLoja: filialAtiva?.codigo ?? "",
        filiais,
        filiaisLoading,
        filiaisError,
        setSession,
        setFilialAtiva,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
