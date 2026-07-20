import { Resend } from "resend";
import XLSX from "xlsx";
import type { AttendanceRecord } from "@shared/schema";

export interface EmailConfig {
  apiKey: string;
  from: string;
}

export function getEmailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  return {
    apiKey,
    from: process.env.EMAIL_FROM || "MiGestión <onboarding@resend.dev>",
  };
}

export async function sendPasswordResetEmail(
  config: EmailConfig,
  toEmail: string,
  resetUrl: string,
): Promise<void> {
  const resend = new Resend(config.apiKey);

  const { error } = await resend.emails.send({
    from: config.from,
    to: [toEmail],
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

  if (error) {
    throw new Error(`Error al enviar correo con Resend: ${error.message}`);
  }
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

  const rows = records.map((r) => ({
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
  config: EmailConfig,
  toEmail: string,
  records: AttendanceRecord[],
  periodLabel: string,
): Promise<void> {
  const resend = new Resend(config.apiKey);
  const excelBuffer = buildExcel(records);
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const { error } = await resend.emails.send({
    from: config.from,
    to: [toEmail],
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
      },
    ],
  });

  if (error) {
    throw new Error(`Error al enviar reporte con Resend: ${error.message}`);
  }
}
