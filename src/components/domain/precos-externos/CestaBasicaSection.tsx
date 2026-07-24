import { ShoppingBasket, MapPin } from "lucide-react";
import type { CestaBasicaFamilia } from "@/lib/precos-externos/consulta";
import { formatBRL, formatCompetencia, formatDataHora } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";

export interface CestaBasicaSectionProps {
  cestaBasica: CestaBasicaFamilia | null;
}

/**
 * Fase 20 (Auditoria V3.1): deixa de ter formulário — cadastro manual de um
 * dado global (vale pra TODAS as famílias) por qualquer usuário autenticado
 * era um risco de integridade real (RLS já revogou a escrita). Esta seção
 * agora só lê: resolve a capital de referência da própria família (via
 * cidade/estado do perfil financeiro) e mostra o valor mais recente
 * disponível — nunca mistura cidade real com capital sem avisar.
 */
export function CestaBasicaSection({ cestaBasica }: CestaBasicaSectionProps) {
  return (
    <Card>
      <CardHeader title="Cesta básica (DIEESE)" />
      <p className="mb-3 text-sm text-text-muted">
        Referência econômica pública, coletada automaticamente pra todas as famílias da Hub — não é dado desta família, é o{" "}
        <a href="https://www.dieese.org.br/cesta/" target="_blank" rel="noreferrer" className="text-action-primary hover:underline">
          levantamento do DIEESE
        </a>{" "}
        pela capital mais próxima do seu perfil.
      </p>

      {!cestaBasica && (
        <p className="rounded-card bg-surface-secondary p-3 text-sm text-text-secondary">
          Informe cidade e estado no perfil financeiro acima pra ver a referência de cesta básica da sua região.
        </p>
      )}

      {cestaBasica && cestaBasica.valorCesta === null && (
        <p className="rounded-card bg-surface-secondary p-3 text-sm text-text-secondary">
          Ainda não há valor coletado pra {cestaBasica.capitalReferencia} — a coleta automática desta referência chega numa fase
          seguinte.
        </p>
      )}

      {cestaBasica && cestaBasica.valorCesta !== null && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-text-secondary">
              {cestaBasica.capitalReferencia}
              {cestaBasica.periodoReferencia && ` · ${formatCompetencia(cestaBasica.periodoReferencia)}`}
            </span>
            <span className="font-mono-nums text-lg text-text-primary">{formatBRL(cestaBasica.valorCesta)}</span>
          </div>
          {cestaBasica.atualizadoEm && <span className="text-sm text-text-muted">Atualizado em {formatDataHora(cestaBasica.atualizadoEm)}</span>}
          {cestaBasica.regraCorrespondencia === "proxy_uf" && (
            <div className="flex items-start gap-2 rounded-card border border-dashed border-border-subtle p-2.5 text-sm text-text-secondary">
              <MapPin size={15} className="mt-0.5 shrink-0 text-text-muted" strokeWidth={1.75} />
              <span>
                Sua cidade ({cestaBasica.cidadePerfil}) não é capital — usamos {cestaBasica.capitalReferencia} (capital do seu estado)
                como aproximação, nunca como o valor exato da sua cidade.
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-sm text-text-muted">
        <ShoppingBasket size={13} strokeWidth={1.75} />
        <span>Metodologia DIEESE — nunca multiplicado pelo número de pessoas da família.</span>
      </div>
    </Card>
  );
}
