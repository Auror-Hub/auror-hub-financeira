import { Settings } from "lucide-react";
import { PlaceholderScreen } from "@/components/common/PlaceholderScreen";
import { SignOutButton } from "@/components/domain/auth/SignOutButton";

export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-col gap-4">
      <PlaceholderScreen
        title="Configurações"
        icon={Settings}
        note="A gestão de cartões e preferências ainda não foi implementada. A conta (login/logout) já é real desde a fase BE-1."
      />
      <div>
        <SignOutButton />
      </div>
    </div>
  );
}
