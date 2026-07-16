
import { z } from 'zod';
import { insertAppointmentSchema, insertAvailabilityRuleSchema, appointments, availabilityRules } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  availability: {
    list: {
      method: 'GET' as const,
      path: '/api/availability',
      responses: {
        200: z.array(z.custom<typeof availabilityRules.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/availability',
      input: insertAvailabilityRuleSchema,
      responses: {
        201: z.custom<typeof availabilityRules.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/availability/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  appointments: {
    list: {
      method: 'GET' as const,
      path: '/api/appointments',
      input: z.object({
        start: z.string().optional(),
        end: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof appointments.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/appointments',
      input: insertAppointmentSchema,
      responses: {
        201: z.custom<typeof appointments.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/appointments/:id',
      input: insertAppointmentSchema.partial(),
      responses: {
        200: z.custom<typeof appointments.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/appointments/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  settings: {
    get: {
      method: 'GET' as const,
      path: '/api/settings',
      responses: {
        200: z.record(z.string(), z.string()),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/settings',
      input: z.record(z.string(), z.string()),
      responses: {
        200: z.record(z.string(), z.string()),
      },
    },
  },
  public: {
    userAvailability: { method: 'GET' as const, path: '/api/users/:userId/availability' },
    userAppointments: { method: 'GET' as const, path: '/api/users/:userId/appointments' },
    userSettings: { method: 'GET' as const, path: '/api/users/:userId/settings' },
    userInfo: { method: 'GET' as const, path: '/api/users/:userId/info' },
    userSubscriptionStatus: { method: 'GET' as const, path: '/api/users/:userId/subscription-status' },
    createBooking: { method: 'POST' as const, path: '/api/users/:userId/appointments' },
    userMenu: { method: 'GET' as const, path: '/api/users/:userId/menu' },
    checkIn: { method: 'POST' as const, path: '/api/users/:userId/checkin' },
    publicEmployees: { method: 'GET' as const, path: '/api/users/:userId/employees' },
    userCatalog: { method: 'GET' as const, path: '/api/users/:userId/catalog' },
  },
  catalog: {
    list: { method: 'GET' as const, path: '/api/catalog' },
    add: { method: 'POST' as const, path: '/api/catalog' },
    delete: { method: 'DELETE' as const, path: '/api/catalog/:id' },
  },
  menu: {
    list: { method: 'GET' as const, path: '/api/menu' },
    create: { method: 'POST' as const, path: '/api/menu' },
    update: { method: 'PATCH' as const, path: '/api/menu/:id' },
    delete: { method: 'DELETE' as const, path: '/api/menu/:id' },
  },
  subscription: {
    status: { method: 'GET' as const, path: '/api/subscription' },
    checkout: { method: 'POST' as const, path: '/api/subscription/checkout' },
    portal: { method: 'POST' as const, path: '/api/subscription/portal' },
    plans: { method: 'GET' as const, path: '/api/subscription/plans' },
  },
  attendance: {
    listSucursales: { method: 'GET' as const, path: '/api/attendance/sucursales' },
    createSucursal: { method: 'POST' as const, path: '/api/attendance/sucursales' },
    updateSucursal: { method: 'PATCH' as const, path: '/api/attendance/sucursales/:id' },
    deleteSucursal: { method: 'DELETE' as const, path: '/api/attendance/sucursales/:id' },
    listEmployees: { method: 'GET' as const, path: '/api/attendance/employees' },
    createEmployee: { method: 'POST' as const, path: '/api/attendance/employees' },
    updateEmployee: { method: 'PATCH' as const, path: '/api/attendance/employees/:id' },
    deleteEmployee: { method: 'DELETE' as const, path: '/api/attendance/employees/:id' },
    listSchedules: { method: 'GET' as const, path: '/api/attendance/schedules' },
    createSchedule: { method: 'POST' as const, path: '/api/attendance/schedules' },
    updateSchedule: { method: 'PATCH' as const, path: '/api/attendance/schedules/:id' },
    deleteSchedule: { method: 'DELETE' as const, path: '/api/attendance/schedules/:id' },
    listRecords: { method: 'GET' as const, path: '/api/attendance/records' },
    exportRecords: { method: 'GET' as const, path: '/api/attendance/records/export' },
    getReportSchedule: { method: 'GET' as const, path: '/api/attendance/report-schedule' },
    saveReportSchedule: { method: 'PUT' as const, path: '/api/attendance/report-schedule' },
    testReportSchedule: { method: 'POST' as const, path: '/api/attendance/report-schedule/test' },
  },
  minutas: {
    list:   { method: 'GET' as const,    path: '/api/minutas' },
    create: { method: 'POST' as const,   path: '/api/minutas' },
    update: { method: 'PATCH' as const,  path: '/api/minutas/:id' },
    delete: { method: 'DELETE' as const, path: '/api/minutas/:id' },
  },
  checklists: {
    list:        { method: 'GET' as const,    path: '/api/checklists' },
    create:      { method: 'POST' as const,   path: '/api/checklists' },
    update:      { method: 'PATCH' as const,  path: '/api/checklists/:id' },
    delete:      { method: 'DELETE' as const, path: '/api/checklists/:id' },
    listItems:   { method: 'GET' as const,    path: '/api/checklists/:id/items' },
    createItem:  { method: 'POST' as const,   path: '/api/checklists/:id/items' },
    deleteItem:  { method: 'DELETE' as const, path: '/api/checklists/:id/items/:itemId' },
    reorderItems:{ method: 'PUT' as const,    path: '/api/checklists/:id/items/order' },
  },
  admin: {
    users: { method: 'GET' as const, path: '/api/admin/users' },
    userAvailability: { method: 'GET' as const, path: '/api/admin/users/:userId/availability' },
    userAppointments: { method: 'GET' as const, path: '/api/admin/users/:userId/appointments' },
    userSettings: { method: 'GET' as const, path: '/api/admin/users/:userId/settings' },
    createUserAvailability: { method: 'POST' as const, path: '/api/admin/users/:userId/availability' },
    deleteUserAvailability: { method: 'DELETE' as const, path: '/api/admin/users/:userId/availability/:id' },
    updateUserAppointment: { method: 'PATCH' as const, path: '/api/admin/users/:userId/appointments/:id' },
    deleteUserAppointment: { method: 'DELETE' as const, path: '/api/admin/users/:userId/appointments/:id' },
    updateUserSettings: { method: 'PUT' as const, path: '/api/admin/users/:userId/settings' },
    updateUserRole: { method: 'PATCH' as const, path: '/api/admin/users/:userId/role' },
    grantTrial: { method: 'POST' as const, path: '/api/admin/users/:userId/trial' },
    deleteUser: { method: 'DELETE' as const, path: '/api/admin/users/:userId' },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type { InsertAppointment, InsertAvailabilityRule } from './schema';
export type { UpdateAppointmentRequest } from './schema';
