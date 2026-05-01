"use client";
import { useEffect, useMemo, useState } from "react";
import TaskItem from "@/components/TaskItem";

type Task = any;

export default function TasksPage() {
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    assignee: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  async function load() {
    setLoading(true);
    const r = await fetch("/api/tasks");
    const { items } = await r.json();
    setItems(items);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== "all") list = list.filter((t) => t.status === filter);
    if (filter === "overdue") {
      const today = new Date().toISOString().slice(0, 10);
      list = items.filter(
        (t) => t.dueDate && t.status !== "done" && t.status !== "cancelled" && t.dueDate < today,
      );
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.title || "").toLowerCase().includes(s) ||
          (t.assignee || "").toLowerCase().includes(s) ||
          (t.description || "").toLowerCase().includes(s),
      );
    }
    return list;
  }, [items, filter, search]);

  async function createTask() {
    if (!draft.title.trim()) return;
    const r = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (r.ok) {
      setDraft({ title: "", description: "", assignee: "", dueDate: "", priority: "medium" });
      setCreating(false);
      load();
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("Xoá công việc này?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    load();
  }

  function updateInList(t: Task) {
    setItems((cur) => cur.map((x) => (x.id === t.id ? t : x)));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Công việc</h1>
        <button className="btn-primary" onClick={() => setCreating((v) => !v)}>
          {creating ? "Đóng" : "+ Tạo công việc"}
        </button>
      </div>

      {creating && (
        <div className="card p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="label">Tiêu đề *</label>
            <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Mô tả</label>
            <textarea
              className="input min-h-[60px]"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Phụ trách</label>
            <input className="input" value={draft.assignee} onChange={(e) => setDraft({ ...draft, assignee: e.target.value })} />
          </div>
          <div>
            <label className="label">Hạn</label>
            <input
              type="date"
              className="input"
              value={draft.dueDate}
              onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Ưu tiên</label>
            <select className="input" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as any })}>
              <option value="low">Thấp</option>
              <option value="medium">Trung bình</option>
              <option value="high">Cao</option>
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button className="btn-primary" onClick={createTask}>
              Lưu
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Lọc</label>
          <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="todo">Chưa làm</option>
            <option value="in_progress">Đang làm</option>
            <option value="done">Hoàn thành</option>
            <option value="cancelled">Đã huỷ</option>
            <option value="overdue">Quá hạn</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="label">Tìm kiếm</label>
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tiêu đề, phụ trách..." />
        </div>
      </div>

      {loading ? (
        <p>Đang tải...</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500">Chưa có công việc nào.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <TaskItem key={t.id} task={t} onChange={updateInList} onDelete={() => deleteTask(t.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
