import { NextRequest, NextResponse } from "next/server";
import { COL, getDb } from "@/lib/firebase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: list tasks that are due now (used by frontend polling) or by scheduler
// Returns tasks with reminderAt <= now and not yet reminded, plus overdue tasks.
export async function GET(req: NextRequest) {
  const db = getDb();
  const now = new Date();
  const url = new URL(req.url);
  const markRead = url.searchParams.get("ack") === "1";

  const snap = await db.collection(COL.tasks).limit(500).get();
  const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  const due = all.filter((t) => {
    if (t.status === "done" || t.status === "cancelled") return false;
    if (t.reminded) return false;
    if (!t.reminderAt) return false;
    return new Date(t.reminderAt).getTime() <= now.getTime();
  });

  const overdue = all.filter((t) => {
    if (t.status === "done" || t.status === "cancelled") return false;
    if (!t.dueDate) return false;
    return new Date(`${t.dueDate}T23:59:59Z`).getTime() < now.getTime();
  });

  if (markRead && due.length) {
    const batch = db.batch();
    for (const t of due) batch.set(db.collection(COL.tasks).doc(t.id), { reminded: true }, { merge: true });
    await batch.commit();
  }

  return NextResponse.json({ due, overdue });
}
