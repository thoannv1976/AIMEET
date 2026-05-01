import { NextRequest, NextResponse } from "next/server";
import { COL, getDb } from "@/lib/firebase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const doc = await db.collection(COL.meetings).doc(params.id).get();
  if (!doc.exists) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const db = getDb();
  const allowed = ["title", "date", "summary", "transcript"];
  const update: Record<string, any> = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }
  await db.collection(COL.meetings).doc(params.id).set(update, { merge: true });
  const fresh = await db.collection(COL.meetings).doc(params.id).get();
  return NextResponse.json({ id: fresh.id, ...fresh.data() });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const url = new URL(req.url);
  const cascade = url.searchParams.get("cascade") !== "0"; // default: delete linked tasks too

  if (cascade) {
    const taskSnap = await db.collection(COL.tasks).where("meetingId", "==", params.id).get();
    if (!taskSnap.empty) {
      const batch = db.batch();
      taskSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(db.collection(COL.meetings).doc(params.id));
      await batch.commit();
      return NextResponse.json({ ok: true, deletedTasks: taskSnap.size });
    }
  }

  await db.collection(COL.meetings).doc(params.id).delete();
  return NextResponse.json({ ok: true, deletedTasks: 0 });
}
