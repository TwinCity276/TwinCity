import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const adminAccessTable = pgTable("admin_access", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("department"),
  department: text("department"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdminAccessSchema = createInsertSchema(adminAccessTable).omit({
  createdAt: true,
});
export type InsertAdminAccess = z.infer<typeof insertAdminAccessSchema>;
export type AdminAccess = typeof adminAccessTable.$inferSelect;