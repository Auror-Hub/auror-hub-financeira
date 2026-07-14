import type { EstadoCompetencia } from "@/lib/domain/types";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

const ESTADO_TONE: Record<EstadoCompetencia, BadgeTone> = {
  "aguardando documentos": "slate",
  importando: "slate",
  "divergência": "terra",
  "em revisão": "gold",
  pronta: "green",
  fechada: "green",
  reaberta: "gold",
  atualizada: "indigo",
};

export function CompetencyStatusBadge({ estado }: { estado: EstadoCompetencia }) {
  return <Badge tone={ESTADO_TONE[estado]}>{estado}</Badge>;
}
