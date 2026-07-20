"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, ArrowRight, Sparkles } from "lucide-react";
import { enviarPergunta, confirmarRascunhoConsultor, type MensagemConsultor } from "@/lib/consultor/acoes";
import type { RascunhoAcao } from "@/lib/consultor/rascunho";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

function BolhaUsuario({ mensagem }: { mensagem: MensagemConsultor }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-card bg-action-primary px-3.5 py-2.5 text-base text-action-on-primary">{mensagem.texto}</div>
    </div>
  );
}

function ItemLista({ texto, href }: { texto: string; href?: string }) {
  if (href) {
    return (
      <li>
        <Link href={href} className="inline-flex items-center gap-1 text-action-primary hover:underline">
          {texto} <ArrowRight size={12} />
        </Link>
      </li>
    );
  }
  return <li>{texto}</li>;
}

const ROTULO_TIPO_RASCUNHO: Record<RascunhoAcao["tipo"], string> = {
  criar_meta: "Nova meta",
  ajustar_meta: "Ajuste de meta",
  criar_provisorio: "Lançamento provisório",
  corrigir_classificacao: "Correção de classificação",
};

/**
 * Rearquitetura (Fase 4, ADR-007): card de rascunho — a mutação real só
 * acontece quando a Victoria clica "Confirmar" aqui (nunca antes disso, nem
 * quando a mensagem foi só interpretada). `resolvido` é estado local da
 * sessão, não persistido — recarregar a página mostra o cartão de novo, mas
 * confirmar duas vezes é uma falha segura (ex.: "meta já existe"), nunca uma
 * duplicação silenciosa perigosa.
 */
function RascunhoCard({ rascunho, resolvido, onResolvido }: { rascunho: RascunhoAcao; resolvido: boolean; onResolvido: () => void }) {
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  async function confirmar() {
    setPendente(true);
    setErro(null);
    try {
      await confirmarRascunhoConsultor(rascunho);
      setConfirmado(true);
      onResolvido();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao confirmar.");
    } finally {
      setPendente(false);
    }
  }

  if (resolvido || confirmado) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-input border border-dashed border-state-success/40 bg-state-success-tint p-2.5 text-sm text-state-success">
        <Sparkles size={14} strokeWidth={1.75} />
        Confirmado — {rascunho.resumo}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-input border border-dashed border-indigo/40 bg-indigo-tint p-3">
      <div className="flex items-center gap-2">
        <Badge tone="gold">rascunho</Badge>
        <span className="text-sm font-medium text-text-primary">{ROTULO_TIPO_RASCUNHO[rascunho.tipo]}</span>
      </div>
      <p className="text-base text-text-primary">{rascunho.resumo}</p>
      {erro && <p className="text-sm text-terra">{erro}</p>}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" disabled={pendente} onClick={confirmar}>
          {pendente ? "Confirmando..." : "Confirmar"}
        </Button>
        <Button variant="ghost" size="sm" disabled={pendente} onClick={onResolvido}>
          Descartar
        </Button>
      </div>
    </div>
  );
}

function BolhaConsultor({ mensagem, rascunhoResolvido, onRascunhoResolvido }: { mensagem: MensagemConsultor; rascunhoResolvido: boolean; onRascunhoResolvido: () => void }) {
  const resposta = mensagem.resposta;
  if (!resposta) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-card bg-surface-secondary px-3.5 py-2.5 text-base text-text-primary">{mensagem.texto}</div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <Card accent="indigo" className="max-w-[85%] p-4">
        <p className="text-md font-semibold text-text-primary">{resposta.respostaDireta}</p>

        {resposta.evidencias.length > 0 && (
          <div className="mt-3">
            <span className="eyebrow">Evidências</span>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-text-secondary">
              {resposta.evidencias.map((e, i) => (
                <ItemLista key={i} texto={e.texto} href={e.href} />
              ))}
            </ul>
          </div>
        )}

        {resposta.interpretacao && (
          <div className="mt-3">
            <span className="eyebrow">Interpretação</span>
            <p className="mt-1 text-sm text-text-secondary">{resposta.interpretacao}</p>
          </div>
        )}

        {resposta.ressalvas && (
          <div className="mt-3">
            <span className="eyebrow">Ressalvas</span>
            <p className="mt-1 text-sm text-text-muted">{resposta.ressalvas}</p>
          </div>
        )}

        {resposta.acoesPossiveis.length > 0 && (
          <div className="mt-3">
            <span className="eyebrow">Ações possíveis</span>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-text-secondary">
              {resposta.acoesPossiveis.map((a, i) => (
                <ItemLista key={i} texto={a.texto} href={a.href} />
              ))}
            </ul>
          </div>
        )}

        {resposta.aprofundamento && <p className="mt-3 text-sm italic text-text-muted">{resposta.aprofundamento}</p>}

        {resposta.rascunhoAcao && (
          <RascunhoCard rascunho={resposta.rascunhoAcao} resolvido={rascunhoResolvido} onResolvido={onRascunhoResolvido} />
        )}
      </Card>
    </div>
  );
}

