"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";
import { atualizarPerfilFinanceiro } from "@/lib/familia/acoes";
import type { PerfilFinanceiroFamilia, SituacaoMoradia } from "@/lib/familia/consulta";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorState } from "@/components/ui/ErrorState";

const SITUACAO_OPCOES: { valor: SituacaoMoradia; rotulo: string }[] = [
  { valor: "propria", rotulo: "Própria" },
  { valor: "alugada", rotulo: "Alugada" },
  { valor: "financiada", rotulo: "Financiada" },
  { valor: "outra", rotulo: "Outra" },
];

export interface PerfilFinanceiroSectionProps {
  perfilFinanceiro: PerfilFinanceiroFamilia;
  souAdmin: boolean;
}

/**
 * Fase 12 (Auditoria V2): perfil financeiro opcional da família — nunca
 * bloqueia nada da Hub sem esses dados. `consentimentoComparacaoExterna` é
 * o único campo que efetivamente liga algo (o módulo de benchmark no
 * relatório) — por isso fica isolado visualmente com uma explicação
 * própria, nunca escondido dentro dos outros campos.
 */
export function PerfilFinanceiroSection({ perfilFinanceiro, souAdmin }: PerfilFinanceiroSectionProps) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [rendaBruta, setRendaBruta] = useState(perfilFinanceiro.rendaBrutaMensal !== null ? (perfilFinanceiro.rendaBrutaMensal / 100).toFixed(2) : "");
  const [rendaLiquida, setRendaLiquida] = useState(
    perfilFinanceiro.rendaLiquidaMensal !== null ? (perfilFinanceiro.rendaLiquidaMensal / 100).toFixed(2) : "",
  );
  const [cidade, setCidade] = useState(perfilFinanceiro.cidade ?? "");
  const [estado, setEstado] = useState(perfilFinanceiro.estado ?? "");
  const [numeroPessoas, setNumeroPessoas] = useState(perfilFinanceiro.numeroPessoas?.toString() ?? "");
  const [situacaoMoradia, setSituacaoMoradia] = useState<SituacaoMoradia | "">(perfilFinanceiro.situacaoMoradia ?? "");
  const [consentimento, setConsentimento] = useState(perfilFinanceiro.consentimentoComparacaoExterna);

  function salvar() {
    setErro(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        if (rendaBruta.trim()) formData.set("rendaBrutaMensal", rendaBruta);
        if (rendaLiquida.trim()) formData.set("rendaLiquidaMensal", rendaLiquida);
        if (cidade.trim()) formData.set("cidade", cidade);
        if (estado.trim()) formData.set("estado", estado);
        if (numeroPessoas.trim()) formData.set("numeroPessoas", numeroPessoas);
        if (situacaoMoradia) formData.set("situacaoMoradia", situacaoMoradia);
        if (consentimento) formData.set("consentimentoComparacaoExterna", "on");
        await atualizarPerfilFinanceiro(formData);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao salvar o perfil financeiro.");
      }
    });
  }

  return (
    <Card>
      <CardHeader title="Perfil financeiro" />
      <p className="mb-3 text-sm text-text-muted">
        Opcional — nada na Hub depende destes dados. Renda e moradia alimentam o relatório executivo (seção &ldquo;Renda e saúde
        financeira&rdquo;, quando informada); nenhum outro módulo usa isso.
      </p>

      {!souAdmin && <p className="mb-3 text-sm text-text-muted">Só um admin da família pode editar este perfil.</p>}

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Renda bruta mensal (R$)
          <Input
            type="number"
            min="0"
            step="0.01"
            value={rendaBruta}
            disabled={!souAdmin}
            onChange={(e) => setRendaBruta(e.target.value)}
            className="h-[34px] w-40"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Renda líquida mensal (R$)
          <Input
            type="number"
            min="0"
            step="0.01"
            value={rendaLiquida}
            disabled={!souAdmin}
            onChange={(e) => setRendaLiquida(e.target.value)}
            className="h-[34px] w-40"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Número de pessoas
          <Input
            type="number"
            min="1"
            step="1"
            value={numeroPessoas}
            disabled={!souAdmin}
            onChange={(e) => setNumeroPessoas(e.target.value)}
            className="h-[34px] w-28"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Cidade
          <Input type="text" value={cidade} disabled={!souAdmin} onChange={(e) => setCidade(e.target.value)} className="h-[34px] w-48" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Estado (UF)
          <Input
            type="text"
            maxLength={2}
            value={estado}
            disabled={!souAdmin}
            onChange={(e) => setEstado(e.target.value.toUpperCase())}
            className="h-[34px] w-16 uppercase"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Situação da moradia
          <select
            value={situacaoMoradia}
            disabled={!souAdmin}
            onChange={(e) => setSituacaoMoradia(e.target.value as SituacaoMoradia | "")}
            className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary disabled:opacity-60"
          >
            <option value="">Não informado</option>
            {SITUACAO_OPCOES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-card border border-dashed border-border-subtle p-3">
        <label className="flex items-start gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={consentimento}
            disabled={!souAdmin}
            onChange={(e) => setConsentimento(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium text-text-primary">Autorizo comparar meus gastos com referências externas</span> (IPCA/IBGE,
            cesta básica DIEESE) no relatório executivo — sempre como faixa/referência, nunca como &ldquo;certo&rdquo; ou
            &ldquo;errado&rdquo;, e só pra categorias com mapeamento cadastrado.
          </span>
        </label>
      </div>

      {erro && <ErrorState texto={erro} />}

      {souAdmin && (
        <div className="mt-3 flex justify-end">
          <Button variant="primary" size="sm" disabled={pendente} onClick={salvar} icon={<Landmark size={14} strokeWidth={1.75} />}>
            {pendente ? "Salvando..." : "Salvar perfil financeiro"}
          </Button>
        </div>
      )}
    </Card>
  );
}
