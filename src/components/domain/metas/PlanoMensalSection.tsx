"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Wallet } from "lucide-react";
import type { PlanoMensal } from "@/lib/plano/consulta";
import type { NaturezaPlano } from "@/lib/plano/validacao";
import { criarOuAtualizarPlano, informarRenda, copiarPlanoDoMesAnterior } from "@/lib/plano/acoes";
import { formatBRL, formatCompetencia } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorState } from "@/components/ui/ErrorState";

const NATUREZA_OPCOES: { valor: NaturezaPlano; rotulo: string }[] = [
  { valor: "comprometido", rotulo: "Comprometido (fixo)" },
  { valor: "protegido", rotulo: "Protegido (não cortar)" },
  { valor: "ajustavel", rotulo: "Ajustável (discricionário)" },
  { valor: "reserva", rotulo: "Reserva / poupança" },
];

interface LinhaEdicao {
  categoriaId: string;
  subcategoriaId: string;
  valorReais: string;
  natureza: NaturezaPlano;
}

function linhaVazia(): LinhaEdicao {
  return { categoriaId: "", subcategoriaId: "", valorReais: "", natureza: "ajustavel" };
}

export interface PlanoMensalSectionProps {
  mesReferencia: string;
  plano: PlanoMensal;
  categorias: { id: string; rotulo: string }[];
  subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]>;
  mesAnterior: string;
  planoAnteriorDisponivel: boolean;
}

/**
 * Fase 8 (Auditoria V2): "Plano do mês" — orçamento aditivo por construção
 * (nunca duas linhas pro mesmo par categoria+subcategoria). Fase 17
 * (Auditoria V3.1): subcategoria é uma alocação DENTRO da categoria — o
 * total da categoria soma todas as suas linhas, nunca conta em dobro.
 */
