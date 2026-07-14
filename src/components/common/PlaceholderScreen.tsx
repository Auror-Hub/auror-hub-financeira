import { type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export interface PlaceholderScreenProps {
  title: string;
  icon: LucideIcon;
  note?: string;
}

/**
 * Tela ainda não construída. Usada pelos itens de navegação que só ganham
 * conteúdo real em fases posteriores — ver docs/ROADMAP.md.
 */
export function PlaceholderScreen({ title, icon: Icon, note }: PlaceholderScreenProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-border-default bg-surface-primary p-8">
      <Icon size={22} strokeWidth={1.5} className="text-text-muted" />
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        <Badge tone="slate">Em construção</Badge>
      </div>
      <p className="max-w-md text-base text-text-secondary">
        {note ?? "Esta área ainda não foi implementada. Ver docs/ROADMAP.md para a ordem de construção prevista."}
      </p>
    </div>
  );
}
