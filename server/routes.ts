import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertAvailabilityRuleSchema, insertAppointmentSchema, insertMenuItemSchema, insertSucursalSchema, insertEmployeeSchema, insertScheduleSchema, insertCatalogPhotoSchema, insertMinutaSchema, insertChecklistSchema, insertChecklistItemSchema } from "@shared/schema";
import { authStorage } from "./replit_integrations/auth/storage";
import { stripe, PLANS, getPriceIds, type PlanKey } from "./stripe";
import { getReportPeriodDates } from "./scheduler";

// Middleware adaptativo local compatible con Railway en producción y Replit en desarrollo
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.session?.localUserId) {
    return next();
  }
  
  if (process.env.NODE_ENV === "production") {
    return res.status(401).json({ message: "Unauthorized - Local session missing" });
  }

  // En desarrollo (Replit), si el usuario está autenticado mediante su OIDC
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({ message: "Unauthorized" });
};

function getUserId(req: Request): string {
  const localUserId = (req.session as any)?.localUserId;
  if (localUserId) return localUserId;
  return (req.user as any)?.claims?.sub;
}
