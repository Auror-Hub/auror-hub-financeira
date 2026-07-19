import { InboxScreen } from "@/components/domain/inbox/InboxScreen";
import { carregarCaixaDeEntrada } from "@/lib/classificacao/consulta";
import { carregarProvisoriosPendentes } from "@/lib/provisorios/consulta";

export default async function CaixaDeEntradaPage() {
  const [dados, provisorios] = await Promise.all([carregarCaixaDeEntrada(), carregarProvisoriosPendentes()]);
  return <InboxScreen {...dados} provisorios={provisorios} />;
}
