import { ConsultantScreen } from "@/components/domain/consultor/ConsultantScreen";
import { carregarConversaAtual, carregarConversas } from "@/lib/consultor/consulta";

export default async function ConsultorPage() {
  const [conversaAtual, conversas] = await Promise.all([carregarConversaAtual(), carregarConversas()]);
  return (
    <ConsultantScreen
      conversaIdInicial={conversaAtual.conversaId}
      mensagensIniciais={conversaAtual.mensagens}
      conversasIniciais={conversas}
    />
  );
}
