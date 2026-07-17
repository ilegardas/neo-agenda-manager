import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertAvailabilityRuleSchema, insertAppointmentSchema, insertMenuItemSchema, insertSucursalSchema, insertEmployeeSchema, insertScheduleSchema, insertCatalogPhotoSchema, insertMinutaSchema, insertChecklistSchema, insertChecklistItemSchema } from "@shared/schema";
import { authStorage } from "./replit_integrations/auth/storage";
import { stripe, PLANS, getPriceIds, type PlanKey } from "./stripe";
import { getReportPeriodDates } from "./scheduler";

// Middleware adaptativo local para producción/desarrollo sin requerir el módulo problemático de Replit
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.session?.localUserId) {
    return next();
  }
  
  if (process.env.NODE_ENV === "production") {
    return res.status(401).json({ message: "Unauthorized - Local session missing" });
  }

  // Fallback seguro en desarrollo (Replit) usando importación dinámica para evitar fallos de compilación estática
  try {
    const { isAuthenticated: replitAuth } = require("./replit_integrations/auth");
    return replitAuth(req, res, next);
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

function getUserId(req: Request): string {
  const localUserId = (req.session as any)?.localUserId;
  if (localUserId) return localUserId;
  return (req.user as any)?.claims?.sub;
}
