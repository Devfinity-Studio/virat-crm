import { initTRPC, TRPCError } from "@trpc/server";
import { type OpenApiMeta } from "trpc-to-openapi";
import superjson from "superjson";
import { ZodError } from "zod";
import { getSession, getSessionFromHeaders } from "@/server/lib/auth";

import { db } from "@/server/db";
import { users } from "@/server/db/schema/users";
import { rolePermissions } from "@/server/db/schema/rolePermissions";
import { systemSettings } from "@/server/db/schema/systemSettings";
import { eq, and } from "drizzle-orm";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session =
    (await getSession()) ?? (await getSessionFromHeaders(opts.headers));
  const userId = session?.userId;

  // Fetch DB user for role information
  const dbUser = userId
    ? await db.query.users.findFirst({
        where: eq(users.id, userId),
      })
    : null;

  // Fetch system settings
  const settings = (await db.query.systemSettings.findFirst({
    where: eq(systemSettings.id, "global"),
  })) ?? {
    id: "global",
    maxUsers: 50,
    isSystemLocked: false,
    isReadOnly: false,
    disabledFeaturesGlobal: [] as string[],
    forceUpdateEnabled: false,
    minAppVersionCode: 1,
    latestAppVersionCode: 5,
    minAppVersionName: "1.1.0",
    latestAppVersionName: "1.1.1",
    updatedAt: new Date(),
  };

  return {
    db,
    session,
    dbUser,
    settings,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 */
const t = initTRPC
  .context<typeof createTRPCContext>()
  .meta<OpenApiMeta>()
  .create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          zodError:
            error.cause instanceof ZodError ? error.cause.flatten() : null,
        },
      };
    },
  });

/**
 * Create a server-side caller.
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);
  return result;
});

/**
 * Public (unauthenticated) procedure
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 */
const isAuthed = t.middleware(({ ctx, next, type }) => {
  if (!ctx.dbUser) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Immediately block deactivated users (e.g. GPS violations)
  if (!ctx.dbUser.isActive) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "ACCOUNT_DEACTIVATED: Your account has been suspended.",
    });
  }

  // Developer bypasses all system locks and read-only locks
  if (ctx.dbUser.role === "Developer") {
    return next({
      ctx: {
        ...ctx,
        dbUser: ctx.dbUser,
      },
    });
  }

  // System lock check
  if (ctx.settings.isSystemLocked) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "SYSTEM_LOCKED: System has been suspended by the developer.",
    });
  }

  // Read-only freeze check for mutations
  if (ctx.settings.isReadOnly && type === "mutation") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "System is under maintenance: mutations are currently suspended",
    });
  }

  return next({
    ctx: {
      ...ctx,
      dbUser: ctx.dbUser,
    },
  });
});

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(isAuthed);

/**
 * Dynamic Feature Gate Middleware
 */
export const featureProtectedProcedure = (featureKey: string) => {
  return protectedProcedure.use(
    t.middleware(async ({ ctx, next }) => {
      // Safety check for TS and runtime
      if (!ctx.dbUser) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User profile not found in database.",
        });
      }

      // Sovereign Developer bypasses ALL feature gates and permission rules
      if (ctx.dbUser.role === "Developer") {
        return next({
          ctx: {
            ...ctx,
            dbUser: ctx.dbUser,
          },
        });
      }

      // If a feature is globally disabled, block even Admins!
      if (ctx.settings.disabledFeaturesGlobal?.includes(featureKey)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `The feature '${featureKey}' is globally disabled.`,
        });
      }

      // Admins bypass feature gates (if not globally disabled)
      if (ctx.dbUser.role === "Admin") {
        return next({
          ctx: {
            ...ctx,
            dbUser: ctx.dbUser,
          },
        });
      }

      const permission = await ctx.db.query.rolePermissions.findFirst({
        where: and(
          eq(rolePermissions.role, ctx.dbUser.role),
          eq(rolePermissions.featureKey, featureKey),
        ),
      });

      if (!permission?.isEnabled) {
        console.warn(
          `[SECURITY] Access denied for user ${ctx.dbUser.id} (${ctx.dbUser.role}) to feature '${featureKey}'`,
        );
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `The feature '${featureKey}' is disabled for your role.`,
        });
      }

      return next({
        ctx: {
          ...ctx,
          dbUser: ctx.dbUser,
        },
      });
    }),
  );
};

/**
 * Admin (authenticated + admin role) procedure
 */
const isAdmin = t.middleware(({ ctx, next }) => {
  if (ctx.dbUser?.role === "Developer") {
    return next({ ctx });
  }
  if (ctx.dbUser?.role !== "Admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin role required." });
  }
  return next({
    ctx: {
      ...ctx,
      dbUser: ctx.dbUser,
    },
  });
});

export const isAdminMiddleware = isAdmin;
export const adminProcedure = protectedProcedure.use(isAdmin);

/**
 * Manager (authenticated + manager or admin role) procedure
 */
const isManager = t.middleware(({ ctx, next }) => {
  if (ctx.dbUser?.role === "Developer") {
    return next({ ctx });
  }
  if (
    !ctx.dbUser ||
    (ctx.dbUser.role !== "Admin" && ctx.dbUser.role !== "Manager")
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Manager or Admin role required.",
    });
  }
  return next({
    ctx: {
      ...ctx,
      dbUser: ctx.dbUser,
    },
  });
});

export const isManagerMiddleware = isManager;
export const managerProcedure = protectedProcedure.use(isManager);

/**
 * Combined Feature + Manager Procedure
 */
export const featureManagerProcedure = (featureKey: string) =>
  featureProtectedProcedure(featureKey).use(isManagerMiddleware);

/**
 * Multi-Tenant Security Helper:
 * Restricts queries and mutations strictly to the user's assigned branch.
 * Bypasses checks for Developer and Admin roles.
 */
export function enforceBranchIsolation(
  ctx: { dbUser?: { role: string; branchId: number | null } | null },
  targetBranchId?: number,
): number | undefined {
  const user = ctx.dbUser;
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User profile not found.",
    });
  }

  // Developer and Admin bypass checks
  if (user.role === "Developer" || user.role === "Admin") {
    return targetBranchId;
  }

  // Enforce branch assignment for standard users / managers
  if (!user.branchId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User has no branch assignment.",
    });
  }

  // If standard user attempts to target another branch, throw Forbidden
  if (targetBranchId !== undefined && targetBranchId !== user.branchId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Access Denied: You cannot query or modify data for Branch ${targetBranchId}.`,
    });
  }

  return user.branchId;
}
