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

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  await db.collection(COL.meetings).doc(params.id).delete();
  return NextResponse.json({ ok: true });
}
