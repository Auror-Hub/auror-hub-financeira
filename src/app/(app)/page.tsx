import Link from "next/link";
import { ArrowRight, FileText, TriangleAlert, Upload } from "lucide-react";
import { carregarResumoHome } from "@/lib/home/consulta";
import { formatBRL, formatCompetencia, formatDataHora, formatVariacaoPercentual } from "@/lib/format";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { CompetencyStatusBadge } from "@/components/domain/competencies/CompetencyStatusBadge";
import { InsightNarrative } from "@/components/domain/home/InsightNarrative";
import { HomePizza } from "@/components/domain/home/HomePizza";
import { RecomendacaoDestaque } from "@/components/domain/home/RecomendacaoDestaque";

const ATALHOS = NAV_ITEMS.filter((item) => item.implemented && item.href !== "/");

export default async function HomePage() {
  const resumo = await carregarResumoHome();

  if (!resumo) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-text-primary">Nenhum lançamento importado ainda</h1>
        <p className="max-w-md text-base text-text-secondary">
          Envie a primeira fatura ou conta pra começar a popular o acervo — a Home passa a mostrar a competência atual assim que houver dado.
        </p>
        <Link
          href="/enviar"
          className="flex items-center gap-2 rounded-btn bg-action-primary px-3.5 py-2 text-base font-medium text-action-on-primary hover:bg-action-primary-hover"
        >
          <Upload size={16} strokeWidth={1.75} />
          Enviar documento
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho da competência + narrativa interpretativa principal */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="eyebrow">Competência atual</span>
          <CompetencyStatusBadge estado={resumo.competencia.estado} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          {formatCompetencia(resumo.competencia.mesReferencia)}
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-text-secondary">{resumo.narrativaPrincipal}</p>
        {resumo.ultimaAtualizacao && (
          <p className="text-sm text-text-muted">Atualizado em {formatDataHora(resumo.ultimaAtualizacao)}</p>
        )}
      </section>

      {/* Números-chave — cada um abre os lançamentos que o compõem (ADR-007/Fase 0) */}
      <KpiStrip>
        <KpiTile
          label="Total analisado"
          value={formatBRL(resumo.totalAnalisado)}
          href={`/historico?competenciaMes=${resumo.competencia.mesReferencia}`}
        />
        <KpiTile
          label="Lançamentos"
          value={String(resumo.quantidadeLancamentos)}
          href={`/historico?competenciaMes=${resumo.competencia.mesReferencia}`}
        />
        <KpiTile
          label="Aguardando revisão"
          value={String(resumo.itensAguardandoRevisao)}
          tone={resumo.itensAguardandoRevisao > 0 ? "warning" : "success"}
          href="/caixa-de-entrada"
        />
        {resumo.variacaoVsMedia !== null && (
          <KpiTile
            label="Vs. média (competências anteriores)"
            value={formatVariacaoPercentual(resumo.variacaoVsMedia)}
            tone={resumo.variacaoVsMedia > 0 ? "warning" : "success"}
            hint="Variação do total gasto"
            href="/dashboards?preset=atual"
          />
        )}
        {resumo.planejado !== null && (
          <KpiTile label="Planejado" value={formatBRL(resumo.planejado)} href="/metas" />
        )}
        {resumo.restante !== null && (
          <KpiTile
            label="Restante do planejado"
            value={formatBRL(resumo.restante)}
            tone={resumo.restante < 0 ? "warning" : "success"}
            href="/metas"
          />
        )}
        {resumo.diasRestantes !== null && (
          <KpiTile label="Dias restantes no mês" value={String(resumo.diasRestantes)} />
        )}
        {resumo.totalPendencias > 0 && (
          <KpiTile label="Pendências" value={String(resumo.totalPendencias)} tone="warning" href="/caixa-de-entrada" />
        )}
      </KpiStrip>

      {resumo.recomendacaoDestaque && <RecomendacaoDestaque recomendacao={resumo.recomendacaoDestaque} />}

      {/* Atalhos rápidos para os módulos */}
      <section className="flex flex-col gap-2">
        <span className="eyebrow">Atalhos</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {ATALHOS.map((item) => {
            const Icone = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-card bg-surface-primary p-3 text-sm text-text-primary shadow-[var(--shadow-card)] transition-shadow duration-150 hover:shadow-[var(--shadow-card-hover)]"
              >
                <Icone size={16} className="shrink-0 text-action-primary" strokeWidth={1.75} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna principal: distribuição + mudanças + extraordinárias */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {resumo.distribuicaoCategorias.length > 0 && (
            <Card>
              <CardHeader title="Distribuição do mês" />
              <HomePizza distribuicao={resumo.distribuicaoCategorias} />
              <p className="mt-1 text-sm text-text-muted">Clique para abrir o Painel de Controle e ir do macro ao micro.</p>
            </Card>
          )}

          {resumo.principaisMudancas.length > 0 && (
            <section className="flex flex-col gap-3">
              <span className="eyebrow">
                Principais mudanças
                {resumo.mesReferenciaAnalise && ` · última análise: ${formatCompetencia(resumo.mesReferenciaAnalise)}`}
              </span>
              {resumo.principaisMudancas.map((insight) => (
                <InsightNarrative key={insight.id} insight={insight} />
              ))}
            </section>
          )}

          {resumo.despesasExtraordinarias.length > 0 && (
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
          )}
        </div>

        {/* Coluna lateral: categorias pressionadas, alertas, recomendações, relatório */}
        <div className="flex flex-col gap-6">
          {resumo.categoriasPressionadas.length > 0 && (
            <Card>
              <CardHeader title="Categorias pressionadas" />
              <ul className="flex flex-col gap-2">
                {resumo.categoriasPressionadas.map((c) => (
                  <li key={c.rotulo} className="flex items-center justify-between">
                    <span className="text-base text-text-primary">{c.rotulo}</span>
                    <span className="text-sm font-medium text-state-warning">{formatVariacaoPercentual(c.variacao)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {resumo.alertas.length > 0 && (
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
          )}

          {resumo.ultimoRelatorio && (
            <Link
              href={`/relatorios/${resumo.ultimoRelatorio.versaoId}`}
              className="flex items-center justify-between rounded-card bg-surface-primary p-4 shadow-[var(--shadow-card)] transition-shadow duration-150 hover:shadow-[var(--shadow-card-hover)]"
            >
              <span className="flex items-center gap-2 text-base text-text-primary">
                <FileText size={16} className="text-action-primary" strokeWidth={1.75} />
                Último relatório · {formatCompetencia(resumo.ultimoRelatorio.competenciaLabel)}
              </span>
              <ArrowRight size={16} className="text-text-muted" strokeWidth={1.75} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
