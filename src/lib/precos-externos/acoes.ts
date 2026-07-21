"use server";

import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

const PADRAO_PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Fase 12 (Auditoria V2): DIEESE não tem API pública estável — a cesta
 * básica é sempre entrada manual, documentada como tal (nunca finge ser
 * automática). Dado global (não por família), mesmo padrão de escrita
 * compartilhada já usado em `taxonomia_termos` (qualquer autenticado pode
 * cadastrar — sem conceito de "admin de plataforma" no schema atual).
 * Upsert por capital+período: corrigir um valor digitado errado não exige
 * apagar antes.
 */
export async function cadastrarCestaBasica(formData: FormData): Promise<void> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const capital = (formData.get("capital") as string | null)?.trim();
  const periodoReferencia = (formData.get("periodoReferencia") as string | null)?.trim();
  const valorTexto = (formData.get("valorCesta") as string | null)?.trim();

  if (!capital) throw new Error("Informe a capital.");
  if (!periodoReferencia || !PADRAO_PERIODO.test(periodoReferencia)) throw new Error("Informe o período no formato AAAA-MM.");
  const valorCesta = valorTexto ? Math.round(Number(valorTexto) * 100) : NaN;
  if (!Number.isFinite(valorCesta) || valorCesta <= 0) throw new Error("Informe o valor da cesta básica, em reais.");

  const { error } = await supabase
    .from("cesta_basica_precos")
    .upsert({ capital, periodo_referencia: periodoReferencia, valor_cesta: valorCesta }, { onConflict: "capital,periodo_referencia" });
  if (error) throw new Error("Falha ao cadastrar cesta básica: " + error.message);

  revalidatePath("/configuracoes");
}
