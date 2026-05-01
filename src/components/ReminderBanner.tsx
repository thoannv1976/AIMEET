"use client";
import { useEffect, useState } from "react";

type Task = { id: string; title: string; dueDate?: string; reminderAt?: string };

export default function ReminderBanner() {
  const [due, setDue] = useState<Task[]>([]);
  const [overdue, setOverdue] = useState<Task[]>([]);

  async function load(ack: boolean) {
    const r = await fetch(`/api/reminders${ack ? "?ack=1" : ""}`);
    if (!r.ok) return;
    const data = await r.json();
    setDue(data.due || []);
    setOverdue(data.overdue || []);
  }

  useEffect(() => {
    load(false);
    const id = setInterval(() => load(false), 60_000);
    return () => clearInterval(id);
  }, []);

  if (due.length === 0 && overdue.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {due.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-md p-3 text-sm">
          <div className="flex items-center justify-between">
            <strong className="text-amber-800">🔔 Đến giờ nhắc {due.length} công việc</strong>
            <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => load(true)}>
              Đã xem
            </button>
          </div>
          <ul className="list-disc ml-5 mt-1 text-amber-900">
            {due.slice(0, 5).map((t) => (
              <li key={t.id}>
                <a href="/tasks" className="underline">
                  {t.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-md p-3 text-sm">
          <strong className="text-red-800">⚠️ {overdue.length} công việc đã quá hạn</strong>
          <ul className="list-disc ml-5 mt-1 text-red-900">
            {overdue.slice(0, 5).map((t) => (
              <li key={t.id}>
                <a href="/tasks" className="underline">
                  {t.title}
                </a>{" "}
                <span className="text-xs">(hạn {t.dueDate})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
