"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarFamilia, solicitarIngresso } from "@/lib/familia/acoes";
import type { SolicitacaoDoUsuario } from "@/lib/familia/consulta";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SignOutButton } from "@/components/domain/auth/SignOutButton";

export interface OnboardingScreenProps {
  solicitacoes: SolicitacaoDoUsuario[];
}

type Modo = "escolher" | "criar" | "entrar-com-codigo";

export function OnboardingScreen({ solicitacoes }: OnboardingScreenProps) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [modo, setModo] = useState<Modo>("escolher");
  const [nomeFamilia, setNomeFamilia] = useState("");
  const [codigo, setCodigo] = useState("");

  const aguardandoAprovacao = solicitacoes.find((s) => s.status === "pendente");
  const recusadas = solicitacoes.filter((s) => s.status === "recusado");

  if (aguardandoAprovacao) {
    return (
      <div className="flex flex-col gap-3 rounded-card bg-surface-primary p-8 shadow-[var(--shadow-card)]">
        <span className="eyebrow">AURÓR · Hub Financeira</span>
        <h1 className="text-xl font-semibold text-text-primary">Aguardando aprovação</h1>
        <p className="text-base text-text-secondary">
          Sua solicitação pra entrar em <span className="font-medium text-text-primary">{aguardandoAprovacao.familiaNome}</span> foi
          enviada. Um admin da família precisa aprovar antes de você ter acesso.
        </p>
        <div>
          <SignOutButton />
        </div>
      </div>
    );
  }

  function aoCriarFamilia() {
    setErro(null);
    startTransition(async () => {
      try {
        await criarFamilia(nomeFamilia);
        router.push("/");
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao criar família.");
      }
    });
  }

  function aoSolicitarIngresso() {
    setErro(null);
    startTransition(async () => {
      try {
        await solicitarIngresso(codigo);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao solicitar ingresso.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-card bg-surface-primary p-8 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-1">
        <span className="eyebrow">AURÓR · Hub Financeira</span>
        <h1 className="text-xl font-semibold text-text-primary">Bem-vindo(a)</h1>
        <p className="text-sm text-text-secondary">Toda conta pertence a uma família — um acervo financeiro compartilhado.</p>
      </div>

      {recusadas.length > 0 && (
        <p className="rounded-card bg-state-warning-tint p-2.5 text-sm text-gold">
          Sua solicitação pra entrar em {recusadas[recusadas.length - 1].familiaNome} foi recusada. Você pode tentar outra família.
        </p>
      )}

      {modo === "escolher" && (
        <div className="flex flex-col gap-2">
          <Button variant="primary" onClick={() => setModo("criar")} className="justify-center">
            Criar família
          </Button>
          <Button variant="secondary" onClick={() => setModo("entrar-com-codigo")} className="justify-center">
            Entrar com código de convite
          </Button>
        </div>
      )}

      {modo === "criar" && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Nome da família
            <Input value={nomeFamilia} onChange={(e) => setNomeFamilia(e.target.value)} placeholder="Ex.: Família Gama" autoFocus />
          </label>
          {erro && <p className="rounded-card bg-state-danger-tint p-2.5 text-sm text-terra">{erro}</p>}
          <div className="flex gap-2">
            <Button variant="primary" disabled={pendente || !nomeFamilia.trim()} onClick={aoCriarFamilia} className="justify-center">
              {pendente ? "Criando..." : "Criar"}
            </Button>
            <Button variant="secondary" onClick={() => setModo("escolher")}>
              Voltar
            </Button>
          </div>
        </div>
      )}

      {modo === "entrar-com-codigo" && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Código de convite
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ex.: A1B2C3D4"
              autoFocus
            />
          </label>
          {erro && <p className="rounded-card bg-state-danger-tint p-2.5 text-sm text-terra">{erro}</p>}
          <div className="flex gap-2">
            <Button variant="primary" disabled={pendente || !codigo.trim()} onClick={aoSolicitarIngresso} className="justify-center">
              {pendente ? "Enviando..." : "Solicitar ingresso"}
            </Button>
            <Button variant="secondary" onClick={() => setModo("escolher")}>
              Voltar
            </Button>
          </div>
        </div>
      )}

      <div>
        <SignOutButton />
      </div>
    </div>
  );
}
