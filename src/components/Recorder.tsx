"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  onTranscript: (text: string) => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
    webkitAudioContext?: typeof AudioContext;
  }
}

// How often to run the cumulative live-transcription loop (ms). The actual
// upload+inference takes ~3-8s on chirp_2, so we space requests to avoid
// stacking. The first poll fires after this delay (i.e. nothing happens
// during the first 9s of recording).
const LIVE_INTERVAL_MS = 9000;

export default function Recorder({ onTranscript }: Props) {
  const [supportsLiveSTT, setSupportsLiveSTT] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [text, setText] = useState("");
  const [lang, setLang] = useState("vi-VN");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [livePending, setLivePending] = useState(false);

  const recRef = useRef<any>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const startedAt = useRef<number>(0);
  const liveLoopActive = useRef<boolean>(false);
  const liveBaseText = useRef<string>("");
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const SR = (typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)) as any;
    setSupportsLiveSTT(!!SR);
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    rec.onresult = (ev: any) => {
      let finalAdd = "";
      let interimText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalAdd += r[0].transcript + " ";
        else interimText += r[0].transcript;
      }
      if (finalAdd) {
        setText((t) => {
          const next = (t + " " + finalAdd).trim();
          onTranscript(next);
          return next;
        });
      }
      setInterim(interimText);
    };
    rec.onerror = () => {};
    rec.onend = () => {
      if (recRef.current?._wantOn) {
        try {
          rec.start();
        } catch {}
      } else setRecording(false);
    };
    recRef.current = rec;
  }, [lang]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      setDuration(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [recording]);

  async function start() {
    setUploadError(null);
    setAudioBlob(null);
    setAudioUrl(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Browser-side cleanup helps STT enormously, especially on phones.
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          // Browsers may ignore this hint; we always re-encode to 16 kHz
          // before sending to STT, so this is just an upper bound.
          sampleRate: 48000,
        } as MediaTrackConstraints,
      });
    } catch (err: any) {
      setUploadError(`Không truy cập được microphone: ${err?.message || err}`);
      return;
    }

    const mr = pickMediaRecorder(stream);
    audioChunks.current = [];
    mr.ondataavailable = (e) => {
      if (e.data && e.data.size) audioChunks.current.push(e.data);
    };
    mr.onstop = () => {
      const type = mr.mimeType || "audio/webm";
      const blob = new Blob(audioChunks.current, { type });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach((t) => t.stop());
    };
    // We need data emissions during recording so the live-STT loop can read
    // a partial blob, but we still want a complete final blob on stop. A
    // 1-second timeslice does both (each chunk is a valid container fragment;
    // concatenated they form a valid file).
    mr.start(supportsLiveSTT ? undefined : 1000);
    mediaRef.current = mr;

    if (recRef.current) {
      recRef.current._wantOn = true;
      try {
        recRef.current.start();
      } catch {}
    }
    startedAt.current = Date.now();
    setDuration(0);
    setRecording(true);

    // If the browser has no Web Speech API (iOS Safari, Firefox), kick off a
    // background loop that periodically uploads the audio so far and shows
    // the latest transcript — giving live-feel feedback.
    if (supportsLiveSTT === false) {
      liveBaseText.current = text; // preserve any text typed/pasted before
      liveLoopActive.current = true;
      runLiveLoop().catch(() => {});
    }
  }

  function stop() {
    liveLoopActive.current = false;
    if (recRef.current) {
      recRef.current._wantOn = false;
      try {
        recRef.current.stop();
      } catch {}
    }
    const mr = mediaRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        (mr as any).requestData?.();
      } catch {}
      try {
        mr.stop();
      } catch {}
    }
    setRecording(false);
  }

  function clearAll() {
    setText("");
    setInterim("");
    onTranscript("");
    setAudioBlob(null);
    setAudioUrl(null);
    setUploadError(null);
    setDuration(0);
    liveBaseText.current = "";
  }

  // Cumulative live STT: every LIVE_INTERVAL_MS, snapshot the audio so far,
  // encode to WAV, upload, replace the live-portion of the textarea with
  // whatever the server returns. We always re-send the full audio so the
  // model has full context (Google STT does not stitch chunks well).
  async function runLiveLoop() {
    let lastFireAt = Date.now();
    while (liveLoopActive.current) {
      const elapsed = Date.now() - lastFireAt;
      const wait = Math.max(200, LIVE_INTERVAL_MS - elapsed);
      await sleep(wait);
      if (!liveLoopActive.current) break;
      lastFireAt = Date.now();

      const mr = mediaRef.current;
      if (!mr || mr.state === "inactive") continue;
      if (audioChunks.current.length === 0) continue;

      // Ask MediaRecorder to flush the latest buffered frames into a chunk.
      try {
        (mr as any).requestData?.();
      } catch {}
      // Give the dataavailable event a moment to land.
      await sleep(150);

      const snapshot = audioChunks.current.slice();
      if (snapshot.length === 0) continue;
      const blob = new Blob(snapshot, { type: mr.mimeType || "audio/webm" });

      try {
        setLivePending(true);
        const wav = await encodeBlobToWav(blob, 16000);
        const form = new FormData();
        form.append("audio", wav, "live.wav");
        const r = await fetch(`/api/transcribe?lang=${encodeURIComponent(lang)}`, {
          method: "POST",
          body: form,
        });
        if (!r.ok) continue;
        const data = await r.json().catch(() => null);
        const transcript = (data?.transcript || "").trim();
        if (!transcript) continue;
        const merged = liveBaseText.current.trim()
          ? `${liveBaseText.current.trim()}\n${transcript}`
          : transcript;
        setText(merged);
        onTranscript(merged);
      } catch {
        // Swallow — best-effort live mode. Final transcribe button will
        // give the canonical result on stop.
      } finally {
        setLivePending(false);
      }
    }
  }

  async function transcribeOnServer() {
    if (!audioBlob) return;
    setUploading(true);
    setUploadError(null);
    try {
      const wav = await encodeBlobToWav(audioBlob, 16000);
      const form = new FormData();
      form.append("audio", wav, "recording.wav");

      const r = await fetch(`/api/transcribe?lang=${encodeURIComponent(lang)}`, {
        method: "POST",
        body: form,
      });
      const raw = await r.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {}
      if (!r.ok) {
        const detail = data?.detail ? ` — ${data.detail}` : "";
        throw new Error((data?.error || `HTTP ${r.status}`) + detail);
      }
      const t = (data?.transcript || "").trim();
      if (!t) {
        throw new Error("Không nhận dạng được nội dung. Hãy ghi âm gần micro hơn hoặc nói rõ hơn.");
      }
      // Replace any live-loop text with the high-quality final result.
      const base = liveBaseText.current.trim();
      const merged = base ? `${base}\n${t}` : t;
      setText(merged);
      onTranscript(merged);
    } catch (e: any) {
      setUploadError(e.message || "Lỗi gửi audio");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card p-3 sm:p-4">
      <div className="flex flex-wrap items-end gap-2 sm:gap-3 mb-3">
        <div className="grow sm:grow-0">
          <label className="label">Ngôn ngữ</label>
          <select
            className="input"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            disabled={recording}
          >
            <option value="vi-VN">Tiếng Việt</option>
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="ja-JP">日本語</option>
          </select>
        </div>
        <div className="hidden sm:block flex-1" />
        <div className="flex items-center gap-2 ml-auto">
          {recording && (
            <span className="inline-flex items-center gap-1 text-red-600 text-sm font-mono tabular-nums">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              {formatDuration(duration)}
              {livePending && <span className="ml-2 text-slate-500 text-xs">đang nhận dạng…</span>}
            </span>
          )}
          {!recording ? (
            <button className="btn-primary !px-4 !py-2.5 text-base" onClick={start}>
              ● Bắt đầu ghi
            </button>
          ) : (
            <button className="btn-danger !px-4 !py-2.5 text-base" onClick={stop}>
              ■ Dừng
            </button>
          )}
          <button className="btn-secondary !px-3 !py-2.5" onClick={clearAll} disabled={recording || uploading}>
            Xoá
          </button>
        </div>
      </div>

      {supportsLiveSTT === false && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded p-2 mb-3">
          Trình duyệt không hỗ trợ chuyển giọng nói thành văn bản trực tiếp.
          App sẽ <strong>tự động cập nhật</strong> transcript mỗi vài giây trong khi bạn ghi
          âm bằng Google Cloud Speech-to-Text. Khi bấm <em>Dừng</em>, có thể bấm
          <em> "Chuyển audio → văn bản"</em> để chạy lại lần cuối với chất lượng cao nhất.
        </div>
      )}

      <div>
        <label className="label">Transcript (có thể chỉnh sửa)</label>
        <textarea
          className="input min-h-[160px] sm:min-h-[180px] font-mono text-sm"
          value={text + (interim ? ` ${interim}` : "")}
          onChange={(e) => {
            setText(e.target.value);
            setInterim("");
            onTranscript(e.target.value);
            // User typed manually — abandon the live-base anchor so future
            // live updates don't overwrite their edit.
            liveBaseText.current = e.target.value;
          }}
          placeholder="Bắt đầu ghi để nhận dạng giọng nói, hoặc dán transcript có sẵn vào đây..."
        />
      </div>

      {audioUrl && (
        <div className="mt-3 space-y-2">
          <label className="label">Bản ghi âm</label>
          <audio controls src={audioUrl} className="w-full" />
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary text-sm"
              onClick={transcribeOnServer}
              disabled={uploading || !audioBlob}
            >
              {uploading
                ? "⏳ Đang chuyển audio…"
                : supportsLiveSTT
                  ? "🪄 Chuyển audio → văn bản (chính xác hơn)"
                  : "🪄 Chuyển audio → văn bản"}
            </button>
            <a
              className="btn-secondary text-sm"
              href={audioUrl}
              download={`aimeet-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`}
            >
              ⬇ Tải file audio
            </a>
          </div>
          {uploadError && (
            <p className="text-sm text-red-600 break-words">⚠ {uploadError}</p>
          )}
        </div>
      )}
    </div>
  );
}

