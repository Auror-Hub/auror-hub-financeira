"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Sessão simulada da Etapa 1 (Frontend). Substituída por sessão real do
 * Supabase Auth na Etapa 2 (BE-1) — ver docs/ROADMAP.md e o plano de
 * construção aprovado. Nenhuma tela deve importar dados de sessão de
 * outro lugar enquanto isso não acontecer.
 */
export interface SimulatedSession {
  userName: string;
  profileName: string;
}

const SessionContext = createContext<SimulatedSession | null>(null);

const MOCK_SESSION: SimulatedSession = {
  userName: "Victoria Gama",
  profileName: "Pessoal",
};

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionContext.Provider value={MOCK_SESSION}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SimulatedSession {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession deve ser usado dentro de um SessionProvider");
  }
  return session;
}
