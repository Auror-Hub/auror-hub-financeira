import Link from "next/link";
import { FileText } from "lucide-react";
import type { RelatorioResumo } from "@/lib/relatorios/consulta";
import { formatCompetencia, formatData } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export interface ReportListScreenProps {
  relatorios: RelatorioResumo[];
}

/** SCR-REPORT-LIST-001 — uma linha por competência com relatório gerado, versão vigente. */
export function ReportListScreen({ relatorios }: ReportListScreenProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <FileText size={20} className="text-text-muted" strokeWidth={1.75} />
        <h1 className="text-xl font-semibold text-text-primary">Relatórios</h1>
      </div>

      <div className="flex flex-col gap-3">
        {relatorios.map((r) => (
          <Link key={r.versaoId} href={`/relatorios/${r.versaoId}`}>
            <Card className="transition-shadow duration-150 hover:shadow-[var(--shadow-card-hover)]">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-medium text-text-primary">{formatCompetencia(r.mesReferencia)}</span>
                  <span className="text-sm text-text-muted">Versão {r.versao} · {formatData(r.criadoEm.slice(0, 10))}</span>
                </div>
                <Badge tone={r.status === "vigente" ? "green" : "slate"}>{r.status}</Badge>
              </div>
            </Card>
          </Link>
        ))}
        {relatorios.length === 0 && (
          <p className="rounded-card bg-surface-primary p-6 text-center text-base text-text-muted shadow-[var(--shadow-card)]">
            Nenhum relatório disponível ainda — gerado automaticamente ao fechar uma competência.
          </p>
        )}
      </div>
    </div>
  );
}
