import type { LucideIcon } from "lucide-react";
import {
  Home,
  Inbox,
  CalendarClock,
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
   * Revisar, Meu plano, Explorar, Consultor); secundário = configuração/
   * consulta pontual. "Meu plano" (Fase 2) embute a tela de Metas — a rota
   * `/metas` continua existindo sem redirect, só deixou de ter item próprio
   * no nav.
   */
  grupo: "primario" | "secundario";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Hoje", icon: Home, implemented: true, grupo: "primario" },
  { href: "/caixa-de-entrada", label: "Revisar", icon: Inbox, implemented: true, grupo: "primario" },
  { href: "/meu-plano", label: "Meu plano", icon: Target, implemented: true, grupo: "primario" },
  { href: "/dashboards", label: "Explorar", icon: LayoutDashboard, implemented: true, grupo: "primario" },
  { href: "/consultor", label: "Consultor", icon: MessageCircle, implemented: true, grupo: "primario" },
  { href: "/competencias", label: "Competências", icon: CalendarClock, implemented: true, grupo: "secundario" },
  { href: "/taxonomia", label: "Categorias", icon: Tags, implemented: true, grupo: "secundario" },
  { href: "/regras", label: "Regras automáticas", icon: Workflow, implemented: true, grupo: "secundario" },
  { href: "/historico", label: "Histórico", icon: History, implemented: true, grupo: "secundario" },
  { href: "/relatorios", label: "Relatórios", icon: FileText, implemented: true, grupo: "secundario" },
  { href: "/configuracoes", label: "Configurações", icon: Settings, implemented: true, grupo: "secundario" },
];
