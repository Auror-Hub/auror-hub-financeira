"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  AlertTriangle,
  Flame,
  Minus,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { PainelControle, CategoriaBreakdown } from "@/lib/dashboards/consulta";
import type { LinhaMatriz, SituacaoMatriz, TendenciaMatriz } from "@/lib/dashboards/matriz";
import type { SinalPriorizado } from "@/lib/dashboards/sinais";
import type { PlanoMensal } from "@/lib/plano/consulta";
import type { Projecao } from "@/lib/metas/projecao";
import { mesesAnteriores } from "@/lib/data/competencia";
import { formatBRL, formatCompetencia, formatDataHora, formatVariacaoPercentual } from "@/lib/format";
import { classificarFrescor, rotuloFrescor } from "@/lib/data/frescor";
import type { EstadoCompetencia } from "@/lib/domain/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";

export type PresetPeriodo = "fechado" | "atual" | "3m" | "6m" | "12m" | "mes" | "custom";

const CORES = ["#4a6cf7", "#d4860a", "#2da870", "#d94f3d", "#7a6ca8", "#7b96f9", "#b0752e", "#5aa17f"];

const PRESETS: { chave: PresetPeriodo; rotulo: string }[] = [
  { chave: "fechado", rotulo: "Último mês fechado" },
  { chave: "atual", rotulo: "Mês atual" },
  { chave: "3m", rotulo: "3 meses" },
  { chave: "6m", rotulo: "6 meses" },
  { chave: "12m", rotulo: "12 meses" },
];

type AbaExplorar = "painel" | "composicao" | "evolucao";

const ABAS: { chave: AbaExplorar; rotulo: string }[] = [
  { chave: "painel", rotulo: "Painel do mês" },
  { chave: "composicao", rotulo: "Composição" },
  { chave: "evolucao", rotulo: "Evolução" },
];

export interface DashboardScreenProps {
  painel: PainelControle;
  objetivos: { id: string; rotulo: string }[];
  filtrosAtuais: { preset: PresetPeriodo; dataInicio: string; dataFim: string; mes?: string; objetivoId?: string };
  /** Só presente quando o período resolve a exatamente uma competência (Fase 5, Auditoria V2). */
  competenciaUnica: { estado: EstadoCompetencia; ultimaAtualizacao: string | null } | null;
  /** Fase 9 (Auditoria V2): "Painel do mês" é sempre ancorado a um único mês. */
  mesFoco: string;
  painelMesFoco: PainelControle;
  plano: PlanoMensal;
  matriz: LinhaMatriz[];
  sinais: SinalPriorizado[];
  mesAnteriorTotal: number;
  projecao: Projecao | null;
  coberturaRevisao: number | null;
}

function pct(fracao: number): number {
  return Math.round(fracao * 100);
}

