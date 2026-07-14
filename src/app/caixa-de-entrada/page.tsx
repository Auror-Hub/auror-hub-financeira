import { Inbox } from "lucide-react";
import { PlaceholderScreen } from "@/components/common/PlaceholderScreen";

export default function CaixaDeEntradaPage() {
  return (
    <PlaceholderScreen
      title="Caixa de Entrada"
      icon={Inbox}
      note="A fila de revisão, o drawer de detalhe e a revisão em lote chegam na fase FE-3 (ver docs/ROADMAP.md)."
    />
  );
}
