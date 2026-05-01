"use client";
import { useEffect, useState } from "react";
import Recorder from "@/components/Recorder";
import ReminderBanner from "@/components/ReminderBanner";

type Stats = { total: number; done: number; in_progress: number; todo: number; overdue: number };

export default function HomePage() {
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  async function loadStats() {
    const r = await fetch("/api/tasks");
    if (!r.ok) return;
    const { items } = await r.json();
    const today = new Date().toISOString().slice(0, 10);
    const stats = {
      total: items.length,
      done: items.filter((t: any) => t.status === "done").length,
      in_progress: items.filter((t: any) => t.status === "in_progress").length,
      todo: items.filter((t: any) => t.status === "todo").length,
      overdue: items.filter(
        (t: any) => t.dueDate && t.status !== "done" && t.status !== "cancelled" && t.dueDate < today,
      ).length,
    };
    setStats(stats);
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function processMeeting() {
    if (!transcript.trim()) {
      alert("Hãy ghi âm hoặc dán transcript trước.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, transcript, date: new Date().toISOString() }),
      });
      const text = await r.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // Non-JSON body (e.g. proxy timeout HTML) — surface raw text.
      }
      if (!r.ok) {
        const detail = data?.detail ? ` (${data.detail})` : "";
        const msg = data?.error || text?.slice(0, 300) || `HTTP ${r.status}`;
        throw new Error(`${msg}${detail}`);
      }
      if (!data) throw new Error("Server trả về phản hồi rỗng — có thể request bị timeout. Thử lại với transcript ngắn hơn.");
      setResult(data);
      loadStats();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <ReminderBanner />

      <section>
        <h1 className="text-2xl font-bold mb-1">Ghi âm cuộc họp & trích xuất công việc</h1>
        <p className="text-slate-600 text-sm">
          AI sẽ tự động tạo bản tóm tắt và danh sách công việc từ transcript. Dữ liệu được lưu trên Firebase.
        </p>
      </section>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Tổng" value={stats.total} color="bg-slate-100" />
          <Stat label="Chưa làm" value={stats.todo} color="bg-slate-100" />
          <Stat label="Đang làm" value={stats.in_progress} color="bg-blue-100" />
          <Stat label="Hoàn thành" value={stats.done} color="bg-green-100" />
          <Stat label="Quá hạn" value={stats.overdue} color="bg-red-100" />
        </div>
      )}

      <section className="card p-4">
        <label className="label">Tiêu đề cuộc họp</label>
        <input
          className="input mb-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Họp giao ban thứ 2..."
        />
        <Recorder onTranscript={setTranscript} />
        <div className="flex justify-end mt-3 gap-2">
          <a href="/tasks" className="btn-secondary">
            Xem danh sách công việc
          </a>
          <button className="btn-primary" onClick={processMeeting} disabled={busy || !transcript.trim()}>
            {busy ? "Đang xử lý bằng AI..." : "🪄 Tạo công việc bằng AI"}
          </button>
        </div>
      </section>

      {result && (
        <section className="card p-4">
          <h3 className="font-semibold mb-2">✅ Đã xử lý</h3>
          <p className="text-sm text-slate-600 mb-2">
            Đã tạo <strong>{result.taskCount}</strong> công việc.
          </p>
          <div className="bg-slate-50 rounded p-3 text-sm whitespace-pre-wrap">{result.summary}</div>
          <div className="mt-3 flex gap-2">
            <a className="btn-primary" href={`/meetings/${result.id}`}>
              Mở cuộc họp
            </a>
            <a className="btn-secondary" href="/tasks">
              Xem công việc
            </a>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg p-3 ${color}`}>
      <div className="text-xs text-slate-600">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
