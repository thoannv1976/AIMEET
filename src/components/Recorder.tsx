"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  onTranscript: (text: string) => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

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

  const recRef = useRef<any>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const startedAt = useRef<number>(0);
  const [duration, setDuration] = useState(0);

  // Detect browser support for Web Speech API on mount.
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

  // Tick the timer while recording.
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = pickMediaRecorder(stream);
      audioChunks.current = [];
      mr.ondataavailable = (e) => e.data.size && audioChunks.current.push(e.data);
      mr.onstop = () => {
        const type = mr.mimeType || "audio/webm";
        const blob = new Blob(audioChunks.current, { type });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(1000);
      mediaRef.current = mr;
    } catch (err: any) {
      setUploadError(`Không truy cập được microphone: ${err?.message || err}`);
      return;
    }

    if (recRef.current) {
      recRef.current._wantOn = true;
      try {
        recRef.current.start();
      } catch {}
    }
    startedAt.current = Date.now();
    setDuration(0);
    setRecording(true);
  }

  function stop() {
    if (recRef.current) {
      recRef.current._wantOn = false;
      try {
        recRef.current.stop();
      } catch {}
    }
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      try {
        mediaRef.current.stop();
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
  }

  async function transcribeOnServer() {
    if (!audioBlob) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("audio", audioBlob, `recording.${(audioBlob.type.split("/")[1] || "webm").split(";")[0]}`);
      const r = await fetch(`/api/transcribe?lang=${encodeURIComponent(lang)}`, {
        method: "POST",
        body: form,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      const t = (data.transcript || "").trim();
      if (!t) throw new Error("Không nhận dạng được nội dung. Hãy thử ghi âm rõ hơn.");
      const merged = text ? `${text}\n${t}` : t;
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
          Trình duyệt không hỗ trợ chuyển giọng nói thành văn bản trực tiếp (Safari iOS / Firefox).
          Bạn vẫn có thể <strong>ghi âm bình thường</strong> rồi bấm <em>"Chuyển audio thành văn bản"</em>{" "}
          để server xử lý bằng Google Cloud Speech-to-Text.
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
            <p className="text-sm text-red-600">⚠ {uploadError}</p>
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
