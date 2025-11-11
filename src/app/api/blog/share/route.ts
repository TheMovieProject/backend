// app/api/blog/share/route.ts (temporary no-op)
import { NextResponse } from "next/server";
export async function POST(req: Request) {
  const { blogId } = await req.json();
  if (!blogId) return NextResponse.json({ error: "blogId is required" }, { status: 400 });
  return NextResponse.json({ shares: 0 }); // placeholder until schema adds shares
}
