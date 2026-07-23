import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Filial, Usuario } from "@/services/api";

// Importação da função que busca as lojas no Protheus
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

// Movido para FORA do componente para não dar erro de dependência no React (ESLint)
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
        const filiaisUsuario = await obterLojasProtheus({
          user: usuario.id || "",
          token: token || undefined,
        });

        if (!isMounted) return;

        setFiliais(filiaisUsuario);

        const escolhida = filiaisUsuario.find((l) => l.codigo === pendingFilialCodigo) ?? filiaisUsuario[0] ?? null;

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
  }, [usuario, token, pendingFilialCodigo]);

  const setSession = ({ token: newToken, usuario: newUsuario }: { token: string; usuario: Usuario }) => {
    setToken(newToken);
    setUsuario(newUsuario);
    setPendingFilialCodigo(undefined);
    persist({ token: newToken, usuario: newUsuario, filialAtivaCodigo: undefined });
    if (typeof window !== "undefined") {
      if (newUsuario.id) localStorage.setItem("username", newUsuario.id);
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
