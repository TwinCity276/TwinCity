import { Router, type IRouter } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, adminAccessTable, incidentsTable, siteSettingsTable } from "@workspace/db";
import {
  CreateAdminBody,
  CreateAdminResponse,
  CreateIncidentBody,
  CreateIncidentResponse,
  DeleteAdminParams,
  GetAdminSettingsResponse,
  GetDashboardSummaryResponse,
  UpdateIncidentBody,
  ListAdminsResponse,
  ListDepartmentsResponse,
  ListIncidentsQueryParams,
  ListIncidentsResponse,
  UpdateAdminSettingsBody,
  UpdateAdminSettingsResponse,
  UpdateIncidentParams,
  UpdateIncidentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const departments = [
  { id: "city-council", name: "Freetown City Council", shortName: "City Council", description: "Cleaning, waste, roads, drainage, and public spaces.", color: "#2f7d4d" },
  { id: "edsa", name: "EDSA", shortName: "EDSA", description: "Electricity supply, streetlights, and power issues.", color: "#e0a72b" },
  { id: "fireforce", name: "FireForce", shortName: "FireForce", description: "Fire accidents, safety risks, and emergency response.", color: "#d95c4f" },
];
const seededIncidents = [
  { title: "Overflowing bins near Lumley Beach", description: "Waste is spilling into the walkway and needs collection.", location: "Lumley Beach Road", department: "city-council", priority: "High", reporter: "community@twincity.sl" },
  { title: "Streetlight out on Wilkinson Road", description: "The light has been out for several nights near the junction.", location: "Wilkinson Road", department: "edsa", priority: "Standard", reporter: "resident@twincity.sl" },
  { title: "Smoke coming from a shop", description: "Visible smoke is coming from a storefront and neighbors need help.", location: "Kissy Road", department: "fireforce", priority: "Critical", reporter: "resident@twincity.sl" },
];

function formatIncident(row: typeof incidentsTable.$inferSelect) {
  return {
    ...row,
    reportedAt: row.reportedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function currentEmail(req: any) {
  const claims = getAuth(req).sessionClaims as Record<string, unknown> | null | undefined;
  return (claims?.email as string | undefined) ?? (claims?.email_address as string | undefined);
}

async function requireAdmin(req: any, res: any): Promise<string | null> {
  const email = currentEmail(req);
  if (!email) {
    res.status(401).json({ error: "Please sign in to access administration." });
    return null;
  }
  const normalized = email.toLowerCase();
  if (normalized === "madomdoma780@gmail.com") return normalized;
  const [grant] = await db.select().from(adminAccessTable).where(eq(adminAccessTable.email, normalized)).limit(1);
  if (!grant) {
    res.status(403).json({ error: "This account does not have administration access." });
    return null;
  }
  return normalized;
}

router.get("/departments", (_req, res) => {
  res.json(ListDepartmentsResponse.parse(departments));
});

router.get("/incidents", async (req, res): Promise<void> => {
  const parsed = ListIncidentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conditions = [];
  if (parsed.data.department) conditions.push(eq(incidentsTable.department, parsed.data.department));
  if (parsed.data.status) conditions.push(eq(incidentsTable.status, parsed.data.status));
  if (parsed.data.mine) {
    const email = currentEmail(req);
    if (email) conditions.push(eq(incidentsTable.reporter, email));
    else {
      res.json([]);
      return;
    }
  }
  const rows = await db.select().from(incidentsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(incidentsTable.reportedAt));
  res.json(ListIncidentsResponse.parse(rows.map(formatIncident)));
});

router.post("/incidents", async (req, res): Promise<void> => {
  const parsed = CreateIncidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const department = departments.find((item) => item.id === parsed.data.department || item.shortName === parsed.data.department)?.id ?? parsed.data.department;
  const [row] = await db.insert(incidentsTable).values({ ...parsed.data, department }).returning();
  res.status(201).json(CreateIncidentResponse.parse(formatIncident(row)));
});

router.patch("/incidents/:id", async (req, res): Promise<void> => {
  const params = UpdateIncidentParams.safeParse(req.params);
  const body = UpdateIncidentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid incident update." });
    return;
  }
  const [row] = await db.update(incidentsTable).set({ ...body.data, updatedAt: new Date() }).where(eq(incidentsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Incident not found." });
    return;
  }
  res.json(UpdateIncidentResponse.parse(formatIncident(row)));
});

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const department = typeof req.query.department === "string" ? req.query.department : undefined;
  const rows = await db.select().from(incidentsTable).where(department ? eq(incidentsTable.department, department) : undefined);
  const trend = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((label, index) => ({ label, count: Math.max(1, Math.round(rows.length * (0.5 + index / 10))) }));
  const result = { total: rows.length, newCount: rows.filter((r) => r.status === "New").length, inProgress: rows.filter((r) => r.status === "In progress").length, resolved: rows.filter((r) => r.status === "Resolved").length, averageResponseHours: 4.6, trend };
  res.json(GetDashboardSummaryResponse.parse(result));
});

router.get("/admin/settings", async (req, res): Promise<void> => {
  let [settings] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.id, 1));
  if (!settings) {
    [settings] = await db.insert(siteSettingsTable).values({ id: 1 }).returning();
  }
  res.json(GetAdminSettingsResponse.parse(settings));
});

router.patch("/admin/settings", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const parsed = UpdateAdminSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [settings] = await db.insert(siteSettingsTable).values({ id: 1, ...parsed.data }).onConflictDoUpdate({ target: siteSettingsTable.id, set: parsed.data }).returning();
  res.json(UpdateAdminSettingsResponse.parse(settings));
});

router.get("/admin/admins", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const rows = await db.select().from(adminAccessTable).orderBy(asc(adminAccessTable.createdAt));
  res.json(ListAdminsResponse.parse(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))));
});

router.post("/admin/admins", async (req, res): Promise<void> => {
  const owner = await requireAdmin(req, res);
  if (!owner) return;
  const parsed = CreateAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(adminAccessTable).values({ ...parsed.data, email: parsed.data.email.toLowerCase() }).returning();
  res.status(201).json(CreateAdminResponse.parse({ ...row, createdAt: row.createdAt.toISOString() }));
});

router.delete("/admin/admins/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const parsed = DeleteAdminParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.delete(adminAccessTable).where(eq(adminAccessTable.id, parsed.data.id));
  res.sendStatus(204);
});

export default router;