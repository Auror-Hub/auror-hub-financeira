"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import type { DadosDashboard } from "@/lib/dashboards/consulta";
import { formatBRL, formatCompetencia } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const CORES = ["#4a6cf7", "#d4860a", "#2da870", "#d94f3d", "#7a6ca8", "#7b96f9"];
const MAX_FATIAS_PIZZA = 6;

export interface DashboardScreenProps {
  dados: DadosDashboard;
  categorias: { id: string; rotulo: string }[];
  objetivos: { id: string; rotulo: string }[];
  filtrosAtuais: { dataInicio: string; dataFim: string; categoriaId?: string; objetivoId?: string };
}

function formatBRLCompacto(valor: number): string {
  return formatBRL(valor);
}

export function DashboardScreen({ dados, categorias, objetivos, filtrosAtuais }: DashboardScreenProps) {
  const router = useRouter();
  const [dataInicio, setDataInicio] = useState(filtrosAtuais.dataInicio);
  const [dataFim, setDataFim] = useState(filtrosAtuais.dataFim);
  const [categoriaId, setCategoriaId] = useState(filtrosAtuais.categoriaId ?? "");
  const [objetivoId, setObjetivoId] = useState(filtrosAtuais.objetivoId ?? "");

  function aplicarFiltros() {
    const params = new URLSearchParams();
    params.set("dataInicio", dataInicio);
    params.set("dataFim", dataFim);
    if (categoriaId) params.set("categoriaId", categoriaId);
    if (objetivoId) params.set("objetivoId", objetivoId);
    router.push(`/dashboards?${params.toString()}`);
  }

  const fatiasPizza = dados.porCategoria.slice(0, MAX_FATIAS_PIZZA);
  const restoPizza = dados.porCategoria.slice(MAX_FATIAS_PIZZA).reduce((soma, c) => soma + c.total, 0);
  const dadosPizza = restoPizza > 0 ? [...fatiasPizza, { categoriaId: "outros", categoriaRotulo: "Outros", total: restoPizza }] : fatiasPizza;

  const maiorCategoria = dados.porCategoria[0];
  const fraseCategoria =
    dados.porCategoria.length === 0
      ? "Nenhum lançamento decidido nesse período/filtro."
      : `${maiorCategoria.categoriaRotulo} foi a categoria com maior gasto no período, respondendo por ${Math.round((maiorCategoria.total / dados.totalPeriodo) * 100)}% do total (${formatBRL(maiorCategoria.total)}).`;

  const maiorObjetivo = dados.porObjetivo[0];
  const fraseObjetivo =
    dados.porObjetivo.length === 0
      ? "Nenhum lançamento decidido nesse período/filtro."
      : `${maiorObjetivo.objetivoRotulo} concentrou o maior gasto (${formatBRL(maiorObjetivo.total)}) entre os objetivos deste período.`;

  const fraseMensal =
    dados.porMes.length < 2
      ? "Apenas um mês no período selecionado — sem histórico suficiente pra falar de variação ainda."
      : (() => {
          const primeiro = dados.porMes[0];
          const ultimo = dados.porMes[dados.porMes.length - 1];
          const variacao = primeiro.total !== 0 ? Math.round(((ultimo.total - primeiro.total) / Math.abs(primeiro.total)) * 100) : 0;
          const direcao = variacao >= 0 ? "aumento" : "redução";
          return `De ${formatCompetencia(primeiro.mes)} a ${formatCompetencia(ultimo.mes)}, o gasto mensal teve ${direcao} de ${Math.abs(variacao)}% (${formatBRL(primeiro.total)} → ${formatBRL(ultimo.total)}).`;
        })();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <LayoutDashboard size={20} className="text-text-muted" strokeWidth={1.75} />
        <h1 className="text-xl font-semibold text-text-primary">Dashboards</h1>
      </div>
      <p className="text-sm text-text-muted">
        Visão exploratória sobre dados vivos (não é o consolidado congelado dos Relatórios) — cada gráfico vem com uma leitura ao lado,
        nunca só o número solto.
      </p>

      <Card className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          De
          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-[34px]" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Até
          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-[34px]" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Categoria
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Objetivo
          <select
            value={objetivoId}
            onChange={(e) => setObjetivoId(e.target.value)}
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
        <Button variant="primary" size="sm" onClick={aplicarFiltros}>
          Aplicar filtros
        </Button>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Distribuição por categoria" />
          {dadosPizza.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dadosPizza} dataKey="total" nameKey="categoriaRotulo" cx="50%" cy="50%" outerRadius={80}>
                    {dadosPizza.map((entry, i) => (
                      <Cell key={entry.categoriaId} fill={CORES[i % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatBRLCompacto(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-base text-text-muted">Sem dados para este filtro.</p>
          )}
          <p className="mt-2 text-sm text-text-secondary">{fraseCategoria}</p>
        </Card>

        <Card>
          <CardHeader title="Distribuição por objetivo" />
          {dados.porObjetivo.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados.porObjetivo}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="objetivoRotulo" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatBRLCompacto(v)} width={80} />
                  <Tooltip formatter={(value) => formatBRLCompacto(Number(value))} />
                  <Bar dataKey="total" fill="#4a6cf7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-base text-text-muted">Sem dados para este filtro.</p>
          )}
          <p className="mt-2 text-sm text-text-secondary">{fraseObjetivo}</p>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Evolução mensal do total" />
          {dados.porMes.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dados.porMes.map((p) => ({ ...p, mesRotulo: formatCompetencia(p.mes) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mesRotulo" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatBRLCompacto(v)} width={80} />
                  <Tooltip formatter={(value) => formatBRLCompacto(Number(value))} />
                  <Line type="monotone" dataKey="total" stroke="#2da870" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-base text-text-muted">Sem dados para este filtro.</p>
          )}
          <p className="mt-2 text-sm text-text-secondary">{fraseMensal}</p>
        </Card>
      </div>
    </div>
  );
}
