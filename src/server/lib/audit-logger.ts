import { db } from "@/server/db";
import { systemAuditLogs } from "@/server/db/schema/systemAuditLogs";

export type AuditEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT"
  | "LOCATION_ALERT"
  | "SYSTEM_ERROR"
  | "DEVELOPER_ACTION";

export type AuditStatus = "SUCCESS" | "FAILURE" | "WARNING" | "INFO";

export interface LogSystemEventParams {
  eventType: AuditEventType;
  action: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  employeeCode?: string | null;
  details?: string | null;
  status?: AuditStatus;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logSystemEvent(params: LogSystemEventParams) {
  try {
    await db.insert(systemAuditLogs).values({
      eventType: params.eventType,
      action: params.action,
      userId: params.userId ?? null,
      userName: params.userName ?? null,
      userEmail: params.userEmail ?? null,
      userRole: params.userRole ?? null,
      employeeCode: params.employeeCode ?? null,
      details: params.details ?? null,
      status: params.status ?? "INFO",
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      metadata: params.metadata ?? null,
      createdAt: new Date(),
    });
  } catch (error) {
    // Non-blocking catch to ensure audit logging never crashes critical auth paths
    console.error("[SystemAuditLogger] Failed to write log event:", error);
  }
}

/** Extracts client IP and User Agent cleanly from request headers */
export function extractClientInfo(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const ipAddress = forwardedFor
    ? (forwardedFor.split(",")[0]?.trim() ?? "unknown")
    : (realIp ?? "unknown");
  const userAgent = headers.get("user-agent") ?? "unknown";
  return { ipAddress, userAgent };
}
