import Link from "next/link";
import { ArrowRight, FileText, TriangleAlert, Lightbulb } from "lucide-react";
import { getHomeResumo } from "@/lib/mocks/home";
import { formatBRL, formatCompetencia, formatVariacaoPercentual } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { Badge } from "@/components/ui/Badge";
import { InsightNarrative } from "@/components/domain/home/InsightNarrative";

export default function HomePage() {
  const resumo = getHomeResumo();

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho da competência + narrativa interpretativa principal */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="eyebrow">Competência atual</span>
          <Badge tone="gold">Em revisão</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          {formatCompetencia(resumo.competencia.mesReferencia)}
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-text-secondary">
          {resumo.narrativaPrincipal}
        </p>
      </section>

      {/* Números-chave */}
      <KpiStrip>
        <KpiTile label="Total analisado" value={formatBRL(resumo.totalAnalisado)} />
        <KpiTile label="Lançamentos" value={String(resumo.quantidadeLancamentos)} />
        <KpiTile
          label="Aguardando revisão"
          value={String(resumo.itensAguardandoRevisao)}
          tone={resumo.itensAguardandoRevisao > 0 ? "warning" : "success"}
        />
        <KpiTile
          label="Vs. média (3 meses)"
          value={formatVariacaoPercentual(resumo.variacaoVsMedia)}
          tone={resumo.variacaoVsMedia > 0 ? "warning" : "success"}
          hint="Variação do total gasto"
        />
      </KpiStrip>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna principal: mudanças + extraordinárias */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="flex flex-col gap-3">
            <span className="eyebrow">Principais mudanças</span>
            {resumo.principaisMudancas.map((insight) => (
              <InsightNarrative key={insight.id} insight={insight} />
            ))}
          </section>

          <Card>
            <CardHeader title="Despesas extraordinárias" count={resumo.despesasExtraordinarias.length} />
            <ul className="flex flex-col divide-y divide-border-subtle">
              {resumo.despesasExtraordinarias.map((d, i) => (
                <li key={i} className="flex items-center justify-between py-2.5">
                  <div className="flex flex-col">
                    <span className="text-base text-text-primary">{d.descricao}</span>
                    <span className="text-sm text-text-muted">{d.fornecedor}</span>
                  </div>
                  <span className="font-mono-nums text-base text-text-primary">{formatBRL(d.valor)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Coluna lateral: categorias pressionadas, alertas, recomendações, relatório */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Categorias pressionadas" />
            <ul className="flex flex-col gap-2">
              {resumo.categoriasPressionadas.map((c) => (
                <li key={c.rotulo} className="flex items-center justify-between">
                  <span className="text-base text-text-primary">{c.rotulo}</span>
                  <Badge tone={c.variacao > 0.5 ? "terra" : "gold"}>
                    {formatVariacaoPercentual(c.variacao)}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card accent="gold">
            <CardHeader title="Alertas" count={resumo.alertas.length} />
            <ul className="flex flex-col gap-2.5">
              {resumo.alertas.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <TriangleAlert size={15} className="mt-0.5 shrink-0 text-state-warning" strokeWidth={1.75} />
                  <span className="text-base text-text-secondary">{a.texto}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Recomendações" count={resumo.recomendacoes.length} />
            <ul className="flex flex-col gap-3">
              {resumo.recomendacoes.map((r) => (
                <li key={r.id} className="flex items-start gap-2">
                  <Lightbulb size={15} className="mt-0.5 shrink-0 text-state-neutral" strokeWidth={1.75} />
                  <div className="flex flex-col gap-1">
                    <span className="text-base text-text-secondary">{r.texto}</span>
                    <Badge tone="slate">{r.tipo}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {resumo.ultimoRelatorio?.disponivel && (
            <Link
              href="/relatorios"
              className="flex items-center justify-between rounded-card bg-surface-primary p-4 shadow-[var(--shadow-card)] transition-shadow duration-150 hover:shadow-[var(--shadow-card-hover)]"
            >
              <span className="flex items-center gap-2 text-base text-text-primary">
                <FileText size={16} className="text-action-primary" strokeWidth={1.75} />
                Último relatório · {resumo.ultimoRelatorio.competenciaLabel}
              </span>
              <ArrowRight size={16} className="text-text-muted" strokeWidth={1.75} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
