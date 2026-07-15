"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EnviarDocumentoScreen, type CartaoOpcao } from "./EnviarDocumentoScreen";
import { LancamentoManualForm } from "./LancamentoManualForm";

type Aba = "fatura" | "manual";

export interface EnviarTabsProps {
  cartoes: CartaoOpcao[];
  categorias: { id: string; rotulo: string }[];
  subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]>;
  objetivos: { id: string; rotulo: string }[];
}

export function EnviarTabs({ cartoes, categorias, subcategoriasPorCategoria, objetivos }: EnviarTabsProps) {
  const [aba, setAba] = useState<Aba>("fatura");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5">
        <button onClick={() => setAba("fatura")}>
          <Badge tone={aba === "fatura" ? "indigo" : "slate"}>Enviar fatura</Badge>
        </button>
        <button onClick={() => setAba("manual")}>
          <Badge tone={aba === "manual" ? "indigo" : "slate"}>Lançamento manual</Badge>
        </button>
      </div>

      {aba === "fatura" ? (
        <EnviarDocumentoScreen cartoes={cartoes} />
      ) : (
        <LancamentoManualForm
          cartoes={cartoes}
          categorias={categorias}
          subcategoriasPorCategoria={subcategoriasPorCategoria}
          objetivos={objetivos}
        />
      )}
    </div>
  );
}
