import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback de confirmação de e-mail (cadastro) e outros fluxos de OTP do
 * Supabase Auth. Sem esta rota, o link do e-mail de confirmação volta para
 * o app sem nunca trocar o código/token por uma sessão de verdade — a
 * página fica "carregando" porque o proxy nunca encontra usuário
 * autenticado. Aceita tanto o formato mais novo (token_hash + type) quanto
 * o formato PKCE (code), dependendo de como o template de e-mail do
 * projeto Supabase está configurado.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/entrar?erro=confirmacao", request.url));
}
