"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Plus, Workflow } from "lucide-react";
import type { RegraResumo, AmostraRegra } from "@/lib/regras/consulta";
import { criarRegraManual, aprovarRegra, recusarRegra, desativarRegra, buscarAmostraDaRegra } from "@/lib/regras/acoes";
import { formatData } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { RuleDetailDrawer } from "./RuleDetailDrawer";

const STATUS_TONE: Record<RegraResumo["status"], BadgeTone> = {
  ativa: "green",
  proposta: "gold",
  conflitante: "terra",
  inativa: "slate",
};

export interface RuleListScreenProps {
  regras: RegraResumo[];
  categorias: { id: string; rotulo: string }[];
  subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]>;
  objetivos: { id: string; rotulo: string }[];
}

/** SCR-RULES-001 — lista de regras (condição→consequência), com aprovação de propostas e alerta de conflito (RUL-13). */
export function RuleListScreen({ regras, categorias, subcategoriasPorCategoria, objetivos }: RuleListScreenProps) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [categoriaFormulario, setCategoriaFormulario] = useState("");
  const [regraDetalheId, setRegraDetalheId] = useState<string | null>(null);
  const [amostra, setAmostra] = useState<AmostraRegra | null>(null);
  const [carregandoAmostra, setCarregandoAmostra] = useState(false);

  function abrirDetalhe(id: string) {
    setRegraDetalheId(id);
    setAmostra(null);
    setCarregandoAmostra(true);
    startTransition(async () => {
      const resultado = await buscarAmostraDaRegra(id);
      setAmostra(resultado);
      setCarregandoAmostra(false);
    });
  }

  function executarAcao(acao: () => Promise<void>) {
    setErro(null);
    startTransition(async () => {
      try {
        await acao();
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao executar ação.");
      }
    });
  }

  function criar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      try {
        await criarRegraManual(formData);
        setModalAberto(false);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao criar regra.");
      }
    });
  }

  const conflitantes = regras.filter((r) => r.status === "conflitante");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Workflow size={20} className="text-text-muted" strokeWidth={1.75} />
          <h1 className="text-xl font-semibold text-text-primary">Motor de Regras</h1>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} strokeWidth={1.75} />} onClick={() => setModalAberto(true)}>
          Nova regra
        </Button>
      </div>

      {erro && <p className="text-sm text-terra">{erro}</p>}

      {conflitantes.length > 0 && (
        <div className="flex items-start gap-2 rounded-card bg-state-danger-tint p-3 text-sm text-terra">
          <CircleAlert size={16} className="mt-0.5 shrink-0" strokeWidth={1.75} />
          <span>
            {conflitantes.length} regra{conflitantes.length === 1 ? "" : "s"} em conflito — mesmo fornecedor com consequências
            diferentes. Nenhuma se aplica automaticamente até você desativar uma delas (RUL-13).
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {regras.map((r) => (
          <Card key={r.id} className={r.status === "conflitante" ? "border border-terra/40" : undefined}>
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => abrirDetalhe(r.id)} className="flex flex-1 flex-col items-start gap-1 text-left">
                <span className="text-base text-text-primary">
                  Se fornecedor contém <span className="font-medium">&ldquo;{r.fornecedorTexto}&rdquo;</span>
                </span>
                <span className="text-sm text-text-secondary">
                  → sugerir {r.categoriaRotulo}
                  {r.subcategoriaRotulo ? ` › ${r.subcategoriaRotulo}` : ""}
                  {r.objetivoRotulo ? ` · ${r.objetivoRotulo}` : ""} ({Math.round(r.confianca * 100)}% confiança)
                </span>
                <span className="text-sm text-text-muted">
                  {r.origem === "aprendida" ? "Aprendida pelo Agente de Aprendizagem" : "Criada manualmente"} · {r.quantidadeExecucoes}{" "}
                  execuç{r.quantidadeExecucoes === 1 ? "ão" : "ões"}
                  {r.ultimaUtilizacao ? ` · última em ${formatData(r.ultimaUtilizacao.slice(0, 10))}` : ""} · ver amostra
                </span>
              </button>
              <div className="flex flex-col items-end gap-2">
                <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                <div className="flex gap-1.5">
                  {r.status === "proposta" && (
                    <>
                      <Button variant="success" size="sm" disabled={pendente} onClick={() => executarAcao(() => aprovarRegra(r.id))}>
                        Aprovar
                      </Button>
                      <Button variant="ghost" size="sm" disabled={pendente} onClick={() => executarAcao(() => recusarRegra(r.id))}>
                        Recusar
                      </Button>
                    </>
                  )}
                  {(r.status === "ativa" || r.status === "conflitante") && (
                    <Button variant="ghost" size="sm" disabled={pendente} onClick={() => executarAcao(() => desativarRegra(r.id))}>
                      Desativar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {regras.length === 0 && (
          <p className="rounded-card bg-surface-primary p-6 text-center text-base text-text-muted shadow-[var(--shadow-card)]">
            Nenhuma regra ainda — o Agente de Aprendizagem propõe regras automaticamente após correções consistentes, ou crie uma manualmente.
          </p>
        )}
      </div>

      <Modal
        open={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setCategoriaFormulario("");
        }}
        title="Nova regra"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" disabled={pendente} form="form-nova-regra" type="submit">
              Criar regra
            </Button>
          </div>
        }
      >
        <form id="form-nova-regra" action={criar} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Fornecedor contém
            <Input type="text" name="fornecedorTexto" placeholder="Ex.: UBER" required />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Sugerir categoria
            <select
              name="categoriaId"
              required
              value={categoriaFormulario}
              onChange={(e) => setCategoriaFormulario(e.target.value)}
              className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
            >
              <option value="">Selecionar</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Subcategoria (opcional)
            <select
              name="subcategoriaId"
              disabled={!categoriaFormulario}
              className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary disabled:opacity-50"
            >
              <option value="">Categoria toda</option>
              {(subcategoriasPorCategoria[categoriaFormulario] ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Objetivo (opcional)
            <select
              name="objetivoId"
              className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
            >
              <option value="">Nenhum</option>
              {objetivos.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Confiança (0 a 1)
            <Input type="number" name="confianca" min="0" max="1" step="0.05" defaultValue="0.8" required />
          </label>
        </form>
      </Modal>

      <RuleDetailDrawer
        regra={regras.find((r) => r.id === regraDetalheId) ?? null}
        amostra={amostra}
        carregandoAmostra={carregandoAmostra}
        onClose={() => setRegraDetalheId(null)}
        onAprovar={(id) => executarAcao(() => aprovarRegra(id))}
        onRecusar={(id) => executarAcao(() => recusarRegra(id))}
        onDesativar={(id) => executarAcao(() => desativarRegra(id))}
        pendente={pendente}
      />
    </div>
  );
}
