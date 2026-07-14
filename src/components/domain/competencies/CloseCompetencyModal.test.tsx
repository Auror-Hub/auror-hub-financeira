import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CompetenciaDetalhe } from "@/lib/domain/competency";
import { CloseCompetencyModal } from "./CloseCompetencyModal";

function detalhe(overrides: Partial<CompetenciaDetalhe> = {}): CompetenciaDetalhe {
  return {
    competencia: { id: "comp-x", mesReferencia: "2026-06", estado: "em revisão" },
    documentos: [],
    totalLancamentos: 10,
    lancamentosRevisados: 10,
    lancamentosPendentes: 0,
    totalConsolidado: 100_000,
    insights: [],
    versoesFechamento: [],
    relatorioDisponivel: false,
    ...overrides,
  };
}

describe("CloseCompetencyModal", () => {
  it("bloqueia o fechamento e não mostra confirmar quando há pendências", () => {
    render(
      <CloseCompetencyModal
        open
        onClose={() => {}}
        detalhe={detalhe({ lancamentosPendentes: 9 })}
        onConfirmar={() => {}}
      />,
    );

    expect(screen.getByText(/fechamento bloqueado/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirmar fechamento/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir para caixa de entrada/i })).toHaveAttribute(
      "href",
      "/caixa-de-entrada",
    );
  });

  it("permite confirmar o fechamento quando não há pendências", async () => {
    const onConfirmar = vi.fn();
    render(
      <CloseCompetencyModal
        open
        onClose={() => {}}
        detalhe={detalhe({ lancamentosPendentes: 0 })}
        onConfirmar={onConfirmar}
      />,
    );

    expect(screen.queryByText(/fechamento bloqueado/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /confirmar fechamento/i }));
    expect(onConfirmar).toHaveBeenCalledOnce();
  });
});
