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
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user,
    pass,
    from: process.env.SMTP_FROM || user,
  };
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
