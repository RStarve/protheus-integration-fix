import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { login } from "@/services/api";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { setSession, usuario } = useAuth();
  const [usuarioInput, setUsuarioInput] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (usuario) navigate({ to: "/app" });
  }, [usuario, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(usuarioInput, senha);
      setSession(data);
      toast.success(`Bem-vindo, ${data.usuario.nome}`);
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Painel lateral (marca) */}
      <aside className="hidden lg:flex flex-col justify-between bg-foreground text-background p-12 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-brand grid place-items-center font-bold text-brand-foreground">P</div>
          <span className="font-semibold tracking-tight text-lg">Protheus Relatórios</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Decisões corporativas com dados <span className="text-brand">em tempo real</span>.
          </h1>
          <p className="mt-4 text-sm text-background/70">
            Acompanhe compras, vendas e clientes de todas as filiais em um único painel integrado ao seu ERP.
          </p>
        </div>
        <p className="text-xs text-background/50">© {new Date().getFullYear()} Protheus Reports</p>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-brand/20 blur-3xl" />
      </aside>

      {/* Formulário */}
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-brand grid place-items-center font-bold text-brand-foreground">
              C
            </div>
            <span className="font-semibold tracking-tight text-lg">Protheus Relatórios</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">Acessar painel</h2>
            <p className="text-sm text-muted-foreground mt-1">Informe suas credenciais corporativas.</p>
          </div>

          <Card className="border-border shadow-[var(--shadow-card)]">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="usuario">Usuário</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="usuario"
                      value={usuarioInput}
                      onChange={(e) => setUsuarioInput(e.target.value)}
                      placeholder="seu.usuario"
                      className="pl-9 h-11"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="senha"
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 h-11"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-brand hover:bg-brand/90 text-brand-foreground font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Autenticando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center pt-2">
                  Ambiente de produção — só usuário/senha protheus é aceito.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
