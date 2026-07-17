import { users, type User, type UpsertUser } from "@shared/models/auth";
import { passwordResetTokens } from "@shared/schema";
import { db } from "../../db";
import { eq, or } from "drizzle-orm";

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createLocalUser(data: { username: string; password: string; firstName: string; lastName?: string; email?: string }): Promise<User>;
  updateUserRole(id: string, role: 'admin' | 'user'): Promise<User>;
  createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ id: number; email: string; expiresAt: Date; usedAt: Date | null } | undefined>;
  markPasswordResetTokenUsed(id: number): Promise<void>;
  updateUserPasswordByEmail(email: string, hashedPassword: string): Promise<void>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const { role, ...updateData } = userData;
    const updateSet: Record<string, any> = { ...updateData, updatedAt: new Date() };
    if (role !== undefined) {
      updateSet.role = role;
    }
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: updateSet,
      })
      .returning();
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      or(eq(users.username, username), eq(users.email, username))
    );
    return user;
  }

  async createLocalUser(data: { username: string; password: string; firstName: string; lastName?: string; email?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username: data.username,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName || null,
        email: data.email || null,
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUserRole(id: string, role: 'admin' | 'user'): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({ email, token, expiresAt });
  }

  async getPasswordResetToken(token: string): Promise<{ id: number; email: string; expiresAt: Date; usedAt: Date | null } | undefined> {
    const [record] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return record as any;
  }

  async markPasswordResetTokenUsed(id: number): Promise<void> {
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
  }

  async updateUserPasswordByEmail(email: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword, updatedAt: new Date() }).where(eq(users.email, email));
  }
}

export const authStorage = new AuthStorage();
