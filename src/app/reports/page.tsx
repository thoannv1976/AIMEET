"use client";
import { useEffect, useState } from "react";

export default function ReportsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [periodLabel, setPeriodLabel] = useState("Tuần này");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/reports");
    const { items } = await r.json();
    setItems(items);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function generate() {
    setBusy(true);
    try {
      const r = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, periodLabel }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Lỗi");
      setTitle("");
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Xoá báo cáo?")) return;
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Báo cáo công việc</h1>
      </div>

      <section className="card p-4">
        <h3 className="font-semibold mb-2">🪄 Tạo báo cáo bằng AI</h3>
        <p className="text-sm text-slate-600 mb-3">
          AI sẽ tổng hợp toàn bộ công việc trong hệ thống thành một báo cáo có cấu trúc.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Tiêu đề</label>
            <input
              className="input"
              placeholder="Báo cáo tuần 18"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Kỳ báo cáo</label>
            <input
              className="input"
              placeholder="Tuần này / Tháng 5/2026..."
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <button className="btn-primary" onClick={generate} disabled={busy}>
            {busy ? "Đang tổng hợp..." : "Tạo báo cáo"}
          </button>
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Báo cáo đã lưu</h3>
        {loading ? (
          <p>Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500">Chưa có báo cáo.</p>
        ) : (
          <div className="space-y-2">
            {items.map((r) => (
              <div key={r.id} className="card p-4 flex items-start justify-between gap-3">
                <div>
                  <a href={`/reports/${r.id}`} className="font-semibold hover:text-brand-600">
                    {r.title}
                  </a>
                  <div className="text-xs text-slate-500">
                    {new Date(r.createdAt).toLocaleString("vi-VN")} · {r.periodLabel || "—"}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a className="btn-secondary text-xs" href={`/api/reports/${r.id}/download?format=docx`}>
                    DOCX
                  </a>
                  <a className="btn-secondary text-xs" href={`/api/reports/${r.id}/download?format=pdf`}>
                    PDF
                  </a>
                  <button className="btn-secondary text-xs text-red-600" onClick={() => del(r.id)}>
                    Xoá
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
