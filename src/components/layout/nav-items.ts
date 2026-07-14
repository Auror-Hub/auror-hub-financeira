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
  { href: "/competencias", label: "Competências", icon: CalendarClock, implemented: false },
  { href: "/acervo", label: "Acervo", icon: Archive, implemented: false },
  { href: "/fornecedores", label: "Fornecedores", icon: Store, implemented: false },
  { href: "/taxonomia", label: "Taxonomia", icon: Tags, implemented: false },
  { href: "/regras", label: "Motor de Regras", icon: Workflow, implemented: false },
  { href: "/historico", label: "Histórico", icon: History, implemented: false },
  { href: "/relatorios", label: "Relatórios", icon: FileText, implemented: false },
  { href: "/consultor", label: "Consultor", icon: MessageCircle, implemented: false },
  { href: "/configuracoes", label: "Configurações", icon: Settings, implemented: false },
];
