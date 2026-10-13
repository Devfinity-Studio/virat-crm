import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  featureProtectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { users } from "@/server/db/schema/users";
import { roles } from "@/server/db/schema/roles";
import { eq, or, sql, desc, like, and, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const usersRouter = createTRPCRouter({
  signup: publicProcedure
    .input(
      z.object({
        firstName: z.string().min(2),
        lastName: z.string().min(2),
        email: z.string().email(),
        employeeCode: z.string().min(3).optional(),
        fatherName: z.string().optional(),
        joiningDate: z.date().optional(),
        dob: z.date().optional(),
        bloodGroup: z.string().optional(),
        joiningRole: z.string().optional(),
        promotionDate: z.date().optional(),
                password: z.string().min(6),
        profilePhoto: z.string().optional(),
        documents: z.array(z.object({
          name: z.string(),
          url: z.string(),
          key: z.string(),
          mimeType: z.string().optional(),
          size: z.number().optional()
        })).optional(),
        branchId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.db.query.users.findFirst({
        where: or(
          eq(users.email, input.email),
          eq(users.employeeCode, input.employeeCode || ""),
        ),
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email or employee code already exists",
        });
      }

      // Max active users license limit check
      const activeUserCountResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.isActive, true));
      const activeUserCount = activeUserCountResult[0]?.count ?? 0;
      if (activeUserCount >= ctx.settings.maxUsers) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Maximum active user limit (${ctx.settings.maxUsers}) has been reached. Contact System Developer to upgrade your license.`,
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const [newUser] = await ctx.db
        .insert(users)
        .values({
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          employeeCode: input.employeeCode ?? ("EMP-" + Math.floor(1000 + Math.random() * 9000).toString()),
          password: hashedPassword,
          role: "Employee", // Default role for self-signup
          branchId: input.branchId,
          isActive: true,
        })
                .returning();

      return {
        success: true,
        userId: newUser?.id,
      };
    }),

  
  getUserById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.id),
        with: {
          branch: true,
          managers: {
            with: { manager: true },
          },
          teamMembers: {
            with: { user: true },
          },
        },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (user.role === "Developer") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Developer profiles cannot be managed here" });
      }
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { userDocuments } = require("@/server/db/schema/userDocuments");
      const docs = await ctx.db.select().from(userDocuments).where(eq(userDocuments.userId, user.id));

      return { ...user, documents: docs, activeSessions: [] };
    }),

  updateUserPassword: protectedProcedure
    .input(z.object({ userId: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.dbUser.role !== "Admin" && ctx.dbUser.role !== "Developer") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can change user passwords" });
      }
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);
      await ctx.db.update(users).set({ password: hashedPassword }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  
  updateUserProfilePhoto: protectedProcedure
    .input(z.object({ userId: z.string(), profilePhoto: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users).set({ profilePhoto: input.profilePhoto }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  addUserDocument: protectedProcedure
    .input(z.object({
      userId: z.string(),
      name: z.string(),
      url: z.string(),
      key: z.string(),
      mimeType: z.string().optional(),
      size: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { userDocuments } = require("@/server/db/schema/userDocuments");
      await ctx.db.insert(userDocuments).values(input);
      return { success: true };
    }),

  renameUserDocument: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userDocuments } = require("@/server/db/schema/userDocuments");
      await ctx.db.update(userDocuments).set({ name: input.name }).where(eq(userDocuments.id, input.id));
      return { success: true };
    }),

  deleteUserDocument: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { userDocuments } = require("@/server/db/schema/userDocuments");
      await ctx.db.delete(userDocuments).where(eq(userDocuments.id, input.id));
      return { success: true };
    }),

  getPublicBranches: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.branches.findMany();
  }),

  getUsersForDropdown: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.users.findMany({
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        role: true,
      },
      where: and(eq(users.isActive, true), ne(users.role, "Developer")),
    });
  }),

  getMe: protectedProcedure.query(async ({ ctx }) => {
    // In our new system, ctx.dbUser is already fetched in the context
    // We can just return it with calculated permissions
    // Fetch managers for the current user since trpc.ts doesn't populate it
    const currentUserWithManagers = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.dbUser.id),
      with: {
        managers: {
          with: { manager: true },
        },
      },
    });

    return {
      ...ctx.dbUser,
      managers: currentUserWithManagers?.managers ?? [],
      permissions: {
        isManager: ctx.dbUser.role === "Manager" || ctx.dbUser.role === "Admin",
        isAdmin: ctx.dbUser.role === "Admin",
      },
      disabledFeaturesGlobal: ctx.settings.disabledFeaturesGlobal ?? [],
    };
  }),

  updatePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.dbUser.id),
      });

      if (!user?.password) {
        throw new Error("User not found or password not set");
      }

      const isValid = await bcrypt.compare(
        input.currentPassword,
        user.password,
      );
      if (!isValid) {
        throw new Error("Invalid current password");
      }

      const hashedPassword = await bcrypt.hash(input.newPassword, 10);
      await ctx.db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, ctx.dbUser.id));

      return { success: true };
    }),


  getNextEmployeeCode: protectedProcedure
    .input(z.object({ role: z.string() }))
    .query(async ({ ctx, input }) => {
      const roleData = await ctx.db.query.roles.findFirst({
        where: eq(roles.name, input.role)
      });
      const series = roleData?.codeSeries?.trim();
      if (!series) return 'EMP-0001 (Auto Generated)';
      
      // Extract trailing digits and prefix
      const match = series.match(/^(.*?)(\d+)$/);
      if (!match) {
        // If there are no trailing digits, just append 0001 as fallback
        return `${series}0001`;
      }
      
      const prefix = match[1];
      const startNumStr = match[2];
      const startNum = parseInt(startNumStr, 10);
      
      const latestUsers = await ctx.db.query.users.findMany({
        where: like(users.employeeCode, `${prefix}%`),
        orderBy: [desc(users.employeeCode)],
        limit: 100
      });
      
      if (latestUsers.length === 0) {
        return series; // No users yet, return the exact starting code
      }
      
      let maxNum = startNum - 1; // Base case: if we found users, we need to at least start at startNum
      for (const u of latestUsers) {
        const numPart = u.employeeCode.replace(prefix, '');
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
      
      return `${prefix}${(maxNum + 1).toString().padStart(startNumStr.length, '0')}`;
    }),


  previewNextEmployeeCode: protectedProcedure
    .input(z.object({ series: z.string() }))
    .query(async ({ ctx, input }) => {
      const series = input.series.trim();
      if (!series) return '';
      
      // Extract trailing digits and prefix
      const match = series.match(/^(.*?)(\d+)$/);
      if (!match) {
        // If there are no trailing digits, just append 0001 as fallback
        return `${series}0001`;
      }
      
      const prefix = match[1];
      const startNumStr = match[2];
      const startNum = parseInt(startNumStr, 10);
      
      const latestUsers = await ctx.db.query.users.findMany({
        where: like(users.employeeCode, `${prefix}%`),
        orderBy: [desc(users.employeeCode)],
        limit: 100
      });
      
      if (latestUsers.length === 0) {
        return series; // No users yet, return the exact starting code
      }
      
      let maxNum = startNum - 1; // Base case: if we found users, we need to at least start at startNum
      for (const u of latestUsers) {
        const numPart = u.employeeCode.replace(prefix, '');
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
      
      return `${prefix}${(maxNum + 1).toString().padStart(startNumStr.length, '0')}`;
    }),

  createUser: protectedProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        employeeCode: z.string().optional(),
        fatherName: z.string().optional(),
        joiningDate: z.date().optional(),
        dob: z.date().optional(),
        bloodGroup: z.string().min(1, "Blood Group is required"),
        joiningRole: z.string().optional(),
                password: z.string().min(6),
        profilePhoto: z.string().optional(),
        documents: z.array(z.object({
          name: z.string(),
          url: z.string(),
          key: z.string(),
          mimeType: z.string().optional(),
          size: z.number().optional()
        })).refine(docs => {
          const required = ["10th marksheet", "12th marksheet", "character certificate", "stamp papers", "requirement form"];
          const provided = docs.map(d => d.name);
          return required.every(r => provided.includes(r));
        }, "All 5 required documents must be uploaded"),
        promotionDate: z.date().optional(),
        role: z.string().min(2).max(64),
        branchId: z.number(),
        managerIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.dbUser.role !== "Admin" && ctx.dbUser.role !== "Developer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins or developers can create users",
        });
      }

      if (input.role === "Developer" && ctx.dbUser.role !== "Developer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only developers can assign the Developer role",
        });
      }

      // Max active users license limit check
      const activeUserCountResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.isActive, true));
      const activeUserCount = activeUserCountResult[0]?.count ?? 0;
      if (activeUserCount >= ctx.settings.maxUsers) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Maximum active user limit (${ctx.settings.maxUsers}) has been reached. Contact System Developer to upgrade your license.`,
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      
      // Auto-generate employee code if not provided
      let finalEmployeeCode = input.employeeCode;
      if (!finalEmployeeCode) {
        const roleData = await ctx.db.query.roles.findFirst({
          where: eq(roles.name, input.role)
        });
        const series = roleData?.codeSeries;
        if (series) {
          const latestUsers = await ctx.db.query.users.findMany({
            where: like(users.employeeCode, `${series}%`),
            orderBy: [desc(users.employeeCode)],
            limit: 100
          });
          
          let maxNum = 0;
          for (const u of latestUsers) {
            const numPart = u.employeeCode.replace(series, '');
            const parsed = parseInt(numPart, 10);
            if (!isNaN(parsed) && parsed > maxNum) {
              maxNum = parsed;
            }
          }
          finalEmployeeCode = `${series}${(maxNum + 1).toString().padStart(4, '0')}`;
        } else {
          // Fallback random code if no series defined
          finalEmployeeCode = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
        }
      }

      const { managerIds, employeeCode, documents, dob, joiningDate, promotionDate, ...userData } = input;

      const [newUser] = await ctx.db
        .insert(users)
        .values({
          ...userData,
          ...(dob ? { dob: dob.toISOString().split('T')[0] } : {}),
          ...(joiningDate ? { joiningDate } : {}),
          ...(promotionDate ? { promotionDate } : {}),
          profilePhoto: userData.profilePhoto,
          employeeCode: finalEmployeeCode,
          password: hashedPassword,
        })
        .returning();

      if (newUser && managerIds && managerIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { userManagers } = require("@/server/db/schema/users");
        await ctx.db.insert(userManagers).values(
          managerIds.map((managerId) => ({
            userId: newUser.id,
            managerId,
          })),
        );
      }

      
      if (documents && documents.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { userDocuments } = require("@/server/db/schema/userDocuments");
        await ctx.db.insert(userDocuments).values(
          documents.map(doc => ({
            userId: newUser.id,
            name: doc.name,
            url: doc.url,
            key: doc.key,
            mimeType: doc.mimeType,
            size: doc.size
          }))
        );
      }

      // Dispatch onboarding Email & SMS
      const { sendEmailAlert } = require("@/server/lib/communication");
      const appStoreLink = "https://apps.apple.com/app/virat-crm";
      const playStoreLink = "https://play.google.com/store/apps/details?id=com.virat.crm";
      const webPortalLink = "https://virat-crm.vercel.app";
      
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #2563eb;">Welcome to Virat CRM!</h2>
          <p>Hi ${input.firstName},</p>
          <p>Your account has been successfully created. Here are your details:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Employee Code (E-Code):</strong> ${finalEmployeeCode}</p>
            <p style="margin: 4px 0;"><strong>Temporary Password:</strong> ${input.password}</p>
          </div>
          <p>Please log in using the links below:</p>
          <ul style="line-height: 1.6;">
            <li><a href="${webPortalLink}">Web Portal</a></li>
            <li><a href="${appStoreLink}">Download for iOS</a></li>
            <li><a href="${playStoreLink}">Download for Android</a></li>
          </ul>
          <p style="margin-top: 24px; font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
        </div>
      `;

      try {
        await sendEmailAlert({
          to: input.email,
          subject: "Welcome to Virat CRM - Your Login Credentials",
          html: emailContent
        });
        
        // Mock SMS Dispatch
        console.log(`[SMS Gateway] Dispatched SMS to ${input.firstName}. Credentials sent.`);
      } catch (err) {
        console.error("Failed to send onboarding notifications", err);
      }

      return newUser;
    }),

  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    if (
      ctx.dbUser.role !== "Admin" &&
      ctx.dbUser.role !== "Manager" &&
      ctx.dbUser.role !== "Developer"
    ) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return ctx.db.query.users.findMany({
      where: ne(users.role, "Developer"),
      with: {
        branch: true,
        managers: {
          with: { manager: true },
        },
      },
    });
  }),

  toggleActiveStatus: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.dbUser.role !== "Admin" && ctx.dbUser.role !== "Developer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins or developers can change active status",
        });
      }

      const targetUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (targetUser.role === "Developer" && ctx.dbUser.role !== "Developer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Developer accounts cannot be deactivated by other roles.",
        });
      }

      // Check max users cap if activating an inactive user
      if (input.isActive && !targetUser.isActive) {
        const activeUserCountResult = await ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.isActive, true));
        const activeUserCount = activeUserCountResult[0]?.count ?? 0;
        if (activeUserCount >= ctx.settings.maxUsers) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Maximum active user limit (${ctx.settings.maxUsers}) has been reached. Contact System Developer to upgrade your license.`,
          });
        }
      }

      await ctx.db
        .update(users)
        .set({ isActive: input.isActive })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  resetUserPassword: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        newPassword: z.string().min(6),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.dbUser.role !== "Admin" && ctx.dbUser.role !== "Developer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins or developers can reset employee passwords",
        });
      }

      const targetUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (targetUser.role === "Developer" && ctx.dbUser.role !== "Developer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Developer passwords cannot be reset by other roles.",
        });
      }

      const hashedPassword = await bcrypt.hash(input.newPassword, 10);
      await ctx.db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  updateUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        firstName: z.string().min(2),
        lastName: z.string().min(2),
        email: z.string().email(),
        employeeCode: z.string().min(3).optional(),
        fatherName: z.string().optional(),
        joiningDate: z.date().optional(),
        dob: z.date().optional(),
        bloodGroup: z.string().min(1, "Blood Group is required"),
        joiningRole: z.string().optional(),
        promotionDate: z.date().optional(),
        role: z.string().min(2).max(64),
        branchId: z.number().nullable().optional(),
        managerIds: z.array(z.string()).optional(),
        profilePhoto: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.dbUser.role !== "Admin" && ctx.dbUser.role !== "Developer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins or developers can edit user details",
        });
      }

      const targetUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (targetUser?.role === "Developer") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot modify Developer profiles" });

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (targetUser.role === "Developer" && ctx.dbUser.role !== "Developer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Developer details can only be modified by the Developer.",
        });
      }

      if (input.role === "Developer" && ctx.dbUser.role !== "Developer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only developers can assign the Developer role",
        });
      }

      if (input.managerIds && input.managerIds.includes(input.userId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An employee cannot be their own manager",
        });
      }

      // Check if another user already uses this email or employee code
      const existingUser = await ctx.db.query.users.findFirst({
        where: or(
          eq(users.email, input.email),
          eq(users.employeeCode, input.employeeCode || ""),
        ),
      });

      if (existingUser && existingUser.id !== input.userId) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Another employee with this email or employee code already exists",
        });
      }

      const { userId, managerIds, ...updateData } = input;


      const updateDataFormatted = {
        ...updateData,
        ...(updateData.dob ? { dob: updateData.dob.toISOString().split('T')[0] } : {}),
        joiningDate: updateData.joiningDate ? updateData.joiningDate : undefined,
        promotionDate: updateData.promotionDate ? updateData.promotionDate : undefined,
      };
      const [updatedUser] = await ctx.db
        .update(users)
        .set(updateDataFormatted as any)
        .where(eq(users.id, userId))
        .returning();

      if (managerIds !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { userManagers } = require("@/server/db/schema/users");

        // Remove existing managers
        await ctx.db
          .delete(userManagers)
          .where(eq(userManagers.userId, userId));

        // Add new managers
        if (managerIds.length > 0) {
          await ctx.db.insert(userManagers).values(
            managerIds.map((managerId) => ({
              userId,
              managerId,
            })),
          );
        }
      }

      return updatedUser;
    }),


  promoteEmployee: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        newRole: z.string(),
        promotionDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.dbUser.role !== "Admin" && ctx.dbUser.role !== "Developer") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can promote employees" });
      }

      const targetUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const roleData = await ctx.db.query.roles.findFirst({
        where: eq(roles.name, input.newRole)
      });
      
      let finalEmployeeCode = targetUser.employeeCode;
      const series = roleData?.codeSeries;
      if (series) {
        const latestUsers = await ctx.db.query.users.findMany({
          where: like(users.employeeCode, `${series}%`),
          orderBy: [desc(users.employeeCode)],
          limit: 100
        });
        
        let maxNum = 0;
        for (const u of latestUsers) {
          const numPart = u.employeeCode.replace(series, '');
          const parsed = parseInt(numPart, 10);
          if (!isNaN(parsed) && parsed > maxNum) {
            maxNum = parsed;
          }
        }
        finalEmployeeCode = `${series}${(maxNum + 1).toString().padStart(4, '0')}`;
      }

      return await ctx.db.update(users)
        .set({
          role: input.newRole,
          employeeCode: finalEmployeeCode,
          promotionDate: input.promotionDate
        })
        .where(eq(users.id, input.userId));
    }),

  getOrgTree: featureProtectedProcedure("org-chart").query(async ({ ctx }) => {
    // Fetch all active users with their managers
    const allUsers = await ctx.db.query.users.findMany({
      where: eq(users.isActive, true),
      with: {
        managers: true,
      },
    });

    const isAdmin = ctx.dbUser.role === "Admin";
    const isManager = ctx.dbUser.role === "Manager";

    // Map by ID for easy access
    interface OrgNode {
      id: string;
      firstName: string | null;
      lastName: string | null;
      name: string;
      role: string | null;
      employeeCode: string | null;
      managerIds: string[];
      children: OrgNode[];
    }

    const userMap = new Map<string, OrgNode>();
    allUsers.forEach((u) => {
      userMap.set(u.id, {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role,
        employeeCode: u.employeeCode,
        managerIds: u.managers.map((m: any) => m.managerId),
        children: [],
      });
    });

    const roots: OrgNode[] = [];

    // Build the tree (a user can be pushed to multiple managers' children)
    allUsers.forEach((u) => {
      const node = userMap.get(u.id);
      if (!node) return;

      const mIds = node.managerIds;
      if (mIds.length > 0) {
        let hasValidManager = false;
        mIds.forEach((mId) => {
          if (userMap.has(mId)) {
            userMap.get(mId)?.children.push(node);
            hasValidManager = true;
          }
        });
        if (!hasValidManager) {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    if (isAdmin) return roots;

    // If Manager, find the node for current user and return its subtree
    if (isManager) {
      const myNode = userMap.get(ctx.dbUser.id);
      return myNode ? [myNode] : [];
    }

    return [];
  }),
});
