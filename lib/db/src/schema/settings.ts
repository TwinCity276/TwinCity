import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const siteSettingsTable = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  siteName: text("site_name").notNull().default("TwinCity"),
  tagline: text("tagline").notNull().default("See your city. Shape its future."),
  welcomeMessage: text("welcome_message").notNull().default("Report what needs attention in Freetown."),
  currentYear: integer("current_year").notNull().default(2026),
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettingsTable).omit({ id: true });
export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;
export type SiteSettings = typeof siteSettingsTable.$inferSelect;