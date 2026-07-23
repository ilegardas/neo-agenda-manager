import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startScheduler } from "./scheduler";
import { db, pool } from "./db"; // Importamos pool desde db.ts
import { users } from "@shared/schema";

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

// Inicializar el store de Postgres para las sesiones
const PgSession = connectPgSimple(session);

// OBLIGATORIO EN RAILWAY: Permite que express-session reconozca HTTPS tras el proxy
app.set("trust proxy", 1);

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

// Configuración persistente de sesiones
app.use(
  session({
    store: new PgSession({
      pool, // Utiliza el pool de PostgreSQL
      tableName: "session",
      createTableIfMissing: true, // Crea la tabla 'session' en Postgres automáticamente
    }),
    name: "sid",
    secret: process.env.SESSION_SECRET || "clave_secreta_local_desarrollo",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
    },
  })
);


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
  // Registro de todas las rutas de la aplicación
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
