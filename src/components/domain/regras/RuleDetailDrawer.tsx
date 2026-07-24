"use client";

import type { RegraResumo, AmostraRegra } from "@/lib/regras/consulta";
import { formatBRL, formatData } from "@/lib/format";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";

export interface RuleDetailDrawerProps {
  regra: RegraResumo | null;
  amostra: AmostraRegra | null;
  carregandoAmostra: boolean;
  onClose: () => void;
  onAprovar: (id: string) => void;
  onRecusar: (id: string) => void;
  onDesativar: (id: string) => void;
  pendente: boolean;
}

/** Fase 19 (Auditoria V3.1): amostra e impacto de uma regra antes de aprovar/desativar — sem gravar nada até a ação ser confirmada. */
export function RuleDetailDrawer({
  regra,
  amostra,
  carregandoAmostra,
  onClose,
  onAprovar,
  onRecusar,
  onDesativar,
  pendente,
}: RuleDetailDrawerProps) {
  if (!regra) return null;

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Fornecedor contém "${regra.fornecedorTexto}"`}
      subtitle={regra.status === "proposta" ? "Regra proposta" : `Regra ${regra.status}`}
      footer={
        <div className="flex justify-end gap-2">
          {regra.status === "proposta" && (
            <>
              <Button variant="ghost" size="sm" disabled={pendente} onClick={() => onRecusar(regra.id)}>
                Recusar
              </Button>
              <Button variant="success" size="sm" disabled={pendente} onClick={() => onAprovar(regra.id)}>
                Aprovar
              </Button>
            </>
          )}
          {(regra.status === "ativa" || regra.status === "conflitante") && (
            <Button variant="ghost" size="sm" disabled={pendente} onClick={() => onDesativar(regra.id)}>
              Desativar
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">Consequência</span>
          <span className="text-base text-text-primary">
            Sugerir {regra.categoriaRotulo}
            {regra.subcategoriaRotulo ? ` › ${regra.subcategoriaRotulo}` : ""}
            {regra.objetivoRotulo ? ` · ${regra.objetivoRotulo}` : ""}
          </span>
          <span className="text-sm text-text-muted">{Math.round(regra.confianca * 100)}% de confiança</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="eyebrow">Origem</span>
          <span className="text-sm text-text-secondary">
            {regra.origem === "aprendida" ? "Aprendida pelo Agente de Aprendizagem" : "Criada manualmente"} · {regra.quantidadeExecucoes}{" "}
            execuç{regra.quantidadeExecucoes === 1 ? "ão" : "ões"}
            {regra.ultimaUtilizacao ? ` · última em ${formatData(regra.ultimaUtilizacao.slice(0, 10))}` : ""}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="eyebrow">Amostra e impacto</span>
          {carregandoAmostra && <p className="text-sm text-text-muted">Carregando...</p>}
          {!carregandoAmostra && amostra && amostra.totalCasados === 0 && (
            <p className="text-sm text-text-muted">Nenhum lançamento do acervo casa esta condição hoje.</p>
          )}
          {!carregandoAmostra && amostra && amostra.totalCasados > 0 && (
            <>
              <p className="text-sm text-text-secondary">
                {amostra.totalCasados} lançamento{amostra.totalCasados === 1 ? "" : "s"} do acervo casa{amostra.totalCasados === 1 ? "" : "m"}{" "}
                esta condição{amostra.itens.length < amostra.totalCasados ? ` — mostrando os ${amostra.itens.length} mais recentes` : ""}.
              </p>
              <ul className="flex flex-col gap-1.5">
                {amostra.itens.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 rounded-card bg-surface-secondary p-2 text-sm">
                    <div className="flex flex-col">
                      <span className="text-text-primary">{item.descricaoOriginal}</span>
                      <span className="text-text-muted">{formatData(item.data)}</span>
                    </div>
                    <span className="font-mono-nums text-text-secondary">{formatBRL(item.valorCentavos)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}
