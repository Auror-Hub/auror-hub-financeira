import Link from "next/link";
import { Upload, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ActionBar() {
  return (
    <footer className="flex h-[var(--actionbar-height)] items-center justify-between border-t border-border-subtle bg-surface-primary px-4 shadow-[0_-1px_0_var(--color-border-subtle),0_-4px_16px_rgb(60_45_30_/_0.05)]">
      <Link href="/enviar">
        <Button variant="primary" icon={<Upload size={16} strokeWidth={1.75} />}>
          Enviar documento
        </Button>
      </Link>
      <Link href="/consultor">
        <Button variant="ghost" size="sm" icon={<MessageCircle size={16} strokeWidth={1.75} />}>
          Perguntar ao Consultor
        </Button>
      </Link>
    </footer>
  );
}