export function PlanoMensalSection({
  mesReferencia,
  plano,
  categorias,
  subcategoriasPorCategoria,
  mesAnterior,
  planoAnteriorDisponivel,
}: PlanoMensalSectionProps) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<LinhaEdicao[]>(
    plano.linhas.length > 0
      ? plano.linhas.map((l) => ({
          categoriaId: l.categoriaId ?? "",
          subcategoriaId: l.subcategoriaId ?? "",
          valorReais: (l.valorPlanejado / 100).toFixed(2),
          natureza: l.natureza,
        }))
      : [linhaVazia()],
  );
  const [renda, setRenda] = useState(plano.rendaInformada !== null ? (plano.rendaInformada / 100).toFixed(2) : "");

  function atualizarLinha(indice: number, patch: Partial<LinhaEdicao>) {
    setLinhas((prev) => prev.map((l, i) => (i === indice ? { ...l, ...patch } : l)));
  }

  function trocarCategoria(indice: number, categoriaId: string) {
    // Subcategoria pertence à categoria escolhida — trocar a categoria sem resetar deixaria uma combinação inválida.
    atualizarLinha(indice, { categoriaId, subcategoriaId: "" });
  }

  function adicionarLinha() {
    setLinhas((prev) => [...prev, linhaVazia()]);
  }

  function removerLinha(indice: number) {
    setLinhas((prev) => prev.filter((_, i) => i !== indice));
  }

  function salvarPlano() {
    setErro(null);
    const linhasValidas = linhas.filter((l) => l.valorReais.trim() !== "");
    const chavesVistas = new Set<string>();
    for (const l of linhasValidas) {
      if (!l.categoriaId && l.subcategoriaId) {
        setErro("Uma alocação por subcategoria precisa de uma categoria selecionada.");
        return;
      }
      const chave = `${l.categoriaId || "__geral__"}|${l.subcategoriaId || "__geral__"}`;
      if (chavesVistas.has(chave)) {
        setErro("Cada categoria (ou par categoria+subcategoria) só pode ter uma linha no plano — combine os valores numa linha só.");
        return;
      }
      chavesVistas.add(chave);
      if (Number(l.valorReais) <= 0) {
        setErro("O valor planejado de cada linha precisa ser maior que zero.");
        return;
      }
    }

    const payload = linhasValidas.map((l) => ({
      categoriaId: l.categoriaId || null,
      subcategoriaId: l.subcategoriaId || null,
      valorPlanejado: Math.round(Number(l.valorReais) * 100),
      natureza: l.natureza,
    }));

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("linhas", JSON.stringify(payload));
        await criarOuAtualizarPlano(mesReferencia, formData);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao salvar o plano.");
      }
    });
  }

  function salvarRenda() {
    setErro(null);
    startTransition(async () => {
      try {
        await informarRenda(mesReferencia, renda.trim() ? Number(renda) : null);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao salvar a renda.");
      }
    });
  }

  function copiarDoMesAnterior() {
    setErro(null);
    startTransition(async () => {
      try {
        await copiarPlanoDoMesAnterior(mesReferencia, mesAnterior);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao copiar o plano do mês anterior.");
      }
    });
  }

  // Resumo por categoria — só aparece quando uma categoria tem mais de uma
  // linha (categoria + subcategorias), pra deixar visível que a soma
  // reconcilia (nunca dobra) sem poluir o caso comum de 1 linha por categoria.
  const subtotalPorCategoria = new Map<string, { rotulo: string; total: number; contagem: number }>();
  for (const l of linhas) {
    if (!l.categoriaId || l.valorReais.trim() === "" || Number.isNaN(Number(l.valorReais))) continue;
    const rotulo = categorias.find((c) => c.id === l.categoriaId)?.rotulo ?? "—";
    const atual = subtotalPorCategoria.get(l.categoriaId) ?? { rotulo, total: 0, contagem: 0 };
    atual.total += Math.round(Number(l.valorReais) * 100);
    atual.contagem += 1;
    subtotalPorCategoria.set(l.categoriaId, atual);
  }
  const resumosComMultiplasLinhas = [...subtotalPorCategoria.values()].filter((r) => r.contagem > 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Wallet size={18} className="text-text-muted" strokeWidth={1.75} />
        <h2 className="text-lg font-semibold text-text-primary">Plano do mês</h2>
      </div>
      <p className="text-sm text-text-muted">
        Orçamento por categoria — cada par categoria+subcategoria entra uma vez só, então o total planejado nunca conta o mesmo gasto duas
        vezes (diferente das metas abaixo, que podem se sobrepor por design). Uma subcategoria é uma alocação dentro da categoria — o total
        da categoria soma todas as suas linhas.
      </p>

      {plano.id === null && planoAnteriorDisponivel && (
        <Card accent="indigo" className="flex items-center justify-between gap-3 p-3.5">
          <span className="text-base text-text-secondary">
            Você ainda não fez o plano de {formatCompetencia(mesReferencia)}. Copiar do mês anterior ({formatCompetencia(mesAnterior)})?
          </span>
          <Button variant="secondary" size="sm" disabled={pendente} onClick={copiarDoMesAnterior}>
            Copiar plano anterior
          </Button>
        </Card>
      )}

      {erro && <ErrorState texto={erro} />}

      <Card>
        <CardHeader title="Categorias planejadas" />
        <div className="flex flex-col gap-2">
          {linhas.map((linha, indice) => (
            <div key={indice} className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Categoria
                <select
                  value={linha.categoriaId}
                  onChange={(e) => trocarCategoria(indice, e.target.value)}
                  className="h-[34px] w-48 rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
                >
                  <option value="">Reserva não distribuída</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.rotulo}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Subcategoria (opcional)
                <select
                  value={linha.subcategoriaId}
                  onChange={(e) => atualizarLinha(indice, { subcategoriaId: e.target.value })}
                  disabled={!linha.categoriaId}
                  className="h-[34px] w-44 rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary disabled:opacity-50"
                >
                  <option value="">Categoria toda</option>
                  {(subcategoriasPorCategoria[linha.categoriaId] ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.rotulo}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Valor (R$)
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={linha.valorReais}
                  onChange={(e) => atualizarLinha(indice, { valorReais: e.target.value })}
                  className="h-[34px] w-28"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Natureza
                <select
                  value={linha.natureza}
                  onChange={(e) => atualizarLinha(indice, { natureza: e.target.value as NaturezaPlano })}
                  className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
                >
                  {NATUREZA_OPCOES.map((n) => (
                    <option key={n.valor} value={n.valor}>
                      {n.rotulo}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="ghost"
                size="sm"
                disabled={linhas.length === 1}
                onClick={() => removerLinha(indice)}
                icon={<Trash2 size={14} strokeWidth={1.75} />}
                aria-label="Remover linha"
              />
            </div>
          ))}
        </div>

        {resumosComMultiplasLinhas.length > 0 && (
          <div className="mt-3 flex flex-col gap-1 rounded-card bg-surface-secondary p-2.5 text-sm text-text-secondary">
            <span className="eyebrow">Total por categoria (soma das alocações)</span>
            {resumosComMultiplasLinhas.map((r) => (
              <span key={r.rotulo}>
                {r.rotulo}: <span className="font-mono-nums text-text-primary">{formatBRL(r.total)}</span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" icon={<Plus size={14} strokeWidth={1.75} />} onClick={adicionarLinha}>
            Adicionar categoria
          </Button>
          <Button variant="primary" size="sm" disabled={pendente} onClick={salvarPlano}>
            {pendente ? "Salvando..." : "Salvar plano"}
          </Button>
        </div>
      </Card>

      <Card className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Renda do mês (opcional)
          <Input type="number" min="0" step="0.01" value={renda} onChange={(e) => setRenda(e.target.value)} className="h-[34px] w-40" />
        </label>
        <Button variant="secondary" size="sm" disabled={pendente} onClick={salvarRenda}>
          Salvar renda
        </Button>
        {plano.rendaOrigem === "perfil" && (
          <span className="text-sm text-text-muted">Usando a renda líquida cadastrada no Perfil Financeiro (Configurações).</span>
        )}
        {plano.naoAlocado !== null && (
          <span className="text-sm text-text-muted">
            Não alocado: <span className="font-mono-nums text-text-primary">{formatBRL(plano.naoAlocado)}</span>
          </span>
        )}
      </Card>
    </div>
  );
}
