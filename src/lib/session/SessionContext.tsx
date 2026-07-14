"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Sessão real (Supabase Auth) — substituiu a sessão simulada da Etapa 1 na
 * fase BE-1. O valor vem do Server Component (app)/layout.tsx, que já
 * resolveu o usuário autenticado e seu perfil antes de renderizar.
 */
export interface Session {
  userName: string;
  profileName: string;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children, session }: { children: ReactNode; session: Session }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession deve ser usado dentro de um SessionProvider");
  }
  return session;
}
