"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "recharts";
import type { PainelControle, CategoriaBreakdown } from "@/lib/dashboards/consulta";
import { formatBRL, formatCompetencia } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export type PresetPeriodo = "atual" | "3m" | "6m" | "12m" | "mes" | "custom";

const CORES = ["#4a6cf7", "#d4860a", "#2da870", "#d94f3d", "#7a6ca8", "#7b96f9", "#b0752e", "#5aa17f"];

const PRESETS: { chave: PresetPeriodo; rotulo: string }[] = [
  { chave: "atual", rotulo: "Mês atual" },
  { chave: "3m", rotulo: "3 meses" },
  { chave: "6m", rotulo: "6 meses" },
  { chave: "12m", rotulo: "12 meses" },
];

export interface DashboardScreenProps {
  painel: PainelControle;
  objetivos: { id: string; rotulo: string }[];
  filtrosAtuais: { preset: PresetPeriodo; dataInicio: string; dataFim: string; mes?: string; objetivoId?: string };
}

function pct(fracao: number): number {
  return Math.round(fracao * 100);
}

export function DashboardScreen({ painel, objetivos, filtrosAtuais }: DashboardScreenProps) {
  const router = useRouter();
  const [dataInicio, setDataInicio] = useState(filtrosAtuais.dataInicio);
  const [dataFim, setDataFim] = useState(filtrosAtuais.dataFim);
  const [mes, setMes] = useState(filtrosAtuais.mes ?? filtrosAtuais.dataInicio.slice(0, 7));

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <LayoutDashboard size={20} className="text-text-muted" strokeWidth={1.75} />
        <h1 className="text-xl font-semibold text-text-primary">Painel de Controle</h1>
      </div>
      <p className="text-sm text-text-muted">
        Do macro ao micro: onde o dinheiro vai, o que fugiu do padrão e onde uma redução pesa mais. Dado vivo do período —
        cada número vem com uma leitura ao lado.
      </p>

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

      {vazio ? (
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
          <EvolucaoEObjetivo painel={painel} />
        </>
      )}
    </div>
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

function DrilldownCategorias({ categorias }: { categorias: CategoriaBreakdown[] }) {
  const topN = Math.min(3, categorias.length);
  const concentracao = pct(categorias.slice(0, topN).reduce((s, c) => s + c.percentualDoTotal, 0));
  const maxPercentual = categorias[0]?.percentualDoTotal ?? 1;

  return (
    <Card>
      <CardHeader title="Onde vai o dinheiro" />
      <p className="mb-3 text-sm text-text-secondary">
        Suas {topN} maiores {topN === 1 ? "categoria concentra" : "categorias concentram"} {concentracao}% do gasto — é onde uma
        redução pesa mais. Clique numa categoria pra abrir subcategorias e fornecedores.
      </p>
      <ul className="flex flex-col gap-1.5">
        {categorias.map((cat, i) => (
          <CategoriaBar key={cat.categoriaId} categoria={cat} cor={CORES[i % CORES.length]} maxPercentual={maxPercentual} />
        ))}
      </ul>
    </Card>
  );
}

function CategoriaBar({ categoria, cor, maxPercentual }: { categoria: CategoriaBreakdown; cor: string; maxPercentual: number }) {
  const [aberta, setAberta] = useState(false);
  const larguraRelativa = maxPercentual > 0 ? (categoria.percentualDoTotal / maxPercentual) * 100 : 0;
  const variacao = categoria.variacaoVsAnterior;

  return (
    <li className="rounded-card border border-border-subtle">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-secondary"
      >
        <ChevronRight
          size={16}
          strokeWidth={2}
          className={`shrink-0 text-text-muted transition-transform ${aberta ? "rotate-90" : ""}`}
        />
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
                className={`flex w-14 shrink-0 items-center justify-end gap-0.5 font-mono-nums text-xs ${variacao > 0 ? "text-terra" : "text-green"}`}
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

      {aberta && (
        <div className="flex flex-col gap-4 border-t border-border-subtle px-3 py-3 sm:flex-row">
          <div className="flex-1">
            <span className="eyebrow">Subcategorias</span>
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
                    <div className="h-full rounded-pill" style={{ width: `${pct(sub.percentualDaCategoria)}%`, backgroundColor: cor }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1">
            <span className="eyebrow">Maiores fornecedores</span>
            <ul className="mt-1.5 flex flex-col gap-1">
              {categoria.topFornecedores.map((f) => (
                <li key={f.fornecedor} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-text-secondary">{f.fornecedor}</span>
                  <span className="shrink-0 font-mono-nums text-text-primary">{formatBRL(f.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
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
          <p className="mb-3 text-sm text-text-secondary">Subiram acima de 10% vs o período anterior — o ponto de partida do &ldquo;por que gastei tanto&rdquo;.</p>
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
          <div className="h-56">
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
        ) : (
          <p className="text-base text-text-muted">Sem dados no período.</p>
        )}
        <p className="mt-2 text-sm text-text-secondary">{fraseMensal}</p>
      </Card>

      <Card>
        <CardHeader title="Por objetivo" />
        {painel.porObjetivo.length > 0 ? (
          <div className="h-56">
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
