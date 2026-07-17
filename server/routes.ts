
import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertAvailabilityRuleSchema, insertAppointmentSchema, insertMenuItemSchema, insertSucursalSchema, insertEmployeeSchema, insertScheduleSchema, insertCatalogPhotoSchema, insertMinutaSchema, insertChecklistSchema, insertChecklistItemSchema } from "@shared/schema";
import { isAuthenticated as replitAuth } from "./replit_integrations/auth";

// Middleware híbrido que soporta bypass local en producción y Replit en desarrollo
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.session?.localUserId) {
    return next();
  }
  if (process.env.NODE_ENV === "production") {
    return res.status(401).json({ message: "Unauthorized - Local session missing" });
  }
  return replitAuth(req, res, next);
};


import { authStorage } from "./replit_integrations/auth/storage";
import { stripe, PLANS, getPriceIds, type PlanKey } from "./stripe";
import { getReportPeriodDates } from "./scheduler";

function getUserId(req: Request): string {
  const localUserId = (req.session as any)?.localUserId;
  if (localUserId) return localUserId;
  return (req.user as any)?.claims?.sub;
}

const MASTER_EMAIL = 'hackedbydymo@gmail.com';

function getUserEmail(req: Request): string | undefined {
  const localUserId = (req.session as any)?.localUserId;
  if (localUserId) return undefined; // local users don't have claims email
  return (req.user as any)?.claims?.email;
}

