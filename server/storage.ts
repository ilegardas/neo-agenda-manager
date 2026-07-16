
import { db } from "./db";
import {
  availabilityRules,
  appointments,
  settings,
  subscriptions,
  menuItems,
  users,
  sucursales,
  employees,
  schedules,
  attendances,
  catalogPhotos,
  minutas,
  type AvailabilityRule,
  type InsertAvailabilityRule,
  type Appointment,
  type InsertAppointment,
  type Setting,
  type Subscription,
  type MenuItem,
  type InsertMenuItem,
  type Sucursal,
  type InsertSucursal,
  type Employee,
  type InsertEmployee,
  type Schedule,
  type InsertSchedule,
  type Attendance,
  type InsertAttendance,
  type AttendanceRecord,
  type CatalogPhoto,
  type InsertCatalogPhoto,
  type Minuta,
  type InsertMinuta,
  checklists,
  checklistItems,
  type Checklist,
  type InsertChecklist,
  type ChecklistItem,
  type InsertChecklistItem,
} from "@shared/schema";
import { eq, and, asc, desc, getTableColumns, gte, lte } from "drizzle-orm";

export interface IStorage {
  getAvailabilityRules(userId: string): Promise<AvailabilityRule[]>;
  createAvailabilityRule(rule: InsertAvailabilityRule): Promise<AvailabilityRule>;
  deleteAvailabilityRule(id: number, userId: string): Promise<void>;

