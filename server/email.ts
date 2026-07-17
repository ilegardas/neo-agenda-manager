import nodemailer from "nodemailer";
import * as XLSX from "xlsx";
import type { AttendanceRecord } from "@shared/schema";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export function getSmtpConfig(): SmtpConfig | null {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  let host = process.env.SMTP_HOST;
  if (!host) {
    const domain = user.split("@")[1]?.toLowerCase() ?? "";
    if (domain === "gmail.com") host = "smtp.gmail.com";
    else if (["hotmail.com", "outlook.com", "live.com"].includes(domain)) host = "smtp.office365.com";
    else if (domain === "yahoo.com") host = "smtp.mail.yahoo.com";
    else return null;
  }

  return {
    host,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user,
    pass,
    from: process.env.SMTP_FROM || user,
  };
}

export async function sendPasswordResetEmail(
  smtp: SmtpConfig,
  toEmail: string,
  resetUrl: string,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  await transporter.sendMail({
    from: `"miGestion" <${smtp.from}>`,
    to: toEmail,
    subject: "Recuperación de contraseña — miGestion",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px;">
        <h2 style="margin:0 0 8px;color:#111827;font-size:22px;">Recuperar contraseña</h2>
        <p style="color:#6b7280;margin:0 0 24px;font-size:15px;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>miGestion</strong>.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
          Restablecer contraseña
        </a>
        <p style="color:#9ca3af;font-size:13px;margin:24px 0 0;">
          Este enlace es válido por <strong>1 hora</strong>. Si no solicitaste este cambio, ignora este correo.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#d1d5db;font-size:12px;margin:0;">migestion.pro</p>
      </div>
    `,
  });
}

function buildExcel(records: AttendanceRecord[]): Buffer {
  const typeLabel: Record<string, string> = {
    entrada: "Entrada",
    comida: "Salida a comer",
    regreso: "Entrada de comida",
    salida: "Salida",
  };

  const headers = [
    "ID",
    "Empleado",
    "Sucursal",
    "Departamento",
    "Jefe Directo",
    "Tipo",
    "Retardo",
    "Fecha",
    "Hora",
    "Motivo Retardo",
    "IP",
  ];

  const rows = records.map(r => ({
    ID: r.id,
    Empleado: r.employeeName,
    Sucursal: r.empSucursal ?? "",
    Departamento: r.empDepartment ?? "",
    "Jefe Directo": r.empJefeDirecto ?? "",
    Tipo: typeLabel[r.type] ?? r.type,
    Retardo: r.isRetardo ? "Sí" : "No",
    Fecha: r.checkDate,
    Hora: r.checkTime,
    "Motivo Retardo": r.comentario ?? "",
    IP: r.ip,
  }));

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Asistencias");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export async function sendAttendanceReport(
  smtp: SmtpConfig,
  toEmail: string,
  records: AttendanceRecord[],
  periodLabel: string,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const excelBuffer = buildExcel(records);
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

  await transporter.sendMail({
    from: `"Checador de Asistencia" <${smtp.from}>`,
    to: toEmail,
    subject: `Reporte de Asistencia – ${periodLabel} (${dateStr})`,
    html: `
      <p>Hola,</p>
      <p>Se adjunta el reporte de asistencia correspondiente al período: <strong>${periodLabel}</strong>.</p>
      <p>Total de registros: <strong>${records.length}</strong></p>
      <p>Generado automáticamente el ${dateStr}.</p>
      <hr/>
      <p style="color:#888;font-size:12px;">migestion.pro — Sistema de Control de Asistencia</p>
    `,
    attachments: [
      {
        filename: `asistencias_${now.toISOString().slice(0, 10)}.xlsx`,
        content: excelBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  });
}