function isMasterRequest(req: Request): boolean {
  return getUserEmail(req) === MASTER_EMAIL;
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = getUserId(req);
  const user = await authStorage.getUser(userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

async function requireMaster(req: Request, res: Response, next: NextFunction) {
  if (isMasterRequest(req)) return next();
  const userId = getUserId(req);
  const user = await authStorage.getUser(userId);
  if (!user || user.email !== MASTER_EMAIL) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === AUTHENTICATED ROUTES (own data) ===

  app.get(api.availability.list.path, isAuthenticated, async (req, res) => {
    const rules = await storage.getAvailabilityRules(getUserId(req));
    res.json(rules);
  });

  app.post(api.availability.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = insertAvailabilityRuleSchema.parse({ ...req.body, userId: getUserId(req) });
      const rule = await storage.createAvailabilityRule(input);
      res.status(201).json(rule);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
    }
  });

  app.delete(api.availability.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteAvailabilityRule(Number(req.params.id), getUserId(req));
    res.status(204).send();
  });

  app.get(api.appointments.list.path, isAuthenticated, async (req, res) => {
    const start = req.query.start ? new Date(req.query.start as string) : undefined;
    const end = req.query.end ? new Date(req.query.end as string) : undefined;
    const appts = await storage.getAppointments(getUserId(req), start, end);
    res.json(appts);
  });

  app.post(api.appointments.create.path, isAuthenticated, async (req, res) => {
    try {
      const body = {
        ...req.body,
        userId: getUserId(req),
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
      };
      const input = insertAppointmentSchema.parse(body);
      const appointment = await storage.createAppointment(input);
      res.status(201).json(appointment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.patch(api.appointments.update.path, isAuthenticated, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.startTime) body.startTime = new Date(body.startTime);
      if (body.endTime) body.endTime = new Date(body.endTime);
      const input = insertAppointmentSchema.partial().parse(body);
      const appointment = await storage.updateAppointment(Number(req.params.id), getUserId(req), input);
      res.json(appointment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
    }
  });

  app.delete(api.appointments.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteAppointment(Number(req.params.id), getUserId(req));
    res.status(204).send();
  });

  app.get(api.settings.get.path, isAuthenticated, async (req, res) => {
    const data = await storage.getSettings(getUserId(req), ['whatsapp_phone', 'whatsapp_message', 'profile_name', 'profile_image', 'profile_description', 'social_facebook', 'social_instagram', 'social_tiktok', 'social_youtube', 'social_linkedin', 'google_maps_url', 'menu_legend', 'landing_bg_color', 'landing_container_color', 'landing_font', 'landing_text_color', 'landing_show_catalog', 'landing_show_menu', 'landing_show_booking']);
    res.json(data);
  });

  app.put(api.settings.update.path, isAuthenticated, async (req, res) => {
    const updates = req.body as Record<string, string>;
    const userId = getUserId(req);
    for (const [key, value] of Object.entries(updates)) {
      await storage.setSetting(userId, key, value);
    }
    const data = await storage.getSettings(userId, ['whatsapp_phone', 'whatsapp_message', 'profile_name', 'profile_image', 'profile_description', 'social_facebook', 'social_instagram', 'social_tiktok', 'social_youtube', 'social_linkedin', 'google_maps_url', 'menu_legend', 'landing_bg_color', 'landing_container_color', 'landing_font', 'landing_text_color', 'landing_show_catalog', 'landing_show_menu', 'landing_show_booking']);
    res.json(data);
  });

  // === SUBSCRIPTION ROUTES ===

  app.get(api.subscription.plans.path, async (_req, res) => {
    const plans = Object.entries(PLANS).map(([key, plan]) => ({
      key,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      interval: plan.interval,
      intervalCount: plan.intervalCount,
      priceId: plan.priceId,
      paymentLink: plan.paymentLink,
    }));
    res.json({ plans, configured: !!stripe });
  });

  app.get(api.subscription.status.path, isAuthenticated, async (req, res) => {
    if (isMasterRequest(req)) {
      return res.json({ status: 'active', plan: 'admin', isAdmin: true });
    }
    const userId = getUserId(req);
    const user = await authStorage.getUser(userId);
    if (user?.email === MASTER_EMAIL || user?.role === 'admin') {
      return res.json({ status: 'active', plan: 'admin', isAdmin: true });
    }
    const sub = await storage.getSubscription(userId);
    if (!sub) {
      return res.json({ status: 'inactive', plan: 'none' });
    }
    const isTrial = sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date();
    const effectiveStatus = sub.status === 'active' ? 'active' : (isTrial ? 'trial' : sub.status);
    res.json({
      status: effectiveStatus,
      plan: isTrial && sub.status !== 'active' ? 'trial' : sub.plan,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEndsAt: sub.trialEndsAt,
      stripeSubscriptionId: sub.stripeSubscriptionId,
    });
  });

  app.post(api.subscription.checkout.path, isAuthenticated, async (req, res) => {
    if (!stripe) return res.status(503).json({ message: "Stripe no está configurado" });
    const userId = getUserId(req);
    const { plan } = req.body as { plan: PlanKey };
    if (!PLANS[plan]) return res.status(400).json({ message: "Plan inválido" });

    const user = await authStorage.getUser(userId);
    const prices = getPriceIds();

    let sub = await storage.getSubscription(userId);
    let customerId = sub?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email || undefined,
        name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await storage.upsertSubscription(userId, { stripeCustomerId: customerId });
    }

    const host = req.headers.host || 'localhost:5000';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${host}`;

    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: prices[plan], quantity: 1 }],
        success_url: `${baseUrl}/admin?subscription=success`,
        cancel_url: `${baseUrl}/admin?subscription=cancelled`,
        metadata: { userId, plan },
      });
      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Error creando sesión de pago:", err.message);
      res.status(500).json({ message: "No se pudo iniciar el proceso de pago. Intenta de nuevo." });
    }
  });

  app.post(api.subscription.portal.path, isAuthenticated, async (req, res) => {
    if (!stripe) return res.status(503).json({ message: "Stripe no está configurado" });
    const userId = getUserId(req);
    const sub = await storage.getSubscription(userId);
    if (!sub?.stripeCustomerId) return res.status(400).json({ message: "No hay suscripción activa" });

    const host = req.headers.host || 'localhost:5000';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${host}`;

    try {
      const portalConfig = await stripe.billingPortal.configurations.create({
        business_profile: {
          headline: "Gestiona tu suscripción en migestion.pro",
        },
        features: {
          subscription_cancel: { enabled: true },
          payment_method_update: { enabled: true },
          invoice_history: { enabled: true },
        },
        default_return_url: `${baseUrl}/admin`,
      });

      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${baseUrl}/admin`,
        configuration: portalConfig.id,
      });
      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Error creando portal de facturación:", err.message);
      res.status(500).json({ message: "No se pudo abrir el portal de suscripción. Intenta de nuevo más tarde." });
    }
  });

  app.post("/api/stripe/webhook", async (req, res) => {
    if (!stripe) return res.status(503).send();
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      if (webhookSecret && sig && req.rawBody) {
        event = stripe.webhooks.constructEvent(req.rawBody as Buffer, sig, webhookSecret);
      } else {
        event = req.body as any;
      }
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const userId = session.metadata?.userId;
          const plan = session.metadata?.plan;
          if (userId && session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            const sub = subscription as any;
            await storage.upsertSubscription(userId, {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscription.id,
              plan: plan || 'monthly',
              status: 'active',
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            });
          }
          break;
        }
        case "customer.subscription.updated": {
          const subscription = event.data.object as any;
          const customerId = subscription.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          const userId = (customer as any).metadata?.userId;
          if (userId) {
            await storage.upsertSubscription(userId, {
              status: subscription.status === 'active' ? 'active' : 'inactive',
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            });
          }
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          const customerId = subscription.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          const userId = (customer as any).metadata?.userId;
          if (userId) {
            await storage.upsertSubscription(userId, {
              status: 'inactive',
              plan: 'none',
              stripeSubscriptionId: null,
            });
          }
          break;
        }
      }
    } catch (err) {
      console.error("Webhook processing error:", err);
    }

    res.json({ received: true });
  });

  // === PUBLIC ROUTES (for booking pages) ===

  app.get(api.public.userInfo.path, async (req, res) => {
    const user = await authStorage.getUser(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Provider',
      email: user.email,
    });
  });

  app.get(api.public.userSubscriptionStatus.path, async (req, res) => {
    const userId = req.params.userId;
    const user = await authStorage.getUser(userId);
    if (!user) return res.status(404).json({ active: false });
    if (user.email === MASTER_EMAIL || user.role === 'admin') return res.json({ active: true });
    const sub = await storage.getSubscription(userId);
    const isTrial = sub?.trialEndsAt && new Date(sub.trialEndsAt) > new Date();
    const active = sub?.status === 'active' || !!isTrial;
    res.json({ active });
  });

  app.get(api.public.userAvailability.path, async (req, res) => {
    const rules = await storage.getAvailabilityRules(req.params.userId);
    res.json(rules);
  });

  app.get(api.public.userAppointments.path, async (req, res) => {
    const start = req.query.start ? new Date(req.query.start as string) : undefined;
    const end = req.query.end ? new Date(req.query.end as string) : undefined;
    const appts = await storage.getAppointments(req.params.userId, start, end);
    res.json(appts);
  });

  app.get(api.public.userSettings.path, async (req, res) => {
    const data = await storage.getSettings(req.params.userId, ['whatsapp_phone', 'whatsapp_message', 'profile_name', 'profile_image', 'profile_description', 'social_facebook', 'social_instagram', 'social_tiktok', 'social_youtube', 'social_linkedin', 'google_maps_url', 'menu_legend', 'landing_bg_color', 'landing_container_color', 'landing_font', 'landing_text_color', 'landing_show_catalog', 'landing_show_menu', 'landing_show_booking']);
    res.json(data);
  });

  // Dynamic PWA manifest for each user's landing page
  app.get('/api/users/:userId/pwa-manifest.json', async (req, res) => {
    try {
      const { userId } = req.params;
      const settings = await storage.getSettings(userId, ['profile_name', 'landing_bg_color']);
      const name = settings.profile_name || 'Mi Negocio';
      const shortName = name.length > 15 ? name.slice(0, 15).trim() + '…' : name;
      const bgColor = settings.landing_bg_color || '#0f172a';
      res.setHeader('Content-Type', 'application/manifest+json');
      res.setHeader('Cache-Control', 'no-cache, no-store');
      res.json({
        name,
        short_name: shortName,
        description: name,
        start_url: `/landing/${userId}`,
        scope: '/',
        display: 'standalone',
        background_color: bgColor,
        theme_color: bgColor,
        icons: [
          { src: `/api/users/${userId}/pwa-icon`, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: `/api/users/${userId}/pwa-icon`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Serve user profile image as binary for PWA icon
  app.get('/api/users/:userId/pwa-icon', async (req, res) => {
    try {
      const profileImage = await storage.getSetting(req.params.userId, 'profile_image');
      if (!profileImage) { res.redirect('/logo.png'); return; }
      const match = profileImage.match(/^data:([a-z/+]+);base64,(.+)$/);
      if (!match) { res.redirect('/logo.png'); return; }
      const [, mimeType, base64Data] = match;
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
    } catch {
      res.redirect('/logo.png');
    }
  });

  app.post(api.public.createBooking.path, async (req, res) => {
    try {
      const userId = req.params.userId;
      const body = {
        ...req.body,
        userId,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
      };
      const input = insertAppointmentSchema.parse(body);
      const appointment = await storage.createAppointment(input);
      res.status(201).json(appointment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // === ADMIN ROUTES ===

  app.get(api.admin.users.path, isAuthenticated, requireMaster, async (_req, res) => {
    const { users } = await import("@shared/schema");
    const { db } = await import("./db");
    const allUsers = await db.select().from(users);
    res.json(allUsers.map(u => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Provider',
      email: u.email,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
    })));
  });

  app.get(api.admin.userAvailability.path, isAuthenticated, requireAdmin, async (req, res) => {
    const rules = await storage.getAvailabilityRules(req.params.userId);
    res.json(rules);
  });

  app.get(api.admin.userAppointments.path, isAuthenticated, requireAdmin, async (req, res) => {
    const start = req.query.start ? new Date(req.query.start as string) : undefined;
    const end = req.query.end ? new Date(req.query.end as string) : undefined;
    const appts = await storage.getAppointments(req.params.userId, start, end);
    res.json(appts);
  });

  app.get(api.admin.userSettings.path, isAuthenticated, requireAdmin, async (req, res) => {
    const data = await storage.getSettings(req.params.userId, ['whatsapp_phone', 'whatsapp_message', 'profile_name', 'profile_image', 'profile_description', 'social_facebook', 'social_instagram', 'social_tiktok', 'social_youtube', 'social_linkedin', 'google_maps_url', 'menu_legend', 'landing_bg_color', 'landing_container_color', 'landing_font', 'landing_text_color', 'landing_show_catalog', 'landing_show_menu', 'landing_show_booking']);
    res.json(data);
  });

  app.post(api.admin.createUserAvailability.path, isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const input = insertAvailabilityRuleSchema.parse({ ...req.body, userId: req.params.userId });
      const rule = await storage.createAvailabilityRule(input);
      res.status(201).json(rule);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
    }
  });

  app.delete(api.admin.deleteUserAvailability.path, isAuthenticated, requireAdmin, async (req, res) => {
    await storage.deleteAvailabilityRule(Number(req.params.id), req.params.userId);
    res.status(204).send();
  });

  app.patch(api.admin.updateUserAppointment.path, isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.startTime) body.startTime = new Date(body.startTime);
      if (body.endTime) body.endTime = new Date(body.endTime);
      const input = insertAppointmentSchema.partial().parse(body);
      const appointment = await storage.updateAppointment(Number(req.params.id), req.params.userId, input);
      res.json(appointment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
    }
  });

  app.delete(api.admin.deleteUserAppointment.path, isAuthenticated, requireAdmin, async (req, res) => {
    await storage.deleteAppointment(Number(req.params.id), req.params.userId);
    res.status(204).send();
  });

  app.patch(api.admin.updateUserRole.path, isAuthenticated, requireMaster, async (req, res) => {
    const { role } = req.body as { role: 'admin' | 'user' };
    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    const targetUser = await authStorage.getUser(req.params.userId);
    if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (targetUser.email === MASTER_EMAIL) {
      return res.status(403).json({ error: 'No se puede cambiar el rol del usuario master' });
    }
    const updated = await authStorage.updateUserRole(req.params.userId, role);
    res.json({ id: updated.id, role: updated.role });
  });

  app.post(api.admin.grantTrial.path, isAuthenticated, requireMaster, async (req, res) => {
    const targetUser = await authStorage.getUser(req.params.userId);
    if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (targetUser.email === MASTER_EMAIL) return res.status(400).json({ error: 'El usuario master no necesita período de prueba' });
    const sub = await storage.grantTrial(req.params.userId, 7);
    res.json({ trialEndsAt: sub.trialEndsAt });
  });

  app.delete(api.admin.deleteUser.path, isAuthenticated, requireMaster, async (req, res) => {
    try {
      const targetUser = await authStorage.getUser(req.params.userId);
      if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado' });
      if (targetUser.email === MASTER_EMAIL) {
        return res.status(403).json({ error: 'No se puede eliminar el usuario master' });
      }
      await storage.deleteUserCascade(req.params.userId);
      res.status(204).send();
    } catch (err) {
      console.error('[delete user error]', err);
      res.status(500).json({ error: 'Error al eliminar usuario' });
    }
  });

  app.put(api.admin.updateUserSettings.path, isAuthenticated, requireAdmin, async (req, res) => {
    const updates = req.body as Record<string, string>;
    const userId = req.params.userId;
    for (const [key, value] of Object.entries(updates)) {
      await storage.setSetting(userId, key, value);
    }
    const data = await storage.getSettings(userId, ['whatsapp_phone', 'whatsapp_message', 'profile_name', 'profile_image', 'profile_description', 'social_facebook', 'social_instagram', 'social_tiktok', 'social_youtube', 'social_linkedin', 'google_maps_url', 'menu_legend', 'landing_bg_color', 'landing_container_color', 'landing_font', 'landing_text_color', 'landing_show_catalog', 'landing_show_menu', 'landing_show_booking']);
    res.json(data);
  });

  // === MENU ROUTES (private) ===

  app.get(api.menu.list.path, isAuthenticated, async (req, res) => {
    const items = await storage.getMenuItems(getUserId(req));
    res.json(items);
  });

  app.post(api.menu.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = insertMenuItemSchema.parse({ ...req.body, userId: getUserId(req) });
      const item = await storage.createMenuItem(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        console.error('[menu create error]', err);
        res.status(500).json({ message: 'Error interno', detail: (err as Error).message });
      }
    }
  });

  app.patch(api.menu.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = insertMenuItemSchema.partial().parse(req.body);
      const item = await storage.updateMenuItem(Number(req.params.id), getUserId(req), input);
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        console.error('[menu update error]', err);
        res.status(500).json({ message: 'Error interno', detail: (err as Error).message });
      }
    }
  });

  app.delete(api.menu.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteMenuItem(Number(req.params.id), getUserId(req));
    res.status(204).send();
  });

  // === PUBLIC MENU ROUTE ===
  app.get(api.public.userMenu.path, async (req, res) => {
    const items = await storage.getMenuItems(req.params.userId);
    const legend = await storage.getSetting(req.params.userId, 'menu_legend');
    const whatsapp = await storage.getSetting(req.params.userId, 'whatsapp_phone');
    const profileName = await storage.getSetting(req.params.userId, 'profile_name');
    const profileImage = await storage.getSetting(req.params.userId, 'profile_image');
    res.json({ items, legend, whatsappPhone: whatsapp, profileName, profileImage });
  });

  // === PUBLIC CHECKIN ROUTES ===

  app.get(api.public.publicEmployees.path, async (req, res) => {
    const emps = await storage.getEmployees(req.params.userId);
    res.json(emps.filter(e => e.active));
  });

  function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  app.post(api.public.checkIn.path, async (req, res) => {
    try {
      const { employeeId, pin, barcode, type = 'entrada', lat, lng, localDate, localTime, localDayOfWeek } = req.body as {
        employeeId?: number; pin?: string; barcode?: string; type?: string;
        lat?: number; lng?: number; localDate?: string; localTime?: string; localDayOfWeek?: string;
      };

      const emps = await storage.getEmployees(req.params.userId);
      let emp: typeof emps[0] | undefined;

      if (employeeId && pin) {
        const candidate = emps.find(e => e.id === employeeId && e.active);
        if (!candidate) return res.status(404).json({ error: 'Empleado no encontrado o inactivo' });
        if (!candidate.pin || candidate.pin !== pin) return res.status(401).json({ error: 'PIN incorrecto' });
        emp = candidate;
      } else if (barcode) {
        emp = emps.find(e => e.barcode === barcode && e.active);
        if (!emp) return res.status(404).json({ error: 'Código no encontrado o empleado inactivo' });
      } else {
        return res.status(400).json({ error: 'Se requiere empleado + PIN o código de barras' });
      }

      // Load sucursal once (for GPS validation + tolerance)
      let empSucursal: any = null;
      if (emp.sucursalId) {
        const sucs = await storage.getSucursales(req.params.userId);
        empSucursal = sucs.find(s => s.id === emp!.sucursalId) ?? null;
        if (empSucursal && empSucursal.latitude != null && empSucursal.longitude != null) {
          if (lat == null || lng == null) {
            return res.status(403).json({ error: `Ubicación GPS requerida para checar en "${empSucursal.name}". Activa el GPS y vuelve a intentar.` });
          }
          const dist = haversineMeters(empSucursal.latitude, empSucursal.longitude, lat, lng);
          const radius = empSucursal.radius ?? 100;
          if (dist > radius) {
            return res.status(403).json({ error: `Fuera de zona. Debes estar dentro de ${radius} m de "${empSucursal.name}" (distancia actual: ${Math.round(dist)} m).` });
          }
        }
      }

      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'desconocida';

      const now = new Date();
      // Prefer client-supplied local date/time (avoids UTC offset issues)
      console.log('[checkin] localDate=%s localTime=%s localDayOfWeek=%s', localDate, localTime, localDayOfWeek);
      const checkDate = localDate || now.toISOString().slice(0, 10);
      const checkTime = localTime || now.toISOString().slice(11, 19); // fallback: UTC but at least consistent

      // Retardo detection — only for 'entrada' when employee has a schedule
      const comentario = (req.body.comentario as string | undefined) || null;
      let isRetardo = false;
      // Schedule days use numeric strings: "1"=Mon … "6"=Sat, "0"=Sun (JS getDay format)
      if (type === 'entrada' && emp.scheduleId) {
        const scheds = await storage.getSchedules(req.params.userId);
        const schedule = scheds.find(s => s.id === emp!.scheduleId);
        const todayStr = localDayOfWeek ?? String(now.getDay());
        if (schedule && schedule.days.includes(todayStr)) {
          const toleranciaMin = empSucursal?.toleranciaMinutos ?? 0;
          const [sh, sm] = schedule.startTime.split(':').map(Number);
          const limitMin = sh * 60 + sm + toleranciaMin;
          const [ch, cm] = checkTime.split(':').map(Number);
          const curMin = ch * 60 + cm;
          if (curMin > limitMin) {
            isRetardo = true;
            if (!comentario) {
              return res.status(200).json({ needsRetardoComment: true, scheduleStart: schedule.startTime, toleranciaMin });
            }
          }
        }
      }

      const validTypes = ['entrada', 'comida', 'regreso', 'salida'];
      const record = await storage.createAttendance({
        userId: req.params.userId,
        employeeId: emp.id,
        employeeName: emp.name,
        checkDate,
        checkTime,
        type: validTypes.includes(type) ? type : 'entrada',
        ip,
        isRetardo,
        comentario,
      });
      res.status(201).json(record);
    } catch (err) {
      console.error('[checkin error]', err);
      res.status(500).json({ error: 'Error al registrar asistencia' });
    }
  });

  // === MINUTAS ROUTES (private) ===

  app.get(api.minutas.list.path, isAuthenticated, async (req, res) => {
    const data = await storage.getMinutas(getUserId(req));
    res.json(data);
  });

  app.post(api.minutas.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = insertMinutaSchema.parse({ ...req.body, userId: getUserId(req) });
      const created = await storage.createMinuta(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: 'Error al crear minuta' });
    }
  });

  app.patch(api.minutas.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = insertMinutaSchema.partial().parse(req.body);
      const updated = await storage.updateMinuta(Number(req.params.id), getUserId(req), input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: 'Error al actualizar minuta' });
    }
  });

  app.delete(api.minutas.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteMinuta(Number(req.params.id), getUserId(req));
    res.status(204).send();
  });

  // === CHECKLIST ROUTES ===

  app.get(api.checklists.list.path, isAuthenticated, async (req, res) => {
    res.json(await storage.getChecklists(getUserId(req)));
  });

  app.post(api.checklists.create.path, isAuthenticated, async (req, res) => {
    console.log('[CHECKLIST POST] hit, body:', JSON.stringify(req.body), 'userId:', getUserId(req));
    try {
      const input = insertChecklistSchema.parse({ ...req.body, userId: getUserId(req) });
      const created = await storage.createChecklist(input);
      console.log('[CHECKLIST POST] created:', created);
      res.status(201).json(created);
    } catch (err) {
      console.error('[CHECKLIST POST] error:', err);
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: 'Error al crear checklist' });
    }
  });

  app.patch(api.checklists.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = insertChecklistSchema.partial().parse(req.body);
      res.json(await storage.updateChecklist(Number(req.params.id), getUserId(req), input));
    } catch (err) {
      res.status(500).json({ error: 'Error al actualizar checklist' });
    }
  });

  app.delete(api.checklists.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteChecklist(Number(req.params.id), getUserId(req));
    res.status(204).send();
  });

  app.get(api.checklists.listItems.path, isAuthenticated, async (req, res) => {
    res.json(await storage.getChecklistItems(Number(req.params.id), getUserId(req)));
  });

  app.post(api.checklists.createItem.path, isAuthenticated, async (req, res) => {
    try {
      const input = insertChecklistItemSchema.parse({
        ...req.body,
        checklistId: Number(req.params.id),
        userId: getUserId(req),
      });
      res.status(201).json(await storage.createChecklistItem(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: 'Error al crear item' });
    }
  });

  app.delete(api.checklists.deleteItem.path, isAuthenticated, async (req, res) => {
    await storage.deleteChecklistItem(Number(req.params.itemId), Number(req.params.id), getUserId(req));
    res.status(204).send();
  });

  app.put(api.checklists.reorderItems.path, isAuthenticated, async (req, res) => {
    const { orderedIds } = req.body as { orderedIds: number[] };
    await storage.reorderChecklistItems(Number(req.params.id), getUserId(req), orderedIds);
    res.json({ ok: true });
  });

  // === SUCURSALES ROUTES (private) ===

  app.get(api.attendance.listSucursales.path, isAuthenticated, async (req, res) => {
    const data = await storage.getSucursales(getUserId(req));
    res.json(data);
  });

  app.post(api.attendance.createSucursal.path, isAuthenticated, async (req, res) => {
    try {
      const input = insertSucursalSchema.parse({ ...req.body, userId: getUserId(req) });
      const created = await storage.createSucursal(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: 'Error al crear sucursal' });
    }
  });

  app.patch(api.attendance.updateSucursal.path, isAuthenticated, async (req, res) => {
    try {
      const input = insertSucursalSchema.partial().parse(req.body);
      const updated = await storage.updateSucursal(Number(req.params.id), getUserId(req), input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: 'Error al actualizar sucursal' });
    }
  });

  app.delete(api.attendance.deleteSucursal.path, isAuthenticated, async (req, res) => {
    await storage.deleteSucursal(Number(req.params.id), getUserId(req));
    res.status(204).send();
  });

  // === ATTENDANCE ROUTES (private) ===

  app.get(api.attendance.listEmployees.path, isAuthenticated, async (req, res) => {
    const emps = await storage.getEmployees(getUserId(req));
    res.json(emps);
  });

  app.post(api.attendance.createEmployee.path, isAuthenticated, async (req, res) => {
    try {
      const input = insertEmployeeSchema.parse({ ...req.body, userId: getUserId(req) });
      const emp = await storage.createEmployee(input);
      res.status(201).json(emp);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: 'Error al crear empleado' });
    }
  });

  app.patch(api.attendance.updateEmployee.path, isAuthenticated, async (req, res) => {
    try {
      const input = insertEmployeeSchema.partial().parse(req.body);
      const emp = await storage.updateEmployee(Number(req.params.id), getUserId(req), input);
      res.json(emp);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: 'Error al actualizar empleado' });
    }
  });

  app.delete(api.attendance.deleteEmployee.path, isAuthenticated, async (req, res) => {
    await storage.deleteEmployee(Number(req.params.id), getUserId(req));
    res.status(204).send();
  });

  app.get(api.attendance.listSchedules.path, isAuthenticated, async (req, res) => {
    const scheds = await storage.getSchedules(getUserId(req));
    res.json(scheds);
  });

  app.post(api.attendance.createSchedule.path, isAuthenticated, async (req, res) => {
    try {
      const input = insertScheduleSchema.parse({ ...req.body, userId: getUserId(req) });
      const sch = await storage.createSchedule(input);
      res.status(201).json(sch);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: 'Error al crear horario' });
    }
  });

  app.patch(api.attendance.updateSchedule.path, isAuthenticated, async (req, res) => {
    try {
      const input = insertScheduleSchema.partial().parse(req.body);
      const sch = await storage.updateSchedule(Number(req.params.id), getUserId(req), input);
      res.json(sch);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
      res.status(500).json({ error: 'Error al actualizar horario' });
    }
  });

  app.delete(api.attendance.deleteSchedule.path, isAuthenticated, async (req, res) => {
    await storage.deleteSchedule(Number(req.params.id), getUserId(req));
    res.status(204).send();
  });

  app.get(api.attendance.listRecords.path, isAuthenticated, async (req, res) => {
    const { from, to, employeeId } = req.query as Record<string, string>;
    const records = await storage.getAttendances(
      getUserId(req),
      from || undefined,
      to || undefined,
      employeeId ? Number(employeeId) : undefined
    );
    res.json(records);
  });

  app.get(api.attendance.exportRecords.path, isAuthenticated, async (req, res) => {
    const { from, to, employeeId } = req.query as Record<string, string>;
    const records = await storage.getAttendances(
      getUserId(req),
      from || undefined,
      to || undefined,
      employeeId ? Number(employeeId) : undefined
    );
    // Build CSV
    const rows = [
      ['ID', 'Empleado', 'Fecha', 'Hora', 'IP'],
      ...records.map(r => [r.id, r.employeeName, r.checkDate, r.checkTime, r.ip]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="asistencias.csv"');
    res.send('\uFEFF' + csv); // BOM for Excel
  });

  // ── Report schedule ──────────────────────────────────────────────────────────

  app.get(api.attendance.getReportSchedule.path, isAuthenticated, async (req, res) => {
    const settings = await storage.getSettings(getUserId(req), [
      'report_enabled', 'report_email', 'report_frequency',
      'report_time', 'report_day_of_week', 'report_day_of_month', 'report_period', 'report_only_inout',
    ]);
    const { getSmtpConfig } = await import('./email');
    res.json({ ...settings, smtp_configured: !!getSmtpConfig() });
  });

  app.put(api.attendance.saveReportSchedule.path, isAuthenticated, async (req, res) => {
    const { report_enabled, report_email, report_frequency, report_time, report_day_of_week, report_day_of_month, report_period, report_only_inout } = req.body;
    const uid = getUserId(req);
    const pairs: [string, string][] = [
      ['report_enabled', report_enabled ?? 'false'],
      ['report_email', report_email ?? ''],
      ['report_frequency', report_frequency ?? 'daily'],
      ['report_time', report_time ?? '08:00'],
      ['report_day_of_week', report_day_of_week ?? '1'],
      ['report_day_of_month', report_day_of_month ?? '1'],
      ['report_period', report_period ?? 'week'],
      ['report_only_inout', report_only_inout ?? 'false'],
    ];
    for (const [key, val] of pairs) {
      await storage.setSetting(uid, key, val);
    }
    res.json({ ok: true });
  });

  app.post(api.attendance.testReportSchedule.path, isAuthenticated, async (req, res) => {
    try {
      const uid = getUserId(req);
      const settings = await storage.getSettings(uid, ['report_email', 'report_period', 'report_only_inout']);
      const email = settings.report_email;
      if (!email) return res.status(400).json({ error: 'No hay correo configurado' });
      const { getSmtpConfig, sendAttendanceReport } = await import('./email');
      const smtp = getSmtpConfig();
      if (!smtp) return res.status(400).json({ error: 'SMTP no configurado. Contacta al administrador.' });
      const { from, to, label } = getReportPeriodDates(settings.report_period ?? 'week');
      let records = await storage.getAttendances(uid, from, to);
      if (settings.report_only_inout === 'true') {
        records = records.filter(r => r.type === 'entrada' || r.type === 'salida');
      }
      await sendAttendanceReport(smtp, email, records, `Prueba – ${label}`);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Catalog ───────────────────────────────────────────────────────────────

  // List: metadata only (no imageData) — fast, never hangs on large blobs
  app.get(api.catalog.list.path, isAuthenticated, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      console.log(`[catalog] GET list userId=${getUserId(req)}`);
      const photos = await storage.getCatalogPhotosMeta(getUserId(req));
      console.log(`[catalog] GET list found ${photos.length} photos`);
      res.json(photos);
    } catch (err) {
      console.error("[catalog] GET list error:", err);
      res.status(500).json({ message: "Error al obtener el catálogo" });
    }
  });

  // Serve individual image as binary (authenticated)
  app.get('/api/catalog/:id/image', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).send();
      const photo = await storage.getCatalogPhotoById(id, getUserId(req));
      if (!photo) return res.status(404).send();
      const match = photo.imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return res.status(400).send();
      const [, mimeType, base64Data] = match;
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.send(Buffer.from(base64Data, 'base64'));
    } catch (err) {
      console.error("[catalog] GET image error:", err);
      res.status(500).send();
    }
  });

  app.post(api.catalog.add.path, isAuthenticated, async (req, res) => {
    try {
      const parsed = insertCatalogPhotoSchema.safeParse({ ...req.body, userId: getUserId(req) });
      if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });
      const photo = await storage.addCatalogPhoto(parsed.data);
      // Return metadata only — client uses URL-based images
      const { imageData: _img, ...meta } = photo;
      res.status(201).json(meta);
    } catch (err) {
      console.error("[catalog] POST error:", err);
      res.status(500).json({ message: "Error al guardar la foto" });
    }
  });

  app.delete(api.catalog.delete.path, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
      await storage.deleteCatalogPhoto(id, getUserId(req));
      res.status(204).send();
    } catch (err) {
      console.error("[catalog] DELETE error:", err);
      res.status(500).json({ message: "Error al eliminar la foto" });
    }
  });

  // Public catalog — metadata only
  app.get(api.public.userCatalog.path, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { userId } = req.params;
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
      const isMaster = user.email === MASTER_EMAIL || user.role === 'admin';
      if (!isMaster) {
        const sub = await storage.getSubscription(userId);
        const isTrial = sub?.trialEndsAt && new Date(sub.trialEndsAt) > new Date();
        const active = sub?.status === 'active' || !!isTrial;
        if (!active) return res.status(403).json({ active: false });
      }
      const photos = await storage.getCatalogPhotosMeta(userId);
      res.json(photos);
    } catch (err) {
      console.error("[catalog/public] GET error:", err);
      res.status(500).json({ message: "Error al obtener el catálogo" });
    }
  });

  // Public image endpoint — binary image by userId + photoId
  app.get('/api/users/:userId/catalog/:photoId/image', async (req, res) => {
    try {
      const { userId } = req.params;
      const photoId = parseInt(req.params.photoId);
      if (isNaN(photoId)) return res.status(400).send();
      const photo = await storage.getCatalogPhotoById(photoId, userId);
      if (!photo) return res.status(404).send();
      const match = photo.imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return res.status(400).send();
      const [, mimeType, base64Data] = match;
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.send(Buffer.from(base64Data, 'base64'));
    } catch (err) {
      console.error("[catalog/public] GET image error:", err);
      res.status(500).send();
    }
  });

  return httpServer;
}