  getAppointments(userId: string, start?: Date, end?: Date): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, userId: string, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: number, userId: string): Promise<void>;

  getSetting(userId: string, key: string): Promise<string | null>;
  setSetting(userId: string, key: string, value: string): Promise<Setting>;
  getSettings(userId: string, keys: string[]): Promise<Record<string, string>>;

  getSubscription(userId: string): Promise<Subscription | null>;
  upsertSubscription(userId: string, data: Partial<Subscription>): Promise<Subscription>;
  grantTrial(userId: string, days: number): Promise<Subscription>;

  getMenuItems(userId: string): Promise<MenuItem[]>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, userId: string, data: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: number, userId: string): Promise<void>;

  // Minutas
  getMinutas(userId: string): Promise<Minuta[]>;
  createMinuta(m: InsertMinuta): Promise<Minuta>;
  updateMinuta(id: number, userId: string, data: Partial<InsertMinuta>): Promise<Minuta>;
  deleteMinuta(id: number, userId: string): Promise<void>;

  // Checklists
  getChecklists(userId: string): Promise<Checklist[]>;
  createChecklist(c: InsertChecklist): Promise<Checklist>;
  updateChecklist(id: number, userId: string, data: Partial<InsertChecklist>): Promise<Checklist>;
  deleteChecklist(id: number, userId: string): Promise<void>;
  getChecklistItems(checklistId: number, userId: string): Promise<ChecklistItem[]>;
  createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem>;
  deleteChecklistItem(id: number, checklistId: number, userId: string): Promise<void>;
  reorderChecklistItems(checklistId: number, userId: string, orderedIds: number[]): Promise<void>;

  // Attendance - Sucursales
  getSucursales(userId: string): Promise<Sucursal[]>;
  getSucursalById(id: number, userId: string): Promise<Sucursal | undefined>;
  createSucursal(s: InsertSucursal): Promise<Sucursal>;
  updateSucursal(id: number, userId: string, data: Partial<InsertSucursal>): Promise<Sucursal>;
  deleteSucursal(id: number, userId: string): Promise<void>;

  // Attendance - Employees
  getEmployees(userId: string): Promise<Employee[]>;
  createEmployee(emp: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, userId: string, data: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: number, userId: string): Promise<void>;

  // Attendance - Schedules
  getSchedules(userId: string): Promise<Schedule[]>;
  createSchedule(sch: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, userId: string, data: Partial<InsertSchedule>): Promise<Schedule>;
  deleteSchedule(id: number, userId: string): Promise<void>;

  // Attendance - Records
  createAttendance(record: InsertAttendance): Promise<Attendance>;
  getAttendances(userId: string, from?: string, to?: string, employeeId?: number): Promise<AttendanceRecord[]>;

  // Catalog
  getCatalogPhotosMeta(userId: string): Promise<Omit<CatalogPhoto, 'imageData'>[]>;
  getCatalogPhotoById(id: number, userId: string): Promise<CatalogPhoto | undefined>;
  addCatalogPhoto(photo: InsertCatalogPhoto): Promise<CatalogPhoto>;
  deleteCatalogPhoto(id: number, userId: string): Promise<void>;

  deleteUserCascade(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAvailabilityRules(userId: string): Promise<AvailabilityRule[]> {
    return await db.select().from(availabilityRules).where(eq(availabilityRules.userId, userId));
  }

  async createAvailabilityRule(rule: InsertAvailabilityRule): Promise<AvailabilityRule> {
    const [newRule] = await db.insert(availabilityRules).values(rule).returning();
    return newRule;
  }

  async deleteAvailabilityRule(id: number, userId: string): Promise<void> {
    await db.delete(availabilityRules).where(and(eq(availabilityRules.id, id), eq(availabilityRules.userId, userId)));
  }

  async getAppointments(userId: string, start?: Date, end?: Date): Promise<Appointment[]> {
    if (start && end) {
      return await db.select().from(appointments).where(
        and(
          eq(appointments.userId, userId),
          gte(appointments.startTime, start),
          lte(appointments.endTime, end)
        )
      );
    }
    return await db.select().from(appointments).where(eq(appointments.userId, userId));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async updateAppointment(id: number, userId: string, appointment: Partial<InsertAppointment>): Promise<Appointment> {
    const [updated] = await db
      .update(appointments)
      .set(appointment)
      .where(and(eq(appointments.id, id), eq(appointments.userId, userId)))
      .returning();
    return updated;
  }

  async deleteAppointment(id: number, userId: string): Promise<void> {
    await db.delete(appointments).where(and(eq(appointments.id, id), eq(appointments.userId, userId)));
  }

  async getSetting(userId: string, key: string): Promise<string | null> {
    const [row] = await db.select().from(settings).where(and(eq(settings.userId, userId), eq(settings.key, key)));
    return row?.value ?? null;
  }

  async setSetting(userId: string, key: string, value: string): Promise<Setting> {
    const existing = await db.select().from(settings).where(and(eq(settings.userId, userId), eq(settings.key, key)));
    if (existing.length > 0) {
      const [updated] = await db.update(settings).set({ value }).where(and(eq(settings.userId, userId), eq(settings.key, key))).returning();
      return updated;
    }
    const [created] = await db.insert(settings).values({ userId, key, value }).returning();
    return created;
  }

  async getSettings(userId: string, keys: string[]): Promise<Record<string, string>> {
    const rows = await db.select().from(settings).where(eq(settings.userId, userId));
    const result: Record<string, string> = {};
    for (const s of rows) {
      if (keys.includes(s.key)) {
        result[s.key] = s.value;
      }
    }
    return result;
  }

  async getSubscription(userId: string): Promise<Subscription | null> {
    const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return row || null;
  }

  async upsertSubscription(userId: string, data: Partial<Subscription>): Promise<Subscription> {
    const existing = await this.getSubscription(userId);
    if (existing) {
      const [updated] = await db.update(subscriptions).set({ ...data, updatedAt: new Date() }).where(eq(subscriptions.userId, userId)).returning();
      return updated;
    }
    const [created] = await db.insert(subscriptions).values({ userId, ...data } as any).returning();
    return created;
  }

  async grantTrial(userId: string, days: number): Promise<Subscription> {
    const trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this.upsertSubscription(userId, { trialEndsAt, plan: 'trial' });
  }

  async getMenuItems(userId: string): Promise<MenuItem[]> {
    return await db.select().from(menuItems)
      .where(eq(menuItems.userId, userId))
      .orderBy(asc(menuItems.sortOrder), asc(menuItems.id));
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [created] = await db.insert(menuItems).values(item).returning();
    return created;
  }

  async updateMenuItem(id: number, userId: string, data: Partial<InsertMenuItem>): Promise<MenuItem> {
    const [updated] = await db.update(menuItems)
      .set(data)
      .where(and(eq(menuItems.id, id), eq(menuItems.userId, userId)))
      .returning();
    return updated;
  }

  async deleteMenuItem(id: number, userId: string): Promise<void> {
    await db.delete(menuItems).where(and(eq(menuItems.id, id), eq(menuItems.userId, userId)));
  }

  // ── Minutas ────────────────────────────────────────────────────────

  async getMinutas(userId: string): Promise<Minuta[]> {
    return await db.select().from(minutas)
      .where(eq(minutas.userId, userId))
      .orderBy(desc(minutas.fecha), desc(minutas.createdAt));
  }

  async createMinuta(m: InsertMinuta): Promise<Minuta> {
    const [created] = await db.insert(minutas).values(m).returning();
    return created;
  }

  async updateMinuta(id: number, userId: string, data: Partial<InsertMinuta>): Promise<Minuta> {
    const [updated] = await db.update(minutas)
      .set(data)
      .where(and(eq(minutas.id, id), eq(minutas.userId, userId)))
      .returning();
    return updated;
  }

  async deleteMinuta(id: number, userId: string): Promise<void> {
    await db.delete(minutas).where(and(eq(minutas.id, id), eq(minutas.userId, userId)));
  }

  // ── Attendance - Sucursales ────────────────────────────────────────

  async getSucursales(userId: string): Promise<Sucursal[]> {
    return await db.select().from(sucursales)
      .where(eq(sucursales.userId, userId))
      .orderBy(asc(sucursales.name));
  }

  async getSucursalById(id: number, userId: string): Promise<Sucursal | undefined> {
    const [row] = await db.select().from(sucursales)
      .where(and(eq(sucursales.id, id), eq(sucursales.userId, userId)));
    return row;
  }

  async createSucursal(s: InsertSucursal): Promise<Sucursal> {
    const [created] = await db.insert(sucursales).values(s).returning();
    return created;
  }

  async updateSucursal(id: number, userId: string, data: Partial<InsertSucursal>): Promise<Sucursal> {
    const [updated] = await db.update(sucursales)
      .set(data)
      .where(and(eq(sucursales.id, id), eq(sucursales.userId, userId)))
      .returning();
    return updated;
  }

  async deleteSucursal(id: number, userId: string): Promise<void> {
    await db.delete(sucursales).where(and(eq(sucursales.id, id), eq(sucursales.userId, userId)));
  }

  // ── Attendance - Employees ─────────────────────────────────────────

  async getEmployees(userId: string): Promise<Employee[]> {
    return await db.select().from(employees)
      .where(eq(employees.userId, userId))
      .orderBy(asc(employees.name));
  }

  async createEmployee(emp: InsertEmployee): Promise<Employee> {
    const [created] = await db.insert(employees).values(emp).returning();
    return created;
  }

  async updateEmployee(id: number, userId: string, data: Partial<InsertEmployee>): Promise<Employee> {
    const [updated] = await db.update(employees)
      .set(data)
      .where(and(eq(employees.id, id), eq(employees.userId, userId)))
      .returning();
    return updated;
  }

  async deleteEmployee(id: number, userId: string): Promise<void> {
    await db.delete(employees).where(and(eq(employees.id, id), eq(employees.userId, userId)));
  }

  // ── Attendance - Schedules ─────────────────────────────────────────

  async getSchedules(userId: string): Promise<Schedule[]> {
    return await db.select().from(schedules)
      .where(eq(schedules.userId, userId))
      .orderBy(asc(schedules.name));
  }

  async createSchedule(sch: InsertSchedule): Promise<Schedule> {
    const [created] = await db.insert(schedules).values(sch).returning();
    return created;
  }

  async updateSchedule(id: number, userId: string, data: Partial<InsertSchedule>): Promise<Schedule> {
    const [updated] = await db.update(schedules)
      .set(data)
      .where(and(eq(schedules.id, id), eq(schedules.userId, userId)))
      .returning();
    return updated;
  }

  async deleteSchedule(id: number, userId: string): Promise<void> {
    await db.delete(schedules).where(and(eq(schedules.id, id), eq(schedules.userId, userId)));
  }

  // ── Attendance - Records ───────────────────────────────────────────

  async createAttendance(record: InsertAttendance): Promise<Attendance> {
    const [created] = await db.insert(attendances).values(record).returning();
    return created;
  }

  async getAttendances(userId: string, from?: string, to?: string, employeeId?: number): Promise<AttendanceRecord[]> {
    const rows = await db.select({
      ...getTableColumns(attendances),
      empSucursal: employees.sucursal,
      empDepartment: employees.department,
      empJefeDirecto: employees.jefeDirecto,
    })
      .from(attendances)
      .leftJoin(employees, eq(attendances.employeeId, employees.id))
      .where(eq(attendances.userId, userId))
      .orderBy(desc(attendances.createdAt));

    return rows.filter(r => {
      if (from && r.checkDate < from) return false;
      if (to && r.checkDate > to) return false;
      if (employeeId && r.employeeId !== employeeId) return false;
      return true;
    });
  }

  // ── Catalog ────────────────────────────────────────────────────────

  async getCatalogPhotosMeta(userId: string): Promise<Omit<CatalogPhoto, 'imageData'>[]> {
    return await db.select({
      id: catalogPhotos.id,
      userId: catalogPhotos.userId,
      caption: catalogPhotos.caption,
      sortOrder: catalogPhotos.sortOrder,
      createdAt: catalogPhotos.createdAt,
    }).from(catalogPhotos)
      .where(eq(catalogPhotos.userId, userId))
      .orderBy(asc(catalogPhotos.sortOrder), asc(catalogPhotos.createdAt));
  }

  async getCatalogPhotoById(id: number, userId: string): Promise<CatalogPhoto | undefined> {
    const [photo] = await db.select().from(catalogPhotos)
      .where(and(eq(catalogPhotos.id, id), eq(catalogPhotos.userId, userId)));
    return photo;
  }

  async addCatalogPhoto(photo: InsertCatalogPhoto): Promise<CatalogPhoto> {
    const [created] = await db.insert(catalogPhotos).values(photo).returning();
    return created;
  }

  async deleteCatalogPhoto(id: number, userId: string): Promise<void> {
    await db.delete(catalogPhotos).where(and(eq(catalogPhotos.id, id), eq(catalogPhotos.userId, userId)));
  }

  // ── Checklists ─────────────────────────────────────────────────────

  async getChecklists(userId: string): Promise<Checklist[]> {
    return await db.select().from(checklists)
      .where(eq(checklists.userId, userId))
      .orderBy(desc(checklists.createdAt));
  }

  async createChecklist(c: InsertChecklist): Promise<Checklist> {
    const [created] = await db.insert(checklists).values(c).returning();
    return created;
  }

  async updateChecklist(id: number, userId: string, data: Partial<InsertChecklist>): Promise<Checklist> {
    const [updated] = await db.update(checklists)
      .set(data)
      .where(and(eq(checklists.id, id), eq(checklists.userId, userId)))
      .returning();
    return updated;
  }

  async deleteChecklist(id: number, userId: string): Promise<void> {
    await db.delete(checklistItems).where(and(eq(checklistItems.checklistId, id), eq(checklistItems.userId, userId)));
    await db.delete(checklists).where(and(eq(checklists.id, id), eq(checklists.userId, userId)));
  }

  async getChecklistItems(checklistId: number, userId: string): Promise<ChecklistItem[]> {
    return await db.select().from(checklistItems)
      .where(and(eq(checklistItems.checklistId, checklistId), eq(checklistItems.userId, userId)))
      .orderBy(asc(checklistItems.sortOrder), asc(checklistItems.id));
  }

  async createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem> {
    const [created] = await db.insert(checklistItems).values(item).returning();
    return created;
  }

  async deleteChecklistItem(id: number, checklistId: number, userId: string): Promise<void> {
    await db.delete(checklistItems)
      .where(and(eq(checklistItems.id, id), eq(checklistItems.checklistId, checklistId), eq(checklistItems.userId, userId)));
  }

  async reorderChecklistItems(checklistId: number, userId: string, orderedIds: number[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(checklistItems)
        .set({ sortOrder: i })
        .where(and(eq(checklistItems.id, orderedIds[i]), eq(checklistItems.checklistId, checklistId), eq(checklistItems.userId, userId)));
    }
  }

  // ── Cascade delete ─────────────────────────────────────────────────

  async deleteUserCascade(userId: string): Promise<void> {
    await db.delete(attendances).where(eq(attendances.userId, userId));
    await db.delete(employees).where(eq(employees.userId, userId));
    await db.delete(schedules).where(eq(schedules.userId, userId));
    await db.delete(catalogPhotos).where(eq(catalogPhotos.userId, userId));
    await db.delete(menuItems).where(eq(menuItems.userId, userId));
    await db.delete(appointments).where(eq(appointments.userId, userId));
    await db.delete(availabilityRules).where(eq(availabilityRules.userId, userId));
    await db.delete(settings).where(eq(settings.userId, userId));
    await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
