import type { AnoMes, Centavos, DataISO } from "@/lib/domain/types";

/** Formata centavos inteiros como moeda BRL. 123456 => "R$ 1.234,56". */
export function formatBRL(centavos: Centavos): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** "2026-06" => "Junho de 2026". */
export function formatCompetencia(mesReferencia: AnoMes): string {
  const [ano, mes] = mesReferencia.split("-");
  const idx = Number(mes) - 1;
  const nomeMes = MESES[idx] ?? mes;
  return `${nomeMes} de ${ano}`;
}

/** "2026-06-14" => "14/06/2026". */
export function formatData(data: DataISO): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Timestamp ISO => "14/06/2026 às 09:30" (fuso do navegador/servidor). */
export function formatDataHora(dataHoraIso: string): string {
  const d = new Date(dataHoraIso);
  const data = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const hora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${data} às ${hora}`;
}

/**
 * Formata variação percentual com sinal explícito. 0.18 => "+18%".
 * Usa uma casa decimal só quando o valor não é inteiro.
 */
export function formatVariacaoPercentual(fracao: number): string {
  const pct = fracao * 100;
  const sinal = pct > 0 ? "+" : "";
  const casas = Number.isInteger(pct) ? 0 : 1;
  return `${sinal}${pct.toFixed(casas)}%`;
}
