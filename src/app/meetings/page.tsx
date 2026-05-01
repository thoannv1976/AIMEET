"use client";
import { useEffect, useState } from "react";

export default function MeetingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/meetings");
      const { items } = await r.json();
      setItems(items);
      setLoading(false);
    })();
  }, []);

  async function del(id: string) {
    if (!confirm("Xoá cuộc họp?")) return;
    await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    setItems((cur) => cur.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cuộc họp đã ghi</h1>
        <a className="btn-primary" href="/">
          + Ghi cuộc họp mới
        </a>
      </div>
      {loading ? (
        <p>Đang tải...</p>
      ) : items.length === 0 ? (
        <p className="text-slate-500">Chưa có cuộc họp nào.</p>
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <div key={m.id} className="card p-4 flex items-start justify-between gap-3">
              <div>
                <a href={`/meetings/${m.id}`} className="font-semibold hover:text-brand-600">
                  {m.title}
                </a>
                <div className="text-xs text-slate-500">
                  {new Date(m.date).toLocaleString("vi-VN")} · {(m.taskIds || []).length} công việc
                </div>
                {m.summary && <p className="text-sm text-slate-700 mt-2 line-clamp-2">{m.summary}</p>}
              </div>
              <button className="btn-secondary text-red-600" onClick={() => del(m.id)}>
                Xoá
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
