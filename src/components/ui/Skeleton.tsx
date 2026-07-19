import { cn } from "@/lib/cn";

export interface SkeletonProps {
  className?: string;
}

/**
 * Rearquitetura (Fase 0, ADR-007): bloco de carregamento genérico — usado nos
 * `loading.tsx` de rota (Next.js/Suspense mostra automaticamente enquanto o
 * server component busca dado). A regra global `prefers-reduced-motion` em
 * globals.css desliga a pulsação pra quem pediu menos movimento.
 */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-card bg-surface-secondary", className)} />;
}

export function SkeletonLinha({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-4 w-full", className)} />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-24 w-full", className)} />;
}
