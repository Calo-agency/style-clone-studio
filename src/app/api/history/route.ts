import { NextResponse } from "next/server";
import { listGenerations } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const rows = await listGenerations(20);
  return NextResponse.json({ items: rows });
}
