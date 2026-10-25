import { db } from "@/server/db";
import { users } from "@/server/db/schema/users";
import { branches } from "@/server/db/schema/branches";
import { eq, or } from "drizzle-orm";
import { login } from "@/server/lib/auth";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    employeeCode?: string;
    password?: string;
    branchId?: number;
  };
  const { employeeCode, password, branchId } = body;

  if (!employeeCode || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const cleanCode = employeeCode.trim();
  const user = await db.query.users.findFirst({
    where: or(
      eq(users.employeeCode, cleanCode),
      eq(users.employeeCode, cleanCode.toUpperCase()),
      eq(users.employeeCode, cleanCode.toLowerCase()),
      eq(users.email, cleanCode.toLowerCase()),
      eq(users.firstName, cleanCode),
    ),
  });

  if (!user?.isActive) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Check password
  if (!user.password) {
    // If user has no password set (migration case), they should probably set one first.
    return NextResponse.json(
      { error: "Password not set. Please contact admin." },
      { status: 401 },
    );
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // If user is Admin, they MUST select a branch to operate under
  if (user.role === "Admin") {
    if (branchId === undefined) {
      const activeBranches = await db.query.branches.findMany({
        where: eq(branches.isActive, true),
      });
      return NextResponse.json({
        requireBranch: true,
        branches: activeBranches.map((b) => ({ id: b.id, name: b.name })),
      });
    }

    // Update the Admin's branchId to the selected branch so that their operations are locked to this branch
    await db.update(users).set({ branchId }).where(eq(users.id, user.id));
  }

  // Create session
  await login(user.id);

  return NextResponse.json({ success: true });
}
