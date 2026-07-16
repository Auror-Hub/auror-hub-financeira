"use client";

import { useState, useTransition } from "react";
import { Upload, FileCheck2, CircleAlert, RotateCcw } from "lucide-react";
import {
  analisarArquivo,
  processarImportacao,
  type AnalisarArquivoResultado,
  type ProcessarImportacaoResultado,
} from "@/lib/import/actions";
import { formatBRL } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

export interface CartaoOpcao {
  id: string;
  instituicao: string;
  apelido: string | null;
  tipo: "cartao" | "conta";
}

type Etapa = "selecionar" | "mapear" | "resultado";
type ModoValor = "unica" | "credito_debito";

const FORMATOS_DATA = [
  { valor: "DD/MM/YYYY", rotulo: "DD/MM/AAAA" },
  { valor: "YYYY-MM-DD", rotulo: "AAAA-MM-DD" },
  { valor: "MM/DD/YYYY", rotulo: "MM/DD/AAAA" },
  { valor: "DD/MM", rotulo: "DD/MM (sem ano — informar data de referência)" },
];

export function EnviarDocumentoScreen({ cartoes }: { cartoes: CartaoOpcao[] }) {
  const [etapa, setEtapa] = useState<Etapa>("selecionar");
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [cartaoId, setCartaoId] = useState(cartoes[0]?.id ?? "");
  const [competenciaFatura, setCompetenciaFatura] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analise, setAnalise] = useState<AnalisarArquivoResultado | null>(null);
  const [resultado, setResultado] = useState<ProcessarImportacaoResultado | null>(null);

  const [mapeamentoAutoAplicado, setMapeamentoAutoAplicado] = useState(false);
  const [formularioExpandido, setFormularioExpandido] = useState(false);

  const [aba, setAba] = useState("");
  const [linhasParaPular, setLinhasParaPular] = useState(0);
  const [delimitador, setDelimitador] = useState(",");
  const [colunaData, setColunaData] = useState("");
  const [colunaDescricao, setColunaDescricao] = useState("");
  const [modoValor, setModoValor] = useState<ModoValor>("unica");
  const [colunaValor, setColunaValor] = useState("");
  const [colunaCredito, setColunaCredito] = useState("");
  const [colunaDebito, setColunaDebito] = useState("");
  const [colunaParcela, setColunaParcela] = useState("");
  const [colunaCartao, setColunaCartao] = useState("");
  const [inverterSinal, setInverterSinal] = useState(false);
  const [formatoData, setFormatoData] = useState("DD/MM/YYYY");
  const [formatoMonetario, setFormatoMonetario] = useState<"BR" | "US">("BR");
  const [dataReferencia, setDataReferencia] = useState("");

  if (cartoes.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-2">
        <span className="eyebrow">Enviar documento</span>
        <p className="text-base text-text-secondary">
          Cadastre pelo menos um cartão em Configurações antes de enviar uma fatura.
        </p>
      </Card>
    );
  }

  function aplicarPerfilExistente(resultadoAnalise: AnalisarArquivoResultado) {
    const p = resultadoAnalise.perfilExistente;
    if (!p) return;
    setDelimitador(p.delimitador);
    setColunaData(p.colunaData);
    setColunaDescricao(p.colunaDescricao);
    setModoValor(p.modoValor);
    setColunaValor(p.colunaValor ?? "");
    setColunaCredito(p.colunaCredito ?? "");
    setColunaDebito(p.colunaDebito ?? "");
    setColunaParcela(p.colunaParcela ?? "");
    setColunaCartao(p.colunaCartao ?? "");
    setInverterSinal(p.inverterSinal);
    setFormatoData(p.formatoData);
    setFormatoMonetario(p.formatoMonetario);
  }

  function reanalisar(overrides: { aba?: string; linhasParaPular?: number } = {}) {
    if (!arquivo || !cartaoId) return;
    setErro(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("arquivo", arquivo);
        formData.set("cartaoId", cartaoId);
        formData.set("aba", overrides.aba ?? aba);
        formData.set("linhasParaPular", String(overrides.linhasParaPular ?? linhasParaPular));
        if (delimitador) formData.set("delimitador", delimitador);
        const resultadoAnalise = await analisarArquivo(formData);
        setAnalise(resultadoAnalise);
        setAba(resultadoAnalise.abaSelecionada);
        if (etapa === "selecionar") {
          setDelimitador(resultadoAnalise.delimitadorDetectado);
          const perfil = resultadoAnalise.perfilExistente;
          // Um perfil salvo é por cartão, não por formato de arquivo — o
          // mesmo cartão pode receber um CSV num mês e um XLSX de layout
          // totalmente diferente no outro (achado real: perfil salvo de um
          // CSV antigo do Itaú sendo reaplicado cegamente numa fatura XLSX
          // "paga" completamente diferente). Só usa o perfil se o tipo de
          // arquivo bate E as colunas salvas ainda existem no arquivo atual
          // — senão, é tratado como perfil obsoleto e cai na auto-detecção.
          const perfilCompativel =
            !!perfil &&
            perfil.tipoArquivo === resultadoAnalise.tipoArquivo &&
            resultadoAnalise.cabecalhos.includes(perfil.colunaData) &&
            resultadoAnalise.cabecalhos.includes(perfil.colunaDescricao);

          if (perfilCompativel && perfil) {
            aplicarPerfilExistente(resultadoAnalise);
            if (perfil.tipoArquivo === "xlsx") {
              setAba(perfil.aba ?? resultadoAnalise.abaSelecionada);
              setLinhasParaPular(perfil.linhasParaPular);
            }
          } else {
            // Sem perfil salvo pra este cartão — tenta a auto-detecção
            // (Insight de Produto, 2026-07-16). Só aplica o que a heurística
            // realmente identificou com confiança; campo não detectado fica
            // em branco pro usuário preencher manualmente.
            if (resultadoAnalise.linhasParaPularSugerido !== null) {
              // Planilha com linhas de metadado antes da tabela real (ex.:
              // fatura "paga" do Itaú) — os cabeçalhos/amostra já vieram
              // corretamente alinhados a partir dessa linha; só reflete o
              // número aqui pra "Linhas de cabeçalho a pular" mostrar certo
              // e o valor ser enviado corretamente na hora de confirmar.
              setLinhasParaPular(resultadoAnalise.linhasParaPularSugerido);
            }
            const md = resultadoAnalise.mapeamentoDetectado;
            if (md.colunaData) setColunaData(md.colunaData.valor);
            if (md.colunaDescricao) setColunaDescricao(md.colunaDescricao.valor);
            if (md.colunaValor) setColunaValor(md.colunaValor.valor);
            if (md.formatoData) setFormatoData(md.formatoData.valor);
            if (md.formatoMonetario) setFormatoMonetario(md.formatoMonetario.valor);
            const totalmenteDetectado = !!(md.colunaData && md.colunaDescricao && md.colunaValor);
            setMapeamentoAutoAplicado(totalmenteDetectado);
            setFormularioExpandido(!totalmenteDetectado);
          }
        }
        setEtapa("mapear");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao ler o arquivo.");
      }
    });
  }

  function confirmarImportacao() {
    if (!arquivo) return;
    setErro(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("arquivo", arquivo);
        formData.set("cartaoId", cartaoId);
        formData.set("competenciaFatura", competenciaFatura);
        formData.set("aba", aba);
        formData.set("linhasParaPular", String(linhasParaPular));
        formData.set("delimitador", delimitador);
        formData.set("colunaData", colunaData);
        formData.set("colunaDescricao", colunaDescricao);
        formData.set("modoValor", modoValor);
        formData.set("colunaValor", colunaValor);
        formData.set("colunaCredito", colunaCredito);
        formData.set("colunaDebito", colunaDebito);
        formData.set("colunaParcela", colunaParcela);
        formData.set("colunaCartao", colunaCartao);
        formData.set("inverterSinal", String(inverterSinal));
        formData.set("formatoData", formatoData);
        formData.set("formatoMonetario", formatoMonetario);
        formData.set("dataReferencia", dataReferencia);
        const resultadoProcessamento = await processarImportacao(formData);
        setResultado(resultadoProcessamento);
        setEtapa("resultado");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao processar a importação.");
      }
    });
  }

  function reiniciar() {
    setEtapa("selecionar");
    setCompetenciaFatura("");
    setArquivo(null);
    setAnalise(null);
    setResultado(null);
    setErro(null);
    setMapeamentoAutoAplicado(false);
    setFormularioExpandido(false);
    setAba("");
    setLinhasParaPular(0);
    setColunaData("");
    setColunaDescricao("");
    setColunaValor("");
    setColunaCredito("");
    setColunaDebito("");
    setColunaParcela("");
    setColunaCartao("");
    setInverterSinal(false);
    setDataReferencia("");
  }

  const mapeamentoValido =
    colunaData &&
    colunaDescricao &&
    (modoValor === "unica" ? !!colunaValor : !!colunaCredito || !!colunaDebito) &&
    (formatoData !== "DD/MM" || !!dataReferencia);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Upload size={20} className="text-text-muted" strokeWidth={1.75} />
        <h1 className="text-xl font-semibold text-text-primary">Enviar documento</h1>
      </div>

      {erro && (
        <div className="flex items-start gap-2 rounded-card bg-state-danger-tint p-3 text-sm text-terra">
          <CircleAlert size={16} className="mt-0.5 shrink-0" strokeWidth={1.75} />
          {erro}
        </div>
      )}

      {etapa === "selecionar" && (
        <Card className="flex flex-col gap-3">
          <CardHeader title="1. Selecione o cartão e o arquivo (CSV ou XLSX)" />
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Cartão
            <select
              value={cartaoId}
              onChange={(e) => setCartaoId(e.target.value)}
              className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
            >
              {cartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.apelido || c.instituicao}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Competência da fatura
            <input
              type="month"
              value={competenciaFatura}
              onChange={(e) => setCompetenciaFatura(e.target.value)}
              className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
            />
            <span className="text-xs text-text-muted">
              Mês de fechamento desta fatura — todo lançamento do arquivo entra nesta competência, mesmo parcelas com data de compra
              de meses anteriores.
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Arquivo
            <input
              type="file"
              accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="text-sm text-text-primary file:mr-3 file:rounded-btn-sm file:border-0 file:bg-surface-secondary file:px-3 file:py-1.5 file:text-sm"
            />
          </label>
          <Button
            variant="primary"
            size="sm"
            className="w-fit"
            disabled={!arquivo || !cartaoId || !competenciaFatura || pendente}
            onClick={() => reanalisar()}
          >
            {pendente ? "Analisando..." : "Analisar arquivo"}
          </Button>
        </Card>
      )}

      {etapa === "mapear" && analise && mapeamentoAutoAplicado && !formularioExpandido && (
        <Card className="flex flex-col gap-3">
          <CardHeader title="2. Mapeamento detectado automaticamente" count={`${analise.totalLinhas} linhas`} />
          <div className="rounded-input border border-border-subtle bg-surface-secondary p-3 text-sm text-text-secondary">
            <p>
              Detectamos: data = &ldquo;{colunaData}&rdquo;, descrição = &ldquo;{colunaDescricao}&rdquo;, valor = &ldquo;
              {colunaValor}&rdquo;, formato monetário {formatoMonetario === "BR" ? "brasileiro" : "americano"}.
            </p>
            <button
              type="button"
              onClick={() => setFormularioExpandido(true)}
              className="mt-1 text-sm text-action-primary hover:underline"
            >
              Conferir ou trocar manualmente
            </button>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" disabled={!mapeamentoValido || pendente} onClick={confirmarImportacao}>
              {pendente ? "Importando..." : "Confirmar importação"}
            </Button>
            <Button variant="ghost" size="sm" onClick={reiniciar}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {etapa === "mapear" && analise && (!mapeamentoAutoAplicado || formularioExpandido) && (
        <Card className="flex flex-col gap-4">
          <CardHeader title="2. Confira o mapeamento" count={`${analise.totalLinhas} linhas`} />

          {analise.tipoArquivo === "xlsx" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Aba da planilha
                <select
                  value={aba}
                  onChange={(e) => {
                    setAba(e.target.value);
                    reanalisar({ aba: e.target.value });
                  }}
                  className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
                >
                  {analise.abasDisponiveis.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Linhas de cabeçalho a pular antes da tabela
                <Input
                  type="number"
                  min={0}
                  value={linhasParaPular}
                  onChange={(e) => {
                    const n = Number(e.target.value) || 0;
                    setLinhasParaPular(n);
                    reanalisar({ linhasParaPular: n });
                  }}
                />
              </label>
            </div>
          )}

          <div className="overflow-x-auto rounded-input border border-border-subtle">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-secondary">
                  {analise.cabecalhos.map((c) => (
                    <th key={c} className="whitespace-nowrap px-2 py-1.5 font-medium text-text-secondary">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analise.amostra.map((linha, i) => (
                  <tr key={i} className="border-b border-border-subtle last:border-0">
                    {analise.cabecalhos.map((c) => (
                      <td key={c} className="whitespace-nowrap px-2 py-1.5 text-text-primary">
                        {linha[c]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SeletorColuna label="Coluna de data*" valor={colunaData} onChange={setColunaData} opcoes={analise.cabecalhos} />
            <SeletorColuna
              label="Coluna de descrição*"
              valor={colunaDescricao}
              onChange={setColunaDescricao}
              opcoes={analise.cabecalhos}
            />

            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Formato de data
              <select
                value={formatoData}
                onChange={(e) => setFormatoData(e.target.value)}
                className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
              >
                {FORMATOS_DATA.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.rotulo}
                  </option>
                ))}
              </select>
            </label>
            {formatoData === "DD/MM" && (
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Data de referência da fatura (ex.: data de fechamento)
                <Input type="date" value={dataReferencia} onChange={(e) => setDataReferencia(e.target.value)} />
              </label>
            )}

            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Formato monetário
              <select
                value={formatoMonetario}
                onChange={(e) => setFormatoMonetario(e.target.value as "BR" | "US")}
                className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
              >
                <option value="BR">Vírgula decimal (ex.: 1.234,56)</option>
                <option value="US">Ponto decimal (ex.: 1234.56)</option>
              </select>
            </label>
            <SeletorColuna
              label="Coluna de parcela (opcional)"
              valor={colunaParcela}
              onChange={setColunaParcela}
              opcoes={analise.cabecalhos}
              opcional
            />
            <SeletorColuna
              label="Coluna do cartão (opcional — se a fatura cobrir mais de um cartão da mesma conta)"
              valor={colunaCartao}
              onChange={setColunaCartao}
              opcoes={analise.cabecalhos}
              opcional
            />
          </div>
          {colunaCartao && (
            <p className="text-sm text-text-muted">
              Cada linha será atribuída ao cartão cujo final de dígitos cadastrado em Configurações bater com o valor
              desta coluna. Se a fatura só preencher essa coluna na primeira linha de cada bloco de cartão (comum em
              planilhas exportadas), as linhas seguintes reaproveitam automaticamente o último valor visto. Linhas sem
              nenhuma correspondência ficam marcadas como inválidas para revisão.
            </p>
          )}

          <fieldset className="flex flex-col gap-2 rounded-card border border-border-subtle p-3">
            <legend className="eyebrow px-1">Como o valor aparece na fatura</legend>
            <div className="flex gap-4 text-sm text-text-secondary">
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={modoValor === "unica"} onChange={() => setModoValor("unica")} />
                Uma coluna só (com sinal)
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={modoValor === "credito_debito"}
                  onChange={() => setModoValor("credito_debito")}
                />
                Crédito e débito em colunas separadas
              </label>
            </div>
            {modoValor === "unica" ? (
              <>
                <SeletorColuna label="Coluna de valor*" valor={colunaValor} onChange={setColunaValor} opcoes={analise.cabecalhos} />
                <label className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <input type="checkbox" checked={inverterSinal} onChange={(e) => setInverterSinal(e.target.checked)} />
                  Inverter sinal (marque se valores positivos nesta coluna representam gasto, não crédito)
                </label>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SeletorColuna
                  label="Coluna de crédito"
                  valor={colunaCredito}
                  onChange={setColunaCredito}
                  opcoes={analise.cabecalhos}
                  opcional
                />
                <SeletorColuna
                  label="Coluna de débito"
                  valor={colunaDebito}
                  onChange={setColunaDebito}
                  opcoes={analise.cabecalhos}
                  opcional
                />
              </div>
            )}
          </fieldset>

          <div className="flex gap-2">
            <Button variant="primary" size="sm" disabled={!mapeamentoValido || pendente} onClick={confirmarImportacao}>
              {pendente ? "Importando..." : "Confirmar importação"}
            </Button>
            <Button variant="ghost" size="sm" onClick={reiniciar}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {etapa === "resultado" && resultado && (
        <Card className="flex flex-col gap-4">
          <CardHeader title="Importação concluída" />
          <div className="flex items-start gap-2">
            <FileCheck2 size={18} className="mt-0.5 shrink-0 text-state-success" strokeWidth={1.75} />
            <p className="text-base text-text-secondary">
              {resultado.linhasValidas} de {resultado.totalLinhas} linhas foram salvas como lançamentos brutos
              (imutáveis), totalizando {formatBRL(resultado.totalExtraido)}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {resultado.linhasInvalidas > 0 && (
              <Badge tone="gold">{resultado.linhasInvalidas} linha(s) inválida(s) — ver auditoria</Badge>
            )}
            {resultado.pagamentosIgnorados > 0 && (
              <Badge tone="slate">
                {resultado.pagamentosIgnorados} pagamento(s) de fatura ignorado(s) (não são gasto)
              </Badge>
            )}
            {resultado.duplicatasSinalizadas > 0 && (
              <Badge tone="terra">{resultado.duplicatasSinalizadas} possível(is) duplicata(s) sinalizada(s)</Badge>
            )}
            {resultado.colunasNaoReconhecidas.length > 0 && (
              <Badge tone="terra">
                Coluna(s) não reconhecida(s): {resultado.colunasNaoReconhecidas.join(", ")} — confira o mapeamento
              </Badge>
            )}
          </div>
          <p className="text-sm text-text-muted">
            Estes lançamentos já aparecem na Caixa de Entrada — use &ldquo;Gerar propostas&rdquo; lá pra receber
            sugestões de classificação. Confirmar ou corrigir uma proposta ainda não grava decisão real (chega na
            fase BE-4).
          </p>
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={14} strokeWidth={1.75} />}
            className="w-fit"
            onClick={reiniciar}
          >
            Enviar outro documento
          </Button>
        </Card>
      )}
    </div>
  );
}

function SeletorColuna({
  label,
  valor,
  onChange,
  opcoes,
  opcional,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  opcoes: string[];
  opcional?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-text-secondary">
      {label}
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
      >
        <option value="">{opcional ? "Nenhuma" : "Selecionar"}</option>
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