export interface ConsultantScreenProps {
  conversaIdInicial: string | null;
  mensagensIniciais: MensagemConsultor[];
}

export function ConsultantScreen({ conversaIdInicial, mensagensIniciais }: ConsultantScreenProps) {
  const [conversaId, setConversaId] = useState<string | null>(conversaIdInicial);
  const [mensagens, setMensagens] = useState<MensagemConsultor[]>(mensagensIniciais);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [rascunhosResolvidos, setRascunhosResolvidos] = useState<Set<string>>(new Set());

  async function handleEnviar() {
    const perguntaTexto = texto.trim();
    if (!perguntaTexto || enviando) return;
    setErro(null);
    setEnviando(true);
    setTexto("");
    try {
      const resultado = await enviarPergunta(conversaId, perguntaTexto);
      setConversaId(resultado.conversaId);
      setMensagens((prev) => [...prev, resultado.mensagemUsuario, resultado.mensagemConsultor]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar a pergunta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <MessageCircle size={20} className="text-text-muted" strokeWidth={1.75} />
        <h1 className="text-xl font-semibold text-text-primary">Consultor</h1>
      </div>
      <p className="text-sm text-text-muted">
        Pergunte sobre total por categoria, comparação entre períodos, maiores despesas, resumo de uma competência já fechada — ou
        peça pra criar uma meta, ajustar uma meta existente, anotar um gasto provisório, ou corrigir a categoria de um lançamento
        específico (sempre como rascunho, confirmado por você). Fora desse escopo (inclusive quebra de gasto por pessoa), o
        Consultor reconhece a limitação em vez de inventar.
      </p>

      <Card className="flex min-h-[320px] flex-col gap-3">
        {mensagens.length === 0 ? (
          <p className="text-base text-text-muted">Nenhuma pergunta ainda nesta sessão.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {mensagens.map((m) =>
              m.autor === "usuario" ? (
                <BolhaUsuario key={m.id} mensagem={m} />
              ) : (
                <BolhaConsultor
                  key={m.id}
                  mensagem={m}
                  rascunhoResolvido={rascunhosResolvidos.has(m.id)}
                  onRascunhoResolvido={() => setRascunhosResolvidos((prev) => new Set(prev).add(m.id))}
                />
              ),
            )}
          </div>
        )}
      </Card>

      {erro && <p className="text-sm text-state-danger">{erro}</p>}

      <div className="flex items-end gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleEnviar();
            }
          }}
          disabled={enviando}
          placeholder="Ex.: Quanto gastamos em Alimentação em junho? Ou: cria uma meta de R$500 em Lazer."
          rows={2}
          className="flex-1 resize-none rounded-input border border-border-default bg-surface-primary px-3 py-2 text-base text-text-primary placeholder:text-text-placeholder outline-none transition-shadow duration-150 focus:border-action-primary focus:shadow-[0_0_0_3px_rgb(74_108_247_/_0.15)]"
        />
        <Button variant="primary" onClick={handleEnviar} disabled={enviando || !texto.trim()} icon={<Send size={14} />}>
          {enviando ? "Enviando…" : "Enviar"}
        </Button>
      </div>
    </div>
  );
}
