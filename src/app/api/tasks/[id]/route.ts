import { NextRequest, NextResponse } from "next/server";
import { COL, getDb } from "@/lib/firebase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = [
  "title",
  "description",
  "assignee",
  "dueDate",
  "priority",
  "status",
  "progress",
  "reminderAt",
  "reminded",
  "meetingId",
];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const doc = await db.collection(COL.tasks).doc(params.id).get();
  if (!doc.exists) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const update: Record<string, any> = { updatedAt: new Date().toISOString() };
  for (const k of ALLOWED) if (k in body) update[k] = body[k];
  if (typeof update.progress === "number") {
    update.progress = Math.max(0, Math.min(100, update.progress));
    if (update.progress >= 100 && !update.status) update.status = "done";
  }
  const db = getDb();
  await db.collection(COL.tasks).doc(params.id).set(update, { merge: true });
  const fresh = await db.collection(COL.tasks).doc(params.id).get();
  return NextResponse.json({ id: fresh.id, ...fresh.data() });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  await db.collection(COL.tasks).doc(params.id).delete();
  return NextResponse.json({ ok: true });
}
