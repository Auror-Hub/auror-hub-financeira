import { Upload, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ActionBar() {
  return (
    <footer className="flex h-[var(--actionbar-height)] items-center justify-between border-t border-border-subtle bg-surface-primary px-4 shadow-[0_-1px_0_var(--color-border-subtle),0_-4px_16px_rgb(60_45_30_/_0.05)]">
      <Button
        variant="primary"
        icon={<Upload size={16} strokeWidth={1.75} />}
        disabled
        title="Envio de documentos chega na Etapa 2 (Backend) — ver docs/ROADMAP.md"
      >
        Enviar documento
      </Button>
      <Button
        variant="ghost"
        size="sm"
        icon={<MessageCircle size={16} strokeWidth={1.75} />}
        disabled
        title="Consultor chega em fase posterior — ver docs/ROADMAP.md"
      >
        Perguntar ao Consultor
      </Button>
    </footer>
  );
}
