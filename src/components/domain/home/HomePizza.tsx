"use client";

import { useRouter } from "next/navigation";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { formatBRL } from "@/lib/format";

const CORES = ["#4a6cf7", "#d4860a", "#2da870", "#d94f3d", "#7a6ca8", "#7b96f9", "#b0752e", "#5aa17f"];
const MAX_FATIAS = 6;

export interface HomePizzaProps {
  distribuicao: { rotulo: string; total: number }[];
}

/** Pizza simplificada do mês corrente na Home — atalho clicável para o Painel de Controle. */
export function HomePizza({ distribuicao }: HomePizzaProps) {
  const router = useRouter();
  if (distribuicao.length === 0) return null;

  const fatias = distribuicao.slice(0, MAX_FATIAS);
  const resto = distribuicao.slice(MAX_FATIAS).reduce((s, c) => s + c.total, 0);
  const dados = resto > 0 ? [...fatias, { rotulo: "Outros", total: resto }] : fatias;

  return (
    <button
      type="button"
      onClick={() => router.push("/dashboards?preset=atual")}
      className="h-64 w-full rounded-card p-1 text-left transition-colors hover:bg-surface-secondary"
      aria-label="Abrir Painel de Controle"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={dados} dataKey="total" nameKey="rotulo" cx="50%" cy="50%" outerRadius={78}>
            {dados.map((fatia, i) => (
              <Cell key={fatia.rotulo} fill={CORES[i % CORES.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatBRL(Number(value))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </button>
  );
}
