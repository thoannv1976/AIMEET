import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/stt";
import { polishTranscript } from "@/lib/polish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/transcribe
//   - multipart/form-data with field "audio" (preferred) and optional "hint"
//     (text to feed Claude as supplementary context — typically the live
//      Web Speech transcript).
//   - or raw audio body with Content-Type: audio/webm | audio/ogg | audio/mp3 | audio/wav
//   - query: ?lang=vi-VN (default), ?polish=0 to skip Claude post-processing
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") || "vi-VN";
  const polishOn = url.searchParams.get("polish") !== "0";
  const ct = req.headers.get("content-type") || "";

  let audio: Buffer | null = null;
  let mime = "audio/webm";
  let hint = "";

  try {
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("audio");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Field 'audio' is required" }, { status: 400 });
      }
      audio = Buffer.from(await file.arrayBuffer());
      mime = file.type || "audio/webm";
      const h = form.get("hint");
      if (typeof h === "string") hint = h;
    } else if (ct.startsWith("audio/")) {
      audio = Buffer.from(await req.arrayBuffer());
      mime = ct;
    } else {
      return NextResponse.json(
        { error: "Expecting multipart/form-data with 'audio' field, or raw audio/* body" },
        { status: 400 },
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: "Cannot read audio body", detail: String(e?.message || e) },
      { status: 400 },
    );
  }

  if (!audio || audio.byteLength < 1024) {
    return NextResponse.json({ error: "Audio is empty or too short" }, { status: 400 });
  }
  if (audio.byteLength > 25 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Audio too large (>25 MiB). Split the recording or use Google Cloud Storage URI." },
      { status: 413 },
    );
  }

  let raw = "";
  try {
    raw = await transcribeAudio(audio, mime, lang);
  } catch (e: any) {
    return NextResponse.json(
      { error: "Transcription failed", detail: String(e?.message || e) },
      { status: 500 },
    );
  }

  let transcript = raw;
  let polished = false;
  if (polishOn && raw.trim()) {
    try {
      const p = await polishTranscript(raw, hint || undefined);
      if (p && p !== raw) {
        transcript = p;
        polished = true;
      }
    } catch (e: any) {
      // Fall back silently to raw STT output if Claude polish fails.
      console.warn("[polish] failed, returning raw STT:", e?.message || e);
    }
  }

  return NextResponse.json({
    transcript,
    raw,
    polished,
    lang,
    bytes: audio.byteLength,
  });
}
