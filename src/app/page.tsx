import { Home as HomeIcon } from "lucide-react";
import { PlaceholderScreen } from "@/components/common/PlaceholderScreen";

export default function HomePage() {
  return (
    <PlaceholderScreen
      title="Home"
      icon={HomeIcon}
      note="A síntese interpretativa da competência atual chega na fase FE-2 (ver docs/ROADMAP.md)."
    />
  );
}
