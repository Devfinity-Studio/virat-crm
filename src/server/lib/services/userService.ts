import bcrypt from "bcryptjs";
import { userManagers } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Validates a candidate employee code against an existing list of codes (case-insensitive).
 */
export function checkEmployeeCodeConflict(
  candidateCode: string,
  existingCodes: string[],
): { hasConflict: boolean; conflictingCode?: string; message: string } {
  const trimmed = candidateCode.trim();
  if (!trimmed) {
    return { hasConflict: true, message: "Employee code cannot be empty" };
  }
  if (trimmed.length < 2) {
    return { hasConflict: true, message: "Employee code must be at least 2 characters long" };
  }

  const lowerCandidate = trimmed.toLowerCase();
  const matched = existingCodes.find(
    (code) => code && code.trim().toLowerCase() === lowerCandidate,
  );

  if (matched) {
    return {
      hasConflict: true,
      conflictingCode: matched,
      message: `Employee code "${trimmed}" conflicts with existing code "${matched}"`,
    };
  }

  return {
    hasConflict: false,
    message: `Employee code "${trimmed}" is available`,
  };
}

/**
 * Calculates the next employee code in a series given an array of existing codes.
 */
export function calculateNextEmployeeCode(
  series: string,
  existingCodes: string[],
): string {
  const trimmedSeries = series.trim();
  if (!trimmedSeries) return "EMP-0001";

  const match = trimmedSeries.match(/^(.*?)(\d+)$/);
  if (!match || !match[1] || !match[2]) {
    // If no trailing numbers, append 0001 as fallback
    return `${trimmedSeries}0001`;
  }

  const prefix = match[1];
  const startNumStr = match[2];
  const startNum = parseInt(startNumStr, 10);
  const padLength = startNumStr.length;

  if (existingCodes.length === 0) {
    return trimmedSeries;
  }

  let maxNum = startNum - 1;
  for (const code of existingCodes) {
    if (!code.startsWith(prefix)) continue;
    const numPart = code.slice(prefix.length);
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed) && parsed > maxNum) {
      maxNum = parsed;
    }
  }

  const nextNum = maxNum + 1;
  return `${prefix}${nextNum.toString().padStart(padLength, "0")}`;
}

/**
 * Hashes a plaintext user password using bcrypt.
 */
export async function hashUserPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Synchronizes manager relations for a given user in the M:N table.
 */
export async function syncUserManagers(
  db: any,
  userId: string,
  managerIds: string[],
): Promise<void> {
  // Delete existing associations
  await db.delete(userManagers).where(eq(userManagers.userId, userId));

  if (managerIds.length === 0) return;

  const uniqueManagerIds = Array.from(new Set(managerIds));
  await db.insert(userManagers).values(
    uniqueManagerIds.map((managerId) => ({
      userId,
      managerId,
    })),
  );
}

/**
 * Generates the standard onboarding welcome email HTML.
 */
export function generateWelcomeEmailHtml(params: {
  firstName: string;
  employeeCode: string;
  password: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #2563eb;">Welcome to Virat CRM!</h2>
      <p>Hi ${params.firstName},</p>
      <p>Your account has been successfully created. Here are your credentials:</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Employee Code (E-Code):</strong> ${params.employeeCode}</p>
        <p style="margin: 4px 0;"><strong>Temporary Password:</strong> ${params.password}</p>
      </div>
      <p>Please log in and update your password immediately.</p>
    </div>
  `;
}
