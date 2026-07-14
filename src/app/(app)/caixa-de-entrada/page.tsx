import { InboxScreen } from "@/components/domain/inbox/InboxScreen";
import { carregarCaixaDeEntrada } from "@/lib/classificacao/consulta";

export default async function CaixaDeEntradaPage() {
  const dados = await carregarCaixaDeEntrada();
  return <InboxScreen {...dados} />;
}
