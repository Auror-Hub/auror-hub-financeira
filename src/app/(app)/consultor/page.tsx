import { ConsultantScreen } from "@/components/domain/consultor/ConsultantScreen";
import { carregarConversaAtual } from "@/lib/consultor/consulta";

export default async function ConsultorPage() {
  const conversaAtual = await carregarConversaAtual();
  return <ConsultantScreen conversaIdInicial={conversaAtual.conversaId} mensagensIniciais={conversaAtual.mensagens} />;
}
