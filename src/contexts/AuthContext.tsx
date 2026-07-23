import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Filial, Usuario } from "@/services/api";
// import { obterLojasProtheus } from "@/lib/protheus-lojas.functions";

// Lista fixa (hardcoded) de filiais enquanto a API de autenticação não retorna as permissões.
const CODIGOS_FILIAIS_FIXOS = [
  "01", "02", "03", "04", "05", "06", "09", "10", "12", "13", "14", "15",
  "16", "19", "20", "21", "22", "24", "25", "26", "28", "29", "31", "32",
];
const FILIAIS_FIXAS: Filial[] = CODIGOS_FILIAIS_FIXOS.map((codigo) => ({
  id: codigo,
  codigo,
  nome: `Loja ${codigo}`,
  uf: "",
}));
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

  // Lista fixa de filiais: destrava o header enquanto a API de permissões não é integrada.
  useEffect(() => {
    if (!usuario) {
      setFiliais([]);
      setFilialAtivaState(null);
      setFiliaisError(null);
      setFiliaisLoading(false);
      return;
    }
    setFiliaisLoading(false);
    setFiliaisError(null);
    setFiliais(FILIAIS_FIXAS);
    const escolhida =
      FILIAIS_FIXAS.find((l) => l.codigo === pendingFilialCodigo) ??
      FILIAIS_FIXAS.find((l) => l.codigo === FILIAL_PADRAO_CODIGO) ??
      FILIAIS_FIXAS[0] ??
      null;
    setFilialAtivaState(escolhida);
    if (escolhida) persist({ filialAtivaCodigo: escolhida.codigo });
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
      // Sempre grava o LOGIN (id), nunca o nome de exibição.
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
