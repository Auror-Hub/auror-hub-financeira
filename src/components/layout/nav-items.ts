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
  MessageCircle,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Tem conteúdo real nesta fase, ou é placeholder "em construção"? */
  implemented: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home, implemented: true },
  { href: "/caixa-de-entrada", label: "Caixa de Entrada", icon: Inbox, implemented: true },
  { href: "/competencias", label: "Competências", icon: CalendarClock, implemented: true },
  { href: "/acervo", label: "Acervo", icon: Archive, implemented: false },
  { href: "/fornecedores", label: "Fornecedores", icon: Store, implemented: false },
  { href: "/taxonomia", label: "Taxonomia", icon: Tags, implemented: true },
  { href: "/regras", label: "Motor de Regras", icon: Workflow, implemented: true },
  { href: "/historico", label: "Histórico", icon: History, implemented: true },
  { href: "/relatorios", label: "Relatórios", icon: FileText, implemented: true },
  { href: "/dashboards", label: "Dashboards", icon: LayoutDashboard, implemented: true },
  { href: "/consultor", label: "Consultor", icon: MessageCircle, implemented: false },
  { href: "/configuracoes", label: "Configurações", icon: Settings, implemented: false },
];
