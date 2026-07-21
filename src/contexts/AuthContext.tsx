import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Filial, Usuario } from "@/services/api";
import { obterLojasProtheus } from "@/lib/protheus-lojas.functions";

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

  // Busca dinâmica das lojas quando há usuário logado
  useEffect(() => {
    if (!usuario) {
      setFiliais([]);
      setFilialAtivaState(null);
      return;
    }
    let cancelled = false;
    setFiliaisLoading(true);
    setFiliaisError(null);
    const username =
      usuario.id ||
      usuario.nome ||
      (typeof window !== "undefined" ? localStorage.getItem("username") ?? "" : "");
    if (!username) {
      setFiliaisError("Usuário não identificado. Faça login novamente.");
      setFiliaisLoading(false);
      return;
    }
    obterLojasProtheus({ data: { user: username, token: token ?? undefined } })
      .then((lojas) => {
        if (cancelled) return;
        setFiliais(lojas);
        // Auto-seleciona: mantém a persistida (por código) OU a primeira loja do array
        const escolhida =
          lojas.find((l) => l.codigo === pendingFilialCodigo) ?? lojas[0] ?? null;
        setFilialAtivaState(escolhida);
        if (escolhida) persist({ filialAtivaCodigo: escolhida.codigo });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFiliaisError(err instanceof Error ? err.message : "Erro ao carregar lojas.");
        setFiliais([]);
        setFilialAtivaState(null);
      })
      .finally(() => {
        if (!cancelled) setFiliaisLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

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
      const uname = usuario.id || usuario.nome;
      if (uname) localStorage.setItem("username", uname);
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
