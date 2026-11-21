import { cookies } from "next/headers";
import { getSession } from "@/server/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return NextResponse.json({ error: "No session token" }, { status: 401 });
  }

  return NextResponse.json({ token, userId: session.userId });
}
