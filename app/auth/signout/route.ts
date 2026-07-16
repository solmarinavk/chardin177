import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cierra la sesión y regresa al login.
export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
