import { pgTable, text, serial, integer, boolean, timestamp, varchar, doublePrecision, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export { users, sessions } from "./models/auth";
export type { User, UpsertUser } from "./models/auth";

export const availabilityRules = pgTable("availability_rules", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isBreak: boolean("is_break").default(false).notNull(),
  label: text("label"),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  status: text("status").notNull().default('booked'),
  notes: text("notes"),
  amount: integer("amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
});

export const insertAvailabilityRuleSchema = createInsertSchema(availabilityRules).omit({ id: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });

export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type InsertAvailabilityRule = z.infer<typeof insertAvailabilityRuleSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  plan: varchar("plan").notNull().default("none"),
  status: varchar("status").notNull().default("inactive"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  imageData: text("image_data"),
  sortOrder: integer("sort_order").default(0).notNull(),
  available: boolean("available").default(true).notNull(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export type CreateAppointmentRequest = InsertAppointment;
export type UpdateAppointmentRequest = Partial<InsertAppointment>;

// ── Attendance module ──────────────────────────────────────────────

export const sucursales = pgTable("sucursales", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  manager: text("manager"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  radius: integer("radius").default(100),
  toleranciaMinutos: integer("tolerancia_minutos").default(0),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  position: text("position"),
  department: text("department"),
  sucursal: text("sucursal"),
  jefeDirecto: text("jefe_directo"),
  scheduleId: integer("schedule_id"),
  active: boolean("active").default(true).notNull(),
  pin: varchar("pin", { length: 4 }),
  barcode: varchar("barcode", { length: 32 }),
  sucursalId: integer("sucursal_id"),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  days: text("days").array().notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  slots: text("slots"),
});

export const attendances = pgTable("attendances", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  employeeId: integer("employee_id"),
  employeeName: text("employee_name").notNull(),
  checkDate: text("check_date").notNull(),
  checkTime: text("check_time").notNull(),
  type: varchar("type", { length: 16 }).notNull().default("entrada"),
  ip: text("ip").notNull(),
  isRetardo: boolean("is_retardo").default(false),
  comentario: text("comentario"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSucursalSchema = createInsertSchema(sucursales).omit({ id: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true });
export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true });
export const insertAttendanceSchema = createInsertSchema(attendances).omit({ id: true, createdAt: true });

export type Sucursal = typeof sucursales.$inferSelect;
export type InsertSucursal = z.infer<typeof insertSucursalSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Attendance = typeof attendances.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type AttendanceRecord = Attendance & {
  empSucursal?: string | null;
  empDepartment?: string | null;
  empJefeDirecto?: string | null;
};

// ── Catalog module ──────────────────────────────────────────────────────────

export const catalogPhotos = pgTable("catalog_photos", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  imageData: text("image_data").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogPhotoSchema = createInsertSchema(catalogPhotos).omit({ id: true, createdAt: true });
export type CatalogPhoto = typeof catalogPhotos.$inferSelect;
export type InsertCatalogPhoto = z.infer<typeof insertCatalogPhotoSchema>;

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

// ── Checklist module ──────────────────────────────────────────────────────────

export const checklists = pgTable("checklists", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const checklistItems = pgTable("checklist_items", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull(),
  userId: varchar("user_id").notNull(),
  type: varchar("type", { length: 10 }).notNull().default("item"), // 'title' | 'item'
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertChecklistSchema = createInsertSchema(checklists).omit({ id: true, createdAt: true });
export const insertChecklistItemSchema = createInsertSchema(checklistItems).omit({ id: true });
export type Checklist = typeof checklists.$inferSelect;
export type InsertChecklist = z.infer<typeof insertChecklistSchema>;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;

// ── Minutas module ────────────────────────────────────────────────────────────

export const minutas = pgTable("minutas", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  asunto: text("asunto").notNull(),
  anotacion: text("anotacion").notNull(),
  fecha: text("fecha").notNull(),
  hora: text("hora"),
  lugar: text("lugar"),
  responsable: text("responsable"),
  status: varchar("status", { length: 20 }).default("abierta").notNull(),
  archivos: text("archivos"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMinutaSchema = createInsertSchema(minutas).omit({ id: true, createdAt: true });
export type Minuta = typeof minutas.$inferSelect;
export type InsertMinuta = z.infer<typeof insertMinutaSchema>;

// ── Scrum module ──────────────────────────────────────────────────────────────

export const scrumProjects = pgTable("scrum_projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scrumSprints = pgTable("scrum_sprints", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  goal: text("goal"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  status: varchar("status", { length: 20 }).notNull().default("planning"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scrumStories = pgTable("scrum_stories", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: varchar("user_id").notNull(),
  sprintId: integer("sprint_id"),
  title: text("title").notNull(),
  description: text("description"),
  acceptanceCriteria: text("acceptance_criteria"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"),
  storyPoints: integer("story_points"),
  status: varchar("status", { length: 20 }).notNull().default("backlog"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scrumTasks = pgTable("scrum_tasks", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").notNull(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("todo"),
  assignee: text("assignee"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScrumProjectSchema = createInsertSchema(scrumProjects).omit({ id: true, createdAt: true });
export const insertScrumSprintSchema = createInsertSchema(scrumSprints).omit({ id: true, createdAt: true });
export const insertScrumStorySchema = createInsertSchema(scrumStories).omit({ id: true, createdAt: true });
export const insertScrumTaskSchema = createInsertSchema(scrumTasks).omit({ id: true, createdAt: true });

export type ScrumProject = typeof scrumProjects.$inferSelect;
export type InsertScrumProject = z.infer<typeof insertScrumProjectSchema>;
export type ScrumSprint = typeof scrumSprints.$inferSelect;
export type InsertScrumSprint = z.infer<typeof insertScrumSprintSchema>;
export type ScrumStory = typeof scrumStories.$inferSelect;
export type InsertScrumStory = z.infer<typeof insertScrumStorySchema>;
export type ScrumTask = typeof scrumTasks.$inferSelect;
export type InsertScrumTask = z.infer<typeof insertScrumTaskSchema>;

// ── Password reset tokens ─────────────────────────────────────────────────────

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull(),
  token: varchar("token", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
