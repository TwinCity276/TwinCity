import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const incidentsTable = pgTable("incidents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  department: text("department").notNull(),
  status: text("status").notNull().default("New"),
  priority: text("priority").notNull().default("Standard"),
  evidenceUrl: text("evidence_url"),
  reporter: text("reporter").notNull(),
  assignedTo: text("assigned_to"),
  reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({
  status: true,
  reportedAt: true,
  updatedAt: true,
});
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidentsTable.$inferSelect;