import { NextRequest, NextResponse } from "next/server";
import { polishTranscript } from "@/lib/polish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST /api/polish
//   body: { text: string, hint?: string }
//   → { polished: string, raw: string }
export async function POST(req: NextRequest) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const text = String(body?.text || "").slice(0, 12000);
  const hint = body?.hint ? String(body.hint).slice(0, 4000) : undefined;
  if (!text.trim()) {
    return NextResponse.json({ error: "Field 'text' is required" }, { status: 400 });
  }

  try {
    const polished = await polishTranscript(text, hint);
    return NextResponse.json({ polished, raw: text });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Polish failed", detail: String(e?.message || e) },
      { status: 500 },
    );
  }
}