function pickMediaRecorder(stream: MediaStream): MediaRecorder {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && (MediaRecorder as any).isTypeSupported?.(type)) {
      try {
        return new MediaRecorder(stream, { mimeType: type });
      } catch {}
    }
  }
  return new MediaRecorder(stream);
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function encodeBlobToWav(blob: Blob, targetRate = 16000): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const Ctx: typeof AudioContext =
    (window.AudioContext || window.webkitAudioContext) as any;
  if (!Ctx) throw new Error("Trình duyệt không hỗ trợ Web Audio API.");
  const audioCtx = new Ctx();
  let decoded: AudioBuffer;
  try {
    decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  } catch (e: any) {
    throw new Error("Không decode được audio: " + (e?.message || e));
  } finally {
    try {
      audioCtx.close();
    } catch {}
  }

  const length = Math.max(1, Math.ceil(decoded.duration * targetRate));
  const offline = new OfflineAudioContext(1, length, targetRate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();

  const samples = rendered.getChannelData(0);
  return wavBlobFromSamples(samples, targetRate);
}

function wavBlobFromSamples(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * blockAlign;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  let p = 0;
  const writeStr = (s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(p++, s.charCodeAt(i));
  };
  writeStr("RIFF");
  v.setUint32(p, 36 + dataSize, true); p += 4;
  writeStr("WAVE");
  writeStr("fmt ");
  v.setUint32(p, 16, true); p += 4;
  v.setUint16(p, 1, true); p += 2;
  v.setUint16(p, numChannels, true); p += 2;
  v.setUint32(p, sampleRate, true); p += 4;
  v.setUint32(p, byteRate, true); p += 4;
  v.setUint16(p, blockAlign, true); p += 2;
  v.setUint16(p, bitsPerSample, true); p += 2;
  writeStr("data");
  v.setUint32(p, dataSize, true); p += 4;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    p += 2;
  }
  return new Blob([buf], { type: "audio/wav" });
}
