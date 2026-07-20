import type { EstadoCompetencia } from "@/lib/domain/types";

/**
 * Rearquitetura (Fase 5, Auditoria V2): a Home/Meu Plano/Explorar já mostram
 * a badge de `estado` e "Atualizado em X", mas nenhuma tela declara em texto
 * se o dado da competência aberta é recente ou está parado — a badge sozinha
 * não distingue "acabei de importar" de "não toco nisso há 2 semanas".
 */
export type Frescor = "fechada" | "parcial_atualizada" | "desatualizada";

const LIMIAR_DIAS_ATUALIZACAO_RECENTE = 3;

export function classificarFrescor(estado: EstadoCompetencia, ultimaAtualizacao: string | null, hoje: Date): Frescor {
  if (estado === "fechada" || estado === "reaberta") return "fechada";
  if (!ultimaAtualizacao) return "desatualizada";

  const diffDias = (hoje.getTime() - new Date(ultimaAtualizacao).getTime()) / 86400000;
  return diffDias <= LIMIAR_DIAS_ATUALIZACAO_RECENTE ? "parcial_atualizada" : "desatualizada";
}

/** Dias inteiros desde `ultimaAtualizacao` até `hoje` — para compor a mensagem de frescor na UI. */
export function diasDesde(ultimaAtualizacao: string, hoje: Date): number {
  return Math.max(0, Math.floor((hoje.getTime() - new Date(ultimaAtualizacao).getTime()) / 86400000));
}

/** Texto explícito de frescor, pronto pra exibir — nunca só a badge de estado. */
export function rotuloFrescor(frescor: Frescor, ultimaAtualizacao: string | null, hoje: Date): string {
  if (frescor === "fechada") return "Mês fechado";
  if (!ultimaAtualizacao) return "Mês aberto — sem lançamentos ainda";

  const dias = diasDesde(ultimaAtualizacao, hoje);
  const rotuloDias = dias === 0 ? "hoje" : dias === 1 ? "há 1 dia" : `há ${dias} dias`;

  return frescor === "parcial_atualizada" ? `Mês parcial — atualizado ${rotuloDias}` : `Mês parcial — desatualizado, última atualização ${rotuloDias}`;
}
