"use client";
import { useEffect, useState } from "react";
import TaskItem from "@/components/TaskItem";

export default function MeetingDetailPage({ params }: { params: { id: string } }) {
  const [meeting, setMeeting] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r1 = await fetch(`/api/meetings/${params.id}`);
    if (r1.ok) setMeeting(await r1.json());
    const r2 = await fetch(`/api/tasks?meetingId=${params.id}`);
    if (r2.ok) setTasks((await r2.json()).items);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  if (loading) return <p>Đang tải...</p>;
  if (!meeting) return <p>Không tìm thấy cuộc họp.</p>;

  return (
    <div className="space-y-4">
      <div>
        <a href="/meetings" className="text-sm text-brand-600 hover:underline">
          ← Tất cả cuộc họp
        </a>
        <h1 className="text-2xl font-bold mt-1">{meeting.title}</h1>
        <div className="text-xs text-slate-500">{new Date(meeting.date).toLocaleString("vi-VN")}</div>
      </div>

      <section className="card p-4">
        <h3 className="font-semibold mb-2">Tóm tắt</h3>
        <p className="text-sm whitespace-pre-wrap">{meeting.summary}</p>
      </section>

      <section className="card p-4">
        <h3 className="font-semibold mb-2">Transcript</h3>
        <pre className="text-xs whitespace-pre-wrap bg-slate-50 rounded p-3 max-h-64 overflow-auto">
          {meeting.transcript}
        </pre>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Công việc ({tasks.length})</h3>
        {tasks.length === 0 ? (
          <p className="text-slate-500">Không có công việc.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onChange={(nt) => setTasks((cur) => cur.map((x) => (x.id === nt.id ? nt : x)))}
                onDelete={async () => {
                  if (!confirm("Xoá công việc?")) return;
                  await fetch(`/api/tasks/${t.id}`, { method: "DELETE" });
                  setTasks((cur) => cur.filter((x) => x.id !== t.id));
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
