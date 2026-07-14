import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Healthcheck real (BE-1): confirma que a aplicação está no ar e o banco responde. */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("usuarios").select("id", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: e instanceof Error ? e.message : "erro desconhecido" },
      { status: 503 },
    );
  }
}
