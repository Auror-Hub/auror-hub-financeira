import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CompetenciaDetalhe } from "@/lib/domain/competency";
import { ReopenCompetencyModal } from "./ReopenCompetencyModal";

const detalhe: CompetenciaDetalhe = {
  competencia: { id: "comp-x", mesReferencia: "2026-05", estado: "fechada" },
  documentos: [],
  totalLancamentos: 10,
  lancamentosRevisados: 10,
  lancamentosPendentes: 0,
  totalConsolidado: 100_000,
  insights: [],
  recomendacoes: [],
  versoesFechamento: [{ versao: 1, fechadoEm: "2026-06-01T10:00:00Z" }],
  relatorioDisponivel: true,
};

describe("ReopenCompetencyModal", () => {
  it("mantém o botão de confirmar desabilitado sem motivo selecionado", () => {
    render(<ReopenCompetencyModal open onClose={() => {}} detalhe={detalhe} onConfirmar={() => {}} />);
    expect(screen.getByRole("button", { name: /confirmar reabertura/i })).toBeDisabled();
  });

  it("habilita e chama onConfirmar com o motivo escolhido", async () => {
    const onConfirmar = vi.fn();
    render(<ReopenCompetencyModal open onClose={() => {}} detalhe={detalhe} onConfirmar={onConfirmar} />);

    await userEvent.selectOptions(screen.getByRole("combobox"), "Correção");
    const botao = screen.getByRole("button", { name: /confirmar reabertura/i });
    expect(botao).toBeEnabled();

    await userEvent.click(botao);
    expect(onConfirmar).toHaveBeenCalledWith("Correção", "");
  });
});
