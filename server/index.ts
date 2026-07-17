import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { startScheduler } from "./scheduler";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Prevent ECONNRESET / pool errors from crashing the process in Node ≥ 15
process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception (suppressed crash):", err.message);
});
process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error("[server] Unhandled rejection (suppressed crash):", msg);
});

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "5mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  // Solo ejecuta la inicialización de Replit si NO estás en producción
  if (process.env.NODE_ENV !== "production") {
    try {
      await setupAuth(app);
      registerAuthRoutes(app);
      log("Replit Auth initialized (Development mode)");
    } catch (authErr: any) {
      log(`Replit Auth skipped or failed: ${authErr.message}`, "auth");
    }
  } else {
    log("Running in Production mode — Replit Auth bypassed", "auth");

    // Manejador explícito para producción que limpia caché y rompe el bucle
    app.get("/api/auth/user", (req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      
      const localUserId = (req.session as any)?.localUserId;
      if (!localUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      return res.json({ id: localUserId });
    });
  }

  await registerRoutes(httpServer, app);

  // Start report scheduler – pass a function that fetches all user IDs
  startScheduler(async () => {
    const rows = await db.select({ id: users.id }).from(users);
    return rows.map(r => r.id);
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`[error] ${status} ${message}`);
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
