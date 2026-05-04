import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/stt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/transcribe
//   - multipart/form-data with field "audio" (preferred from <input type=file>)
//   - or raw audio body with Content-Type: audio/webm | audio/ogg | audio/mp3 | audio/wav
//   - optional ?lang=vi-VN (default vi-VN)
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") || "vi-VN";
  const ct = req.headers.get("content-type") || "";

  let audio: Buffer | null = null;
  let mime = "audio/webm";

  try {
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("audio");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Field 'audio' is required" }, { status: 400 });
      }
      audio = Buffer.from(await file.arrayBuffer());
      mime = file.type || "audio/webm";
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

  // Reject huge uploads to keep memory bounded — App Hosting tier has 1 GiB RAM.
  if (audio.byteLength > 25 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Audio too large (>25 MiB). Split the recording or use Google Cloud Storage URI." },
      { status: 413 },
    );
  }

  try {
    const transcript = await transcribeAudio(audio, mime, lang);
    return NextResponse.json({ transcript, lang, bytes: audio.byteLength });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Transcription failed", detail: String(e?.message || e) },
      { status: 500 },
    );
  }
}
