import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Filial, Usuario } from "@/services/api";
import { obterLojasProtheus } from "@/lib/protheus-lojas.functions";

interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  filialAtiva: Filial | null;
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
  filialAtivaId?: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [filialAtiva, setFilialAtivaState] = useState<Filial | null>(null);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filiaisLoading, setFiliaisLoading] = useState(false);
  const [filiaisError, setFiliaisError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pendingFilialId, setPendingFilialId] = useState<string | undefined>();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p: Persisted = JSON.parse(raw);
        setToken(p.token);
        setUsuario(p.usuario);
        setPendingFilialId(p.filialAtivaId);
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
    obterLojasProtheus({ data: { user: usuario.id || usuario.nome } })
      .then((lojas) => {
        if (cancelled) return;
        setFiliais(lojas);
        // Regra: apenas 1 loja -> seleciona automaticamente
        const escolhida =
          lojas.find((l) => l.id === pendingFilialId) ??
          (lojas.length === 1 ? lojas[0] : lojas[0] ?? null);
        setFilialAtivaState(escolhida);
        if (escolhida) persist({ filialAtivaId: escolhida.id });
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
    setPendingFilialId(undefined);
    persist({ token, usuario, filialAtivaId: undefined });
  };

  const setFilialAtiva = (f: Filial) => {
    setFilialAtivaState(f);
    persist({ filialAtivaId: f.id });
  };

  const logout = () => {
    setToken(null);
    setUsuario(null);
    setFilialAtivaState(null);
    setFiliais([]);
    persist(null);
  };

  if (!hydrated) return null;

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        filialAtiva,
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
