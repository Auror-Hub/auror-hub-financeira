"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Modo = "entrar" | "criar-conta";

export default function EntrarPage() {
  return (
    <Suspense fallback={null}>
      <EntrarForm />
    </Suspense>
  );
}

function EntrarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(
    searchParams.get("erro") === "confirmacao"
      ? "Não foi possível confirmar o e-mail (link expirado ou já usado). Tente entrar normalmente ou peça um novo cadastro."
      : null,
  );
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function aoSubmeter(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setMensagem(null);
    setCarregando(true);

    const supabase = createClient();

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      setCarregando(false);
      if (error) {
        setErro(traduzErro(error.message));
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setCarregando(false);
    if (error) {
      setErro(traduzErro(error.message));
      return;
    }
    setMensagem("Conta criada. Verifique seu e-mail para confirmar o acesso, depois entre normalmente.");
    setModo("entrar");
  }

  return (
    <div className="flex flex-col gap-6 rounded-card bg-surface-primary p-8 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-1">
        <span className="eyebrow">AURÓR · Hub Financeira</span>
        <h1 className="text-xl font-semibold text-text-primary">
          {modo === "entrar" ? "Entrar" : "Criar conta"}
        </h1>
      </div>

      <form onSubmit={aoSubmeter} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          E-mail
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Senha
          <Input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            minLength={6}
            required
          />
        </label>

        {erro && <p className="rounded-card bg-state-danger-tint p-2.5 text-sm text-terra">{erro}</p>}
        {mensagem && <p className="rounded-card bg-state-success-tint p-2.5 text-sm text-green">{mensagem}</p>}

        <Button type="submit" variant="primary" disabled={carregando} className="mt-1 justify-center">
          {carregando ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setModo(modo === "entrar" ? "criar-conta" : "entrar");
          setErro(null);
          setMensagem(null);
        }}
        className="text-sm text-text-muted hover:text-text-primary hover:underline"
      >
        {modo === "entrar" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}
      </button>
    </div>
  );
}

function traduzErro(mensagem: string): string {
  if (mensagem.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (mensagem.includes("User already registered")) return "Já existe uma conta com este e-mail.";
  if (mensagem.includes("Password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  return mensagem;
}
