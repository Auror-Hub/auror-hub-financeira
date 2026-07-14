import { CalendarClock } from "lucide-react";
import { PlaceholderScreen } from "@/components/common/PlaceholderScreen";

export default function CompetenciasPage() {
  return (
    <PlaceholderScreen
      title="Competências"
      icon={CalendarClock}
      note="A lista, o detalhe e os modais de fechamento/reabertura chegam na fase FE-4 (ver docs/ROADMAP.md)."
    />
  );
}
