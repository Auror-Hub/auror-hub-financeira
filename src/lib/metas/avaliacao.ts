import { formatBRL } from "@/lib/format";
import type { AlertaHome } from "@/lib/home/consulta";

export const LIMIAR_ATENCAO = 0.8;

export type StatusProgressoMeta = "ok" | "atencao" | "estourada";

export interface ProgressoMeta {
  percentual: number;
  status: StatusProgressoMeta;
}

/** Puro — sem I/O. valorLimite e gastoAtual em centavos (ambos positivos). */
export function avaliarProgresso(valorLimite: number, gastoAtual: number): ProgressoMeta {
  const percentual = valorLimite > 0 ? gastoAtual / valorLimite : 0;
  const status: StatusProgressoMeta = percentual >= 1 ? "estourada" : percentual >= LIMIAR_ATENCAO ? "atencao" : "ok";
  return { percentual, status };
}

/** null quando status é "ok" — sem alerta pra meta dentro do previsto. */
export function gerarAlerta(
  categoriaRotulo: string,
  valorLimite: number,
  gastoAtual: number,
  progresso: ProgressoMeta,
): AlertaHome | null {
  if (progresso.status === "ok") return null;

  if (progresso.status === "estourada") {
    const excedente = gastoAtual - valorLimite;
    return {
      tom: "risco",
      texto: `Meta de ${categoriaRotulo} estourada — ${formatBRL(gastoAtual)} gastos, ${formatBRL(excedente)} acima do limite de ${formatBRL(valorLimite)}.`,
    };
  }

  const pct = Math.round(progresso.percentual * 100);
  return {
    tom: "atenção",
    texto: `Meta de ${categoriaRotulo}: já usou ${pct}% do limite (${formatBRL(gastoAtual)} de ${formatBRL(valorLimite)}).`,
  };
}
