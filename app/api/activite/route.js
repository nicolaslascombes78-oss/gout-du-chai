import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadActivity } from "@/lib/activite";

export const dynamic = "force-dynamic";

// Date du dernier événement du fil « Au club », pour le point de la cloche.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ latest: null });
  try {
    const { latest } = await loadActivity();
    return NextResponse.json({ latest });
  } catch {
    return NextResponse.json({ latest: null });
  }
}
