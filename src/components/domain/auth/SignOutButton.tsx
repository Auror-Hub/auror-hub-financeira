"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/entrar");
    router.refresh();
  }

  return (
    <Button variant="secondary" size="sm" icon={<LogOut size={14} strokeWidth={1.75} />} onClick={sair} disabled={saindo}>
      {saindo ? "Saindo..." : "Sair"}
    </Button>
  );
}
