import type { LucideIcon } from "lucide-react";
import {
  Home,
  Inbox,
  CalendarClock,
  Archive,
  Store,
  Tags,
  Workflow,
  History,
  FileText,
  LayoutDashboard,
  Target,
  MessageCircle,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Tem conteúdo real nesta fase, ou é placeholder "em construção"? */
  implemented: boolean;
  /**
   * Rearquitetura (Fase 1, ADR-007): primário = uso do dia a dia (Hoje,
   * Revisar, Explorar, Consultor); secundário = configuração/consulta pontual.
   * "Metas" fica em secundário por ora (deviação pontual do direcional, que
   * previa mover pra dentro de "Meu plano" — rota que só existe a partir da
   * Fase 2; manter Metas sem nenhum link até lá violaria a própria regra do
   * direcional de nunca deixar item primário/real órfão de navegação).
   */
  grupo: "primario" | "secundario";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Hoje", icon: Home, implemented: true, grupo: "primario" },
  { href: "/caixa-de-entrada", label: "Revisar", icon: Inbox, implemented: true, grupo: "primario" },
  { href: "/dashboards", label: "Explorar", icon: LayoutDashboard, implemented: true, grupo: "primario" },
  { href: "/consultor", label: "Consultor", icon: MessageCircle, implemented: true, grupo: "primario" },
  { href: "/competencias", label: "Competências", icon: CalendarClock, implemented: true, grupo: "secundario" },
  { href: "/taxonomia", label: "Categorias", icon: Tags, implemented: true, grupo: "secundario" },
  { href: "/regras", label: "Regras automáticas", icon: Workflow, implemented: true, grupo: "secundario" },
  { href: "/fornecedores", label: "Fornecedores", icon: Store, implemented: false, grupo: "secundario" },
  { href: "/acervo", label: "Acervo", icon: Archive, implemented: false, grupo: "secundario" },
  { href: "/historico", label: "Histórico", icon: History, implemented: true, grupo: "secundario" },
  { href: "/relatorios", label: "Relatórios", icon: FileText, implemented: true, grupo: "secundario" },
  { href: "/metas", label: "Metas", icon: Target, implemented: true, grupo: "secundario" },
  { href: "/configuracoes", label: "Configurações", icon: Settings, implemented: true, grupo: "secundario" },
];
