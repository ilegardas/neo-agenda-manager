import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashed, "hex"), buf);
}

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const localUserId = req.session?.localUserId;
      const userId = localUserId || req.user?.claims?.sub;
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, firstName, lastName, email } = req.body;
      if (!username || !password || !firstName) {
        return res.status(400).json({ message: "Se requieren usuario, contraseña y nombre." });
      }
      if (username.length < 3) {
        return res.status(400).json({ message: "El usuario debe tener al menos 3 caracteres." });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres." });
      }
      const existing = await authStorage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Ese nombre de usuario ya está registrado." });
      }
      const hashed = await hashPassword(password);
      const user = await authStorage.createLocalUser({
        username,
        password: hashed,
        firstName,
        lastName,
        email,
      });
      (req.session as any).localUserId = user.id;
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Error al crear la cuenta." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Se requieren usuario y contraseña." });
      }
      const user = await authStorage.getUserByUsername(username);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Usuario o contraseña incorrectos." });
      }
      const valid = await comparePasswords(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Usuario o contraseña incorrectos." });
      }
      (req.session as any).localUserId = user.id;
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Error al iniciar sesión." });
    }
  });

  app.post("/api/auth/local-logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error al cerrar sesión." });
      }
      res.json({ ok: true });
    });
  });
}