export function DashboardScreen({
  painel,
  objetivos,
  filtrosAtuais,
  competenciaUnica,
  mesFoco,
  painelMesFoco,
  plano,
  matriz,
  sinais,
  mesAnteriorTotal,
  projecao,
  coberturaRevisao,
}: DashboardScreenProps) {
  const router = useRouter();
  const [dataInicio, setDataInicio] = useState(filtrosAtuais.dataInicio);
  const [dataFim, setDataFim] = useState(filtrosAtuais.dataFim);
  const [mes, setMes] = useState(filtrosAtuais.mes ?? filtrosAtuais.dataInicio.slice(0, 7));
  const [aba, setAba] = useState<AbaExplorar>("painel");

  function navegar(patch: Partial<{ preset: PresetPeriodo; dataInicio: string; dataFim: string; mes: string; objetivoId: string }>) {
    const preset = patch.preset ?? filtrosAtuais.preset;
    const params = new URLSearchParams();
    params.set("preset", preset);
    if (preset === "custom") {
      params.set("dataInicio", patch.dataInicio ?? dataInicio);
      params.set("dataFim", patch.dataFim ?? dataFim);
    }
    if (preset === "mes") {
      params.set("mes", patch.mes ?? mes);
    }
    const objetivoId = "objetivoId" in patch ? patch.objetivoId : filtrosAtuais.objetivoId;
    if (objetivoId) params.set("objetivoId", objetivoId);
    router.push(`/dashboards?${params.toString()}`);
  }

  const objetivoAtivo = filtrosAtuais.objetivoId
    ? objetivos.find((o) => o.id === filtrosAtuais.objetivoId)?.rotulo
    : undefined;

  const vazio = painel.total === 0;

  const hoje = new Date();
  const frescor = competenciaUnica ? classificarFrescor(competenciaUnica.estado, competenciaUnica.ultimaAtualizacao, hoje) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <LayoutDashboard size={20} className="text-text-muted" strokeWidth={1.75} />
        <h1 className="text-xl font-semibold text-text-primary">Explorar</h1>
        <span className="text-sm text-text-muted">· Painel de Controle</span>
      </div>
      <p className="text-sm text-text-muted">
        Do macro ao micro: onde o dinheiro vai, o que fugiu do padrão e onde uma redução pesa mais. Dado vivo do período —
        cada número vem com uma leitura ao lado.
      </p>
      {frescor && (
        <p className={`text-sm ${frescor === "desatualizada" ? "text-state-warning" : "text-text-muted"}`}>
          {rotuloFrescor(frescor, competenciaUnica?.ultimaAtualizacao ?? null, hoje)}
          {competenciaUnica?.ultimaAtualizacao && ` · Atualizado em ${formatDataHora(competenciaUnica.ultimaAtualizacao)}`}
        </p>
      )}

      {/* Controles: período + lente de objetivo */}
      <Card className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-text-secondary">Período</span>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <Button
                key={p.chave}
                variant={filtrosAtuais.preset === p.chave ? "primary" : "secondary"}
                size="sm"
                onClick={() => navegar({ preset: p.chave })}
              >
                {p.rotulo}
              </Button>
            ))}
            <Button
              variant={filtrosAtuais.preset === "mes" ? "primary" : "secondary"}
              size="sm"
              onClick={() => navegar({ preset: "mes", mes })}
            >
              Mês específico
            </Button>
            <Button
              variant={filtrosAtuais.preset === "custom" ? "primary" : "secondary"}
              size="sm"
              onClick={() => navegar({ preset: "custom", dataInicio, dataFim })}
            >
              Personalizado
            </Button>
          </div>
        </div>

        {filtrosAtuais.preset === "mes" && (
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Mês
              <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="h-[34px]" />
            </label>
            <Button variant="secondary" size="sm" onClick={() => navegar({ preset: "mes", mes })}>
              Aplicar
            </Button>
          </div>
        )}

        {filtrosAtuais.preset === "custom" && (
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              De
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-[34px]" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Até
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-[34px]" />
            </label>
            <Button variant="secondary" size="sm" onClick={() => navegar({ preset: "custom", dataInicio, dataFim })}>
              Aplicar
            </Button>
            <Badge tone="indigo">por data de compra</Badge>
          </div>
        )}

        <label className="ml-auto flex flex-col gap-1 text-sm text-text-secondary">
          Lente por objetivo
          <select
            value={filtrosAtuais.objetivoId ?? ""}
            onChange={(e) => navegar({ objetivoId: e.target.value })}
            className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
          >
            <option value="">Todos</option>
            {objetivos.map((o) => (
              <option key={o.id} value={o.id}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <div className="flex gap-1 border-b border-border-subtle">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            type="button"
            onClick={() => setAba(a.chave)}
            className={`px-3 py-2 text-base font-medium ${
              aba === a.chave
                ? "border-b-2 border-action-primary text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === "painel" && (
        <PainelDoMesTab
          mesFoco={mesFoco}
          painelMesFoco={painelMesFoco}
          plano={plano}
          matriz={matriz}
          sinais={sinais}
          mesAnteriorTotal={mesAnteriorTotal}
          projecao={projecao}
          coberturaRevisao={coberturaRevisao}
        />
      )}

      {aba === "composicao" &&
        (vazio ? (
          <Card className="bg-surface-secondary">
            <p className="text-base text-text-secondary">
              Nenhum lançamento decidido em {painel.periodo.rotulo}
              {objetivoAtivo ? ` para o objetivo ${objetivoAtivo}` : ""}. Classifique lançamentos na Caixa de Entrada ou amplie o
              período.
            </p>
          </Card>
        ) : (
          <>
            <PulsoHeader painel={painel} objetivoAtivo={objetivoAtivo} />
            <DrilldownCategorias categorias={painel.categorias} />
            <ForaDoPadrao painel={painel} />
          </>
        ))}

      {aba === "evolucao" &&
        (vazio ? (
          <Card className="bg-surface-secondary">
            <p className="text-base text-text-secondary">
              Nenhum lançamento decidido em {painel.periodo.rotulo}
              {objetivoAtivo ? ` para o objetivo ${objetivoAtivo}` : ""}. Classifique lançamentos na Caixa de Entrada ou amplie o
              período.
            </p>
          </Card>
        ) : (
          <EvolucaoEObjetivo painel={painel} />
        ))}
    </div>
  );
}

/* ── Painel do mês (Fase 9, Auditoria V2) — control center, aba padrão ───── */

const NATUREZA_ROTULOS: Record<string, string> = {
  comprometido: "Comprometido",
  protegido: "Protegido",
  ajustavel: "Ajustável",
  reserva: "Reserva",
};

const SITUACAO_INFO: Record<SituacaoMatriz, { rotulo: string; tone: BadgeTone }> = {
  dentro: { rotulo: "Dentro do plano", tone: "green" },
  atencao: { rotulo: "Atenção", tone: "gold" },
  excedido: { rotulo: "Excedido", tone: "terra" },
  sem_plano: { rotulo: "Sem plano", tone: "slate" },
};

function tendenciaTexto(t: TendenciaMatriz): string {
  return t === "subindo" ? "↑ Subindo" : t === "caindo" ? "↓ Caindo" : t === "estavel" ? "→ Estável" : "—";
}

function PainelDoMesTab({
  mesFoco,
  painelMesFoco,
  plano,
  matriz,
  sinais,
  mesAnteriorTotal,
  projecao,
  coberturaRevisao,
}: {
  mesFoco: string;
  painelMesFoco: PainelControle;
  plano: PlanoMensal;
  matriz: LinhaMatriz[];
  sinais: SinalPriorizado[];
  mesAnteriorTotal: number;
  projecao: Projecao | null;
  coberturaRevisao: number | null;
}) {
  const mesAnterior = mesesAnteriores(mesFoco, 1)[0];
  const planejado = plano.linhas.length > 0 ? plano.total : null;
  const variacaoVsAnterior = mesAnteriorTotal > 0 ? (painelMesFoco.total - mesAnteriorTotal) / mesAnteriorTotal : null;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title={`Pulso de ${formatCompetencia(mesFoco)}`} />
        <KpiStrip>
          <KpiTile label="Realizado" value={formatBRL(painelMesFoco.total)} href={`/historico?competenciaMes=${mesFoco}`} />
          {planejado !== null && <KpiTile label="Planejado" value={formatBRL(planejado)} href="/meu-plano" />}
          {planejado !== null && (
            <KpiTile
              label="Restante do planejado"
              value={formatBRL(planejado - painelMesFoco.total)}
              tone={planejado - painelMesFoco.total < 0 ? "warning" : "success"}
            />
          )}
          <KpiTile
            label={`Vs. ${formatCompetencia(mesAnterior)}`}
            value={variacaoVsAnterior !== null ? formatVariacaoPercentual(variacaoVsAnterior) : "—"}
            tone={variacaoVsAnterior !== null ? (variacaoVsAnterior > 0 ? "warning" : "success") : undefined}
          />
          {projecao && (
            <KpiTile
              label="Projeção fim do mês"
              value={formatBRL(projecao.estimativa)}
              hint={`entre ${formatBRL(projecao.minimo)} e ${formatBRL(projecao.maximo)}`}
            />
          )}
          {coberturaRevisao !== null && (
            <KpiTile
              label="Cobertura de revisão"
              value={`${pct(coberturaRevisao)}%`}
              tone={coberturaRevisao < 1 ? "warning" : "success"}
              href="/caixa-de-entrada"
            />
          )}
        </KpiStrip>
      </Card>

      <Card>
        <CardHeader title="Matriz plano × realizado" count={matriz.length} />
        <MatrizControleTable matriz={matriz} mesFoco={mesFoco} />
      </Card>

      <SinaisParaDecidir sinais={sinais} mesFoco={mesFoco} />
    </div>
  );
}

function MatrizControleTable({ matriz, mesFoco }: { matriz: LinhaMatriz[]; mesFoco: string }) {
  if (matriz.length === 0) {
    return <p className="text-base text-text-muted">Sem categorias no plano nem gasto decidido neste mês.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-text-muted">
            <th className="py-1.5 pr-2">Categoria</th>
            <th className="py-1.5 pr-2 text-right">Planejado</th>
            <th className="py-1.5 pr-2 text-right">Realizado</th>
            <th className="py-1.5 pr-2 text-right">Desvio</th>
            <th className="py-1.5 pr-2">Tendência</th>
            <th className="py-1.5 pr-2">Natureza</th>
            <th className="py-1.5 pr-2">Situação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {matriz.map((l) => (
            <tr key={l.categoriaId}>
              <td className="py-2 pr-2">
                <Link href={`/historico?categoriaId=${l.categoriaId}&competenciaMes=${mesFoco}`} className="text-text-primary hover:underline">
                  {l.categoriaRotulo}
                </Link>
              </td>
              <td className="py-2 pr-2 text-right font-mono-nums text-text-secondary">
                {l.planejado !== null ? formatBRL(l.planejado) : "—"}
              </td>
              <td className="py-2 pr-2 text-right font-mono-nums text-text-primary">{formatBRL(l.realizado)}</td>
              <td className="py-2 pr-2 text-right font-mono-nums">
                {l.desvioReais !== null ? (
                  <span className={l.desvioReais > 0 ? "text-terra" : "text-green"}>
                    {l.desvioReais > 0 ? "+" : ""}
                    {formatBRL(l.desvioReais)}
                    {l.desvioPercentual !== null && ` (${l.desvioPercentual > 0 ? "+" : ""}${Math.round(l.desvioPercentual * 100)}%)`}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2 pr-2 text-text-secondary">{tendenciaTexto(l.tendencia)}</td>
              <td className="py-2 pr-2 text-text-secondary">{l.natureza ? NATUREZA_ROTULOS[l.natureza] : "—"}</td>
              <td className="py-2 pr-2">
                <Badge tone={SITUACAO_INFO[l.situacao].tone}>{SITUACAO_INFO[l.situacao].rotulo}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SinaisParaDecidir({ sinais, mesFoco }: { sinais: SinalPriorizado[]; mesFoco: string }) {
  return (
    <Card>
      <CardHeader title="Sinais para decidir" count={sinais.length} />
      {sinais.length === 0 ? (
        <p className="text-base text-text-muted">
          Nenhum sinal relevante este mês — nenhuma categoria ajustável saiu do plano de forma material.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sinais.map((s) => (
            <li key={s.categoriaId} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-subtle p-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-base text-text-primary">{s.categoriaRotulo}</span>
                <span className="text-sm text-text-secondary">{s.porque}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono-nums text-base text-terra">{formatBRL(s.impactoReais)}</span>
                <Link href={`/historico?categoriaId=${s.categoriaId}&competenciaMes=${mesFoco}`}>
                  <Button variant="secondary" size="sm">
                    Ver lançamentos
                  </Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ── Camada 0 — Pulso ─────────────────────────────────────────────────────── */

function PulsoHeader({ painel, objetivoAtivo }: { painel: PainelControle; objetivoAtivo?: string }) {
  const { comparacao } = painel;
  const subiu = comparacao ? comparacao.variacao > 0 : false;
  const variacaoPct = comparacao ? Math.abs(pct(comparacao.variacao)) : 0;

  const frase = comparacao
    ? `Você gastou ${formatBRL(painel.total)} em ${painel.totalLancamentos} ${painel.totalLancamentos === 1 ? "lançamento" : "lançamentos"}${objetivoAtivo ? ` em ${objetivoAtivo}` : ""}. Isso é ${variacaoPct}% ${subiu ? "a mais" : "a menos"} que o período anterior (${formatBRL(comparacao.totalAnterior)}).`
    : `Você gastou ${formatBRL(painel.total)} em ${painel.totalLancamentos} ${painel.totalLancamentos === 1 ? "lançamento" : "lançamentos"}${objetivoAtivo ? ` em ${objetivoAtivo}` : ""}. Ainda não há um período anterior comparável.`;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">Total no período · {painel.periodo.rotulo}</span>
          <div className="flex items-center gap-3">
            <span className="font-mono-nums text-3xl font-bold tracking-tight text-text-primary">{formatBRL(painel.total)}</span>
            {comparacao && (
              <Badge tone={subiu ? "terra" : "green"} icon={subiu ? <TrendingUp size={13} /> : <TrendingDown size={13} />}>
                {subiu ? "+" : "−"}
                {variacaoPct}%
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-6">
          <div className="flex flex-col">
            <span className="eyebrow">Ticket médio</span>
            <span className="font-mono-nums text-lg font-semibold text-text-primary">{formatBRL(painel.ticketMedio)}</span>
          </div>
          <div className="flex flex-col">
            <span className="eyebrow">Lançamentos</span>
            <span className="font-mono-nums text-lg font-semibold text-text-primary">{painel.totalLancamentos}</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-text-secondary">{frase}</p>

      {(painel.pressionadas.length > 0 || painel.extraordinarias.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {painel.pressionadas.length > 0 && (
            <a href="#fora-do-padrao">
              <Badge tone="gold" icon={<Flame size={13} />}>
                {painel.pressionadas.length} {painel.pressionadas.length === 1 ? "categoria pressionada" : "categorias pressionadas"}
              </Badge>
            </a>
          )}
          {painel.extraordinarias.length > 0 && (
            <a href="#fora-do-padrao">
              <Badge tone="terra" icon={<AlertTriangle size={13} />}>
                {painel.extraordinarias.length} {painel.extraordinarias.length === 1 ? "gasto fora do padrão" : "gastos fora do padrão"}
              </Badge>
            </a>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── Camada 1 — Onde vai o dinheiro (drill-down) ──────────────────────────── */

const MAX_FATIAS_PIZZA = 7;

function DrilldownCategorias({ categorias }: { categorias: CategoriaBreakdown[] }) {
  const [popup, setPopup] = useState<CategoriaBreakdown | null>(null);
  const topN = Math.min(3, categorias.length);
  const concentracao = pct(categorias.slice(0, topN).reduce((s, c) => s + c.percentualDoTotal, 0));
  const maxPercentual = categorias[0]?.percentualDoTotal ?? 1;

  // Pizza (share): top categorias + "Outros" agrupando o restante.
  const fatias = categorias.slice(0, MAX_FATIAS_PIZZA);
  const resto = categorias.slice(MAX_FATIAS_PIZZA);
  const totalResto = resto.reduce((s, c) => s + c.total, 0);
  const dadosPizza = [
    ...fatias.map((c) => ({ nome: c.rotulo, total: c.total, categoria: c as CategoriaBreakdown | null })),
    ...(totalResto > 0 ? [{ nome: "Outros", total: totalResto, categoria: null }] : []),
  ];

  return (
    <Card>
      <CardHeader title="Onde vai o dinheiro" />
      <p className="mb-3 text-sm text-text-secondary">
        Suas {topN} maiores {topN === 1 ? "categoria concentra" : "categorias concentram"} {concentracao}% do gasto — é onde uma
        redução pesa mais. Clique numa fatia (ou numa categoria) pra abrir subcategorias e fornecedores.
      </p>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="h-64 w-full lg:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dadosPizza}
                dataKey="total"
                nameKey="nome"
                cx="50%"
                cy="50%"
                outerRadius={90}
                onClick={(e: { payload?: { categoria?: CategoriaBreakdown | null } }) => {
                  const cat = e?.payload?.categoria;
                  if (cat) setPopup(cat);
                }}
              >
                {dadosPizza.map((fatia, i) => (
                  <Cell
                    key={fatia.nome}
                    fill={CORES[i % CORES.length]}
                    className={fatia.categoria ? "cursor-pointer" : ""}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatBRL(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex w-full flex-col gap-1.5 lg:w-1/2">
          {categorias.map((cat, i) => (
            <CategoriaBar
              key={cat.categoriaId}
              categoria={cat}
              cor={CORES[i % CORES.length]}
              maxPercentual={maxPercentual}
              onAbrir={() => setPopup(cat)}
            />
          ))}
        </ul>
      </div>

      {popup && <CategoriaPopup categoria={popup} onClose={() => setPopup(null)} />}
    </Card>
  );
}

function CategoriaPopup({ categoria, onClose }: { categoria: CategoriaBreakdown; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={categoria.rotulo} width={520}>
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-text-muted">Total no período</span>
          <span className="font-mono-nums text-lg font-semibold text-text-primary">
            {formatBRL(categoria.total)} · {pct(categoria.percentualDoTotal)}%
          </span>
        </div>

        <div>
          <span className="eyebrow">Subcategorias</span>
          {categoria.subcategorias.length > 0 ? (
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {categoria.subcategorias.map((sub) => (
                <li key={sub.rotulo} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-text-secondary">{sub.rotulo}</span>
                    <span className="shrink-0 font-mono-nums text-text-primary">
                      {formatBRL(sub.total)} · {pct(sub.percentualDaCategoria)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-pill bg-surface-secondary">
                    <div className="h-full rounded-pill bg-action-primary" style={{ width: `${pct(sub.percentualDaCategoria)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-text-muted">Nenhuma subcategoria classificada nesta categoria.</p>
          )}
        </div>

        <div>
          <span className="eyebrow">Maiores fornecedores</span>
          {categoria.topFornecedores.length > 0 ? (
            <ul className="mt-1.5 flex flex-col gap-1">
              {categoria.topFornecedores.map((f) => (
                <li key={f.fornecedor} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-text-secondary">{f.fornecedor}</span>
                  <span className="shrink-0 font-mono-nums text-text-primary">{formatBRL(f.total)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-text-muted">Sem fornecedores identificados.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function CategoriaBar({
  categoria,
  cor,
  maxPercentual,
  onAbrir,
}: {
  categoria: CategoriaBreakdown;
  cor: string;
  maxPercentual: number;
  onAbrir: () => void;
}) {
  const larguraRelativa = maxPercentual > 0 ? (categoria.percentualDoTotal / maxPercentual) * 100 : 0;
  const variacao = categoria.variacaoVsAnterior;

  return (
    <li className="rounded-card border border-border-subtle">
      <button
        type="button"
        onClick={onAbrir}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-secondary"
      >
        <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-text-muted" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-base text-text-primary">{categoria.rotulo}</span>
            <span className="shrink-0 font-mono-nums text-base text-text-primary">{formatBRL(categoria.total)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-secondary">
              <div className="h-full rounded-pill" style={{ width: `${larguraRelativa}%`, backgroundColor: cor }} />
            </div>
            <span className="w-10 shrink-0 text-right font-mono-nums text-sm text-text-muted">{pct(categoria.percentualDoTotal)}%</span>
            {variacao !== null && Math.abs(variacao) >= 0.01 && (
              <span
                className={`flex w-14 shrink-0 items-center justify-end gap-0.5 font-mono-nums text-sm ${variacao > 0 ? "text-terra" : "text-green"}`}
              >
                {variacao > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {Math.abs(pct(variacao))}%
              </span>
            )}
            {(variacao === null || Math.abs(variacao) < 0.01) && (
              <span className="flex w-14 shrink-0 items-center justify-end text-text-muted">
                <Minus size={11} />
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

/* ── Camada 2 — Fora do padrão ────────────────────────────────────────────── */

function ForaDoPadrao({ painel }: { painel: PainelControle }) {
  if (painel.pressionadas.length === 0 && painel.extraordinarias.length === 0) return null;

  return (
    <div id="fora-do-padrao" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {painel.pressionadas.length > 0 && (
        <Card>
          <CardHeader title="Categorias pressionadas" count={painel.pressionadas.length} />
          <p className="mb-3 text-sm text-text-secondary">Subiram acima de 10% e de R$100 vs o período anterior — o ponto de partida do &ldquo;por que gastei tanto&rdquo;.</p>
          <ul className="flex flex-col gap-2.5">
            {painel.pressionadas.map((p) => (
              <li key={p.rotulo} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-base text-text-primary">
                  <Flame size={15} className="shrink-0 text-gold" strokeWidth={1.75} />
                  {p.rotulo}
                </span>
                <span className="shrink-0 text-right text-sm text-text-secondary">
                  <span className="font-mono-nums text-terra">+{pct(p.variacao)}%</span>{" "}
                  <span className="font-mono-nums text-text-muted">(+{formatBRL(p.aumento)})</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {painel.extraordinarias.length > 0 && (
        <Card>
          <CardHeader title="Gastos fora do padrão" count={painel.extraordinarias.length} />
          <p className="mb-3 text-sm text-text-secondary">Lançamentos individuais bem acima da média da própria categoria no período.</p>
          <ul className="flex flex-col gap-2.5">
            {painel.extraordinarias.map((e, i) => (
              <li key={`${e.fornecedor}-${i}`} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-base text-text-primary">{e.fornecedor}</span>
                  <span className="text-sm text-text-muted">
                    {e.categoriaRotulo} · {e.vezesMedia.toFixed(1)}× a média
                  </span>
                </div>
                <span className="shrink-0 font-mono-nums text-base text-text-primary">{formatBRL(e.valor)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ── Camada 3 — Evolução e lente de objetivo ──────────────────────────────── */

function EvolucaoEObjetivo({ painel }: { painel: PainelControle }) {
  const dadosMes = painel.porMes.map((p) => ({ ...p, mesRotulo: formatCompetencia(p.mes) }));

  const fraseMensal =
    painel.porMes.length < 2
      ? "Só um mês no período — sem base pra falar de tendência ainda."
      : (() => {
          const primeiro = painel.porMes[0];
          const ultimo = painel.porMes[painel.porMes.length - 1];
          const variacao = primeiro.total !== 0 ? Math.round(((ultimo.total - primeiro.total) / primeiro.total) * 100) : 0;
          return `De ${formatCompetencia(primeiro.mes)} a ${formatCompetencia(ultimo.mes)}, o gasto mensal ${variacao >= 0 ? "subiu" : "caiu"} ${Math.abs(variacao)}%.`;
        })();

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Evolução mensal" />
        {painel.porMes.length > 0 ? (
          <>
            <div className="h-56" aria-label={`Gráfico de linha — total gasto por mês, de ${formatCompetencia(dadosMes[0].mes)} a ${formatCompetencia(dadosMes[dadosMes.length - 1].mes)}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosMes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mesRotulo" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatBRL(v)} width={80} />
                  <Tooltip formatter={(value) => formatBRL(Number(value))} />
                  <Line type="monotone" dataKey="total" stroke="#2da870" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Fase 7 (Auditoria V2): equivalente textual do gráfico — mesmo dado, sem depender de leitura visual da curva. */}
            <ul className="mt-3 flex flex-col divide-y divide-border-subtle text-sm text-text-secondary">
              {dadosMes.map((p) => (
                <li key={p.mes} className="flex items-center justify-between py-1">
                  <span>{p.mesRotulo}</span>
                  <span className="font-mono-nums text-text-primary">{formatBRL(p.total)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-base text-text-muted">Sem dados no período.</p>
        )}
        <p className="mt-2 text-sm text-text-secondary">{fraseMensal}</p>
      </Card>

      <Card>
        <CardHeader title="Por objetivo" />
        {painel.porObjetivo.length > 0 ? (
          <>
            <div className="h-56" aria-label="Gráfico de barras — total gasto por objetivo no período">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={painel.porObjetivo}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="objetivoRotulo" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatBRL(v)} width={80} />
                  <Tooltip formatter={(value) => formatBRL(Number(value))} />
                  <Bar dataKey="total" fill="#4a6cf7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Fase 7 (Auditoria V2): equivalente textual do gráfico. */}
            <ul className="mt-3 flex flex-col divide-y divide-border-subtle text-sm text-text-secondary">
              {painel.porObjetivo.map((o) => (
                <li key={o.objetivoId} className="flex items-center justify-between py-1">
                  <span>{o.objetivoRotulo}</span>
                  <span className="font-mono-nums text-text-primary">{formatBRL(o.total)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-base text-text-muted">Sem dados no período.</p>
        )}
        <p className="mt-2 text-sm text-text-secondary">
          {painel.porObjetivo.length > 0
            ? `${painel.porObjetivo[0].objetivoRotulo} concentrou o maior gasto (${formatBRL(painel.porObjetivo[0].total)}) entre os objetivos.`
            : "Nenhum objetivo atribuído no período."}
        </p>
      </Card>
    </div>
  );
}
