import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const ROTA_LOGIN = "/entrar";

/**
 * Renova a sessão do Supabase Auth a cada requisição e protege as rotas da
 * aplicação — sem sessão válida, redireciona para /entrar. Substitui a
 * sessão simulada da Etapa 1 (ver docs/CONSTRUCTION-PLAN.md, fase BE-1).
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isRotaLogin = request.nextUrl.pathname.startsWith(ROTA_LOGIN);

  if (!user && !isRotaLogin) {
    const url = request.nextUrl.clone();
    url.pathname = ROTA_LOGIN;
    return NextResponse.redirect(url);
  }

  if (user && isRotaLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
