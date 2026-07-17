# Appointment Booking System

## Overview
A multi-user appointment booking application. Providers log in via Replit Auth (Google, email, GitHub, Apple, X) OR with username/password, and manage their own availability, appointments, WhatsApp settings, and profile. Each provider gets a unique public booking page for customers. Admin users can view all registered users. Stripe subscription system controls public access to booking pages.

## Tech Stack
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + TanStack Query
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Routing**: wouter (frontend), express (backend)
- **Auth**: Dual auth — Replit Auth (OpenID Connect via passport + openid-client) AND username/password (scrypt hashing, session-based)
- **Payments**: Stripe (subscriptions with checkout sessions, customer portal, webhooks)

## Architecture
- `shared/models/auth.ts` - Auth schema: users table (varchar UUID id, role field, optional username/password for local auth) and sessions table
- `shared/schema.ts` - Database schema (re-exports users/sessions from auth, plus availability_rules, appointments, settings, subscriptions tables)
- `shared/routes.ts` - API route definitions with Zod validation
- `server/replit_integrations/auth/` - Auth integration (replitAuth.ts for OIDC, storage.ts for user CRUD, routes.ts for auth endpoints including local register/login)
- `server/routes.ts` - Express route handlers with isAuthenticated middleware; getUserId() checks both local session and OIDC claims
- `server/storage.ts` - Database storage layer (IStorage interface), all methods scoped by string userId
- `server/stripe.ts` - Stripe configuration, plans definition (monthly/semiannual/annual), price creation
- `server/index.ts` - Express server setup with dual auth middleware, 5mb JSON body limit for profile images
- `client/src/pages/Admin.tsx` - Dashboard with tabs: Citas, Disponibilidad, Perfil, Suscripción, Usuarios (admin only)
- `client/src/pages/BookingPage.tsx` - Public booking page per provider (/book/:userId), shows profile image + name in header
- `client/src/pages/Landing.tsx` - Landing page with login/register forms + Replit Auth option
- `client/src/hooks/use-auth.ts` - Auth hooks (useUser, useAuth with dual logout, useLogin, useRegister)
- `client/src/hooks/use-availability.ts` - Availability rules hooks (authenticated + public)
- `client/src/hooks/use-appointments.ts` - Appointments hooks (authenticated + public)
- `client/src/hooks/use-settings.ts` - Settings hooks (authenticated + public)
- `client/src/hooks/use-subscription.ts` - Subscription hooks (status, plans, checkout, portal, public status check)
- `client/src/lib/auth-utils.ts` - Auth utility functions (isUnauthorizedError, redirectToLogin)

## Key Features
- Dual authentication: Replit Auth (Google, email, GitHub, Apple, X OAuth) AND username/password registration
- Each user has isolated data (availability, appointments, settings)
- User IDs are string UUIDs (gen_random_uuid for local users, Replit sub claim for OAuth users)
- Profile customization: image upload (compressed to WebP on client) and custom business name
- Public booking pages at /book/:userId show provider's profile image and name
- Only accessible if provider has active subscription
- Weekly calendar view with 30-minute time slots
- Break/blocked time periods that properly overlay working hours
- Providers can confirm, cancel, edit appointment times
- WhatsApp integration: provider configures phone number and default message
- Stripe subscription plans: monthly ($99 MXN), semiannual ($499 MXN), annual ($899 MXN)
- Without active subscription, booking link shows "Página No Disponible"
- Admin user (id=53019014) always has active status without needing subscription
- Admin Users tab to view all registered users and manage their dashboards

## Database Tables
- `users` - User accounts (varchar id, email, firstName, lastName, profileImageUrl, username, password, role, timestamps)
- `sessions` - Session storage for both auth methods (sid, sess jsonb, expire)
- `availability_rules` - Weekly schedule rules (userId varchar, dayOfWeek, start/end time, isBreak, label)
- `appointments` - Booked appointments (userId varchar, start/end time, customer info, status, notes)
- `settings` - Key-value settings per user (userId varchar, key, value) — keys: whatsapp_phone, whatsapp_message, profile_name, profile_image, profile_description, social_facebook, social_instagram, social_tiktok, social_youtube, social_linkedin
- `subscriptions` - Stripe subscription data (userId, stripeCustomerId, stripeSubscriptionId, plan, status, period dates)

## Routes
- Auth: /api/login (Replit Auth redirect), /api/callback (OAuth callback), /api/logout (OIDC logout), /api/auth/user (get current user)
- Local Auth: POST /api/auth/register (username/password), POST /api/auth/login (username/password), POST /api/auth/local-logout
- Authenticated: /api/availability, /api/appointments, /api/settings
- Subscription: /api/subscription (status), /api/subscription/checkout, /api/subscription/portal, /api/subscription/plans
- Webhook: /api/stripe/webhook
- Public: /api/users/:userId/info, /api/users/:userId/availability, /api/users/:userId/appointments, /api/users/:userId/settings, /api/users/:userId/subscription-status
- Admin: /api/admin/users, /api/admin/users/:userId/availability, /api/admin/users/:userId/appointments, /api/admin/users/:userId/settings
- Frontend admin route: /admin/user/:userId

## Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string (auto-provisioned by Replit)
- `STRIPE_SECRET_KEY` - Stripe secret key (sk_test_... or sk_live_...)
- `STRIPE_WEBHOOK_SECRET` - (optional) Stripe webhook signing secret
- `SESSION_SECRET` - (auto-generated) Express session secret

## Stripe Configuration
- Account: gestionpro (acct_1TC3cICkZo6q4UGk)
- Currency: MXN (Mexican Pesos)
- Plans use hardcoded price IDs from gestionpro account (no dynamic creation):
  - monthly: price_1TC3sLCkZo6q4UGkoRouKLIT → $300 MXN/mes
  - semiannual: price_1TC3teCkZo6q4UGkRyx9LcZo → $1,500 MXN/6 meses
  - annual: price_1TC3uXCkZo6q4UGkGoj3lrI1 → $3,000 MXN/año
- Payment links (direct Stripe hosted pages, work without server-side Stripe SDK):
  - monthly: https://buy.stripe.com/7sYfZgbyNdMV8kmbUL6oo02
  - semiannual: https://buy.stripe.com/4gM8wOeKZbEN4462kb6oo00
  - annual: https://buy.stripe.com/6oU28q9qF5gpcACgb16oo01
- Webhook: we_1TC46mCkZo6q4UGkXZRZMx4l → /api/stripe/webhook
  - Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
- STRIPE_WEBHOOK_SECRET required for webhook signature verification
- Frontend polls subscription status every 3s (max 15 attempts) after returning from payment
- Admin users bypass subscription checks entirely

## UI Language
- Entire application is in Spanish
- Day names: ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"]
- Date formatting uses date-fns/locale/es

## Auth Implementation Details
- Replit Auth: OIDC flow via Passport.js, tokens stored in session, auto-refresh on expiry
- Local Auth: scrypt password hashing with random salt, session stores localUserId
- isAuthenticated middleware checks both: (1) session.localUserId, (2) Passport OIDC claims
- getUserId() returns session.localUserId if present, otherwise req.user.claims.sub
- Password never returned to frontend (/api/auth/user strips it)
