import cron from "node-cron";
import { storage } from "./storage";
import { sendAttendanceReport, getSmtpConfig } from "./email";
import { log } from "./index";

export function getReportPeriodDates(period: string): { from: string; to: string; label: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (period === "15days") {
    const d = new Date(now);
    d.setDate(d.getDate() - 15);
    return { from: d.toISOString().slice(0, 10), to: today, label: "Últimos 15 días" };
  } else if (period === "month") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return { from: d.toISOString().slice(0, 10), to: today, label: "Último mes (30 días)" };
  } else if (period === "all") {
    return { from: "2000-01-01", to: today, label: "Todo el historial" };
  } else {
    // "week" (default)
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { from: d.toISOString().slice(0, 10), to: today, label: "Última semana" };
  }
}

// ── Midnight auto-checkout ─────────────────────────────────────────────────
async function runMidnightAutoCheckout(userIds: string[]) {
  // At 00:00 the previous calendar day just ended — use yesterday's date
  const nowUtc = new Date();
  const nowLocal = new Date(nowUtc.getTime() - 6 * 60 * 60 * 1000); // UTC-6 approx Mexico
  const yesterday = new Date(nowLocal);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const _p = (n: number) => String(n).padStart(2, "0");
  const checkDate = `${yesterday.getUTCFullYear()}-${_p(yesterday.getUTCMonth() + 1)}-${_p(yesterday.getUTCDate())}`;
  const checkTime = "23:59:00";

  log(`[auto-checkout] Running for date ${checkDate}`);

  for (const userId of userIds) {
    try {
      const [emps, scheds, records] = await Promise.all([
        storage.getEmployees(userId),
        storage.getSchedules(userId),
        storage.getAttendances(userId, checkDate, checkDate),
      ]);

      if (emps.length === 0) continue;

      // Build a set of employeeIds that already have a "salida" for this date
      const hasSalida = new Set<number>(
        records
          .filter(r => r.type === "salida" && r.checkDate === checkDate && r.employeeId != null)
          .map(r => r.employeeId as number)
      );

      // Employees that checked in (have any record) but have no salida
      const checkedIn = new Set<number>(
        records
          .filter(r => r.employeeId != null && r.checkDate === checkDate)
          .map(r => r.employeeId as number)
      );

      const schedMap = new Map(scheds.map(s => [s.id, s]));

      let created = 0;
      for (const emp of emps) {
        if (!emp.active) continue;
        if (!checkedIn.has(emp.id)) continue;  // never checked in today
        if (hasSalida.has(emp.id)) continue;    // already has salida

        // Check if outside schedule: at midnight the work day has ended for any
        // schedule whose endTime <= "23:59". Night-shift schedules (endTime > startTime
        // and endTime past midnight) are excluded by checking endTime > startTime.
        const sched = emp.scheduleId ? schedMap.get(emp.scheduleId) : undefined;
        if (sched) {
          // Skip if overnight schedule (endTime < startTime) — employee may still be working
          if (sched.endTime < sched.startTime) continue;
          // Skip if schedule day doesn't include yesterday
          const dowYesterday = String(yesterday.getUTCDay());
          if (!sched.days.includes(dowYesterday)) continue;
        }

        await storage.createAttendance({
          userId,
          employeeId: emp.id,
          employeeName: emp.name,
          checkDate,
          checkTime,
          type: "salida",
          ip: "sistema",
          isRetardo: false,
          comentario: "Salida del sistema por omisión",
        });
        created++;
        log(`[auto-checkout] Created salida for emp ${emp.id} (${emp.name}) user ${userId}`);
      }

      if (created > 0) log(`[auto-checkout] Created ${created} auto-salidas for user ${userId}`);
    } catch (err: any) {
      log(`[auto-checkout] Error for user ${userId}: ${err.message}`);
    }
  }
}

export function startScheduler(userIds: () => Promise<string[]>) {
  // Midnight auto-checkout: every day at 00:00
  cron.schedule("0 0 * * *", async () => {
    try {
      const ids = await userIds();
      await runMidnightAutoCheckout(ids);
    } catch (err: any) {
      log(`[auto-checkout] Scheduler error: ${err.message}`);
    }
  });

  // Run every minute to check schedules
  cron.schedule("* * * * *", async () => {
    try {
      const ids = await userIds();
      const nowUtc = new Date();
      // Use UTC-6 (Mexico City approximate) – adjust as needed
      const nowLocal = new Date(nowUtc.getTime() - 6 * 60 * 60 * 1000);
      const hhmm = `${String(nowLocal.getUTCHours()).padStart(2, "0")}:${String(nowLocal.getUTCMinutes()).padStart(2, "0")}`;
      const dowLocal = nowLocal.getUTCDay(); // 0=Sun

      for (const userId of ids) {
        try {
          const settings = await storage.getSettings(userId, [
            "report_enabled",
            "report_email",
            "report_frequency",
            "report_time",
            "report_day_of_week",
            "report_day_of_month",
            "report_period",
            "report_only_inout",
          ]);

          if (settings.report_enabled !== "true") continue;
          const email = settings.report_email;
          if (!email) continue;
          const frequency = settings.report_frequency || "daily";
          const schedTime = settings.report_time || "08:00";

          if (schedTime !== hhmm) continue;

          // Check day conditions
          if (frequency === "weekly") {
            const targetDow = parseInt(settings.report_day_of_week || "1", 10);
            if (dowLocal !== targetDow) continue;
          } else if (frequency === "monthly") {
            const targetDom = parseInt(settings.report_day_of_month || "1", 10);
            if (nowLocal.getUTCDate() !== targetDom) continue;
          }

          // Time matches – send report
          const smtp = getSmtpConfig();
          if (!smtp) {
            log(`[report] SMTP not configured – skipping for user ${userId}`);
            continue;
          }

          const { from, to, label } = getReportPeriodDates(settings.report_period ?? "week");
          let records = await storage.getAttendances(userId, from, to);
          if (settings.report_only_inout === "true") {
            records = records.filter(r => r.type === "entrada" || r.type === "salida");
          }
          await sendAttendanceReport(smtp, email, records, label);
          log(`[report] Sent ${frequency} report to ${email} for user ${userId} (${records.length} records, period: ${settings.report_period ?? "week"})`);
        } catch (err: any) {
          log(`[report] Error for user ${userId}: ${err.message}`);
        }
      }
    } catch (err: any) {
      log(`[report] Scheduler error: ${err.message}`);
    }
  });

  log("Attendance report scheduler started");
}
