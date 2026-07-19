import Link from "next/link";
import { Upload, MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ActionBar() {
  return (
    <footer className="flex h-[var(--actionbar-height)] items-center justify-between border-t border-border-subtle bg-surface-primary px-4 shadow-[0_-1px_0_var(--color-border-subtle),0_-4px_16px_rgb(60_45_30_/_0.05)]">
      <div className="flex items-center gap-2">
        <Link href="/enviar">
          <Button variant="primary" icon={<Upload size={16} strokeWidth={1.75} />}>
            Enviar documento
          </Button>
        </Link>
        {/* Rearquitetura (Fase 3, ADR-007): atalho global pra captura rápida — acessível de qualquer tela. */}
        <Link href="/captura-rapida">
          <Button variant="secondary" size="sm" icon={<Plus size={14} strokeWidth={1.75} />}>
            Captura rápida
          </Button>
        </Link>
      </div>
      <Link href="/consultor">
        <Button variant="ghost" size="sm" icon={<MessageCircle size={16} strokeWidth={1.75} />}>
          Perguntar ao Consultor
        </Button>
      </Link>
    </footer>
  );
}
