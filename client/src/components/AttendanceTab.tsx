import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";
import { type Employee, type Schedule, type AttendanceRecord, type Sucursal } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Users, CalendarDays, ClipboardList,
  Copy, Check, Download, Filter, Clock, UserCheck, Shuffle, Printer, Barcode,
  Mail, SendHorizonal, AlertCircle, Building2, MapPin, Navigation, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import JsBarcode from "jsbarcode";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface Props {
  userId: string;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useEmployees() {
  return useQuery<Employee[]>({
    queryKey: [api.attendance.listEmployees.path],
    queryFn: async () => {
      const res = await fetch(api.attendance.listEmployees.path, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar empleados");
      return res.json();
    },
  });
}

function useSchedules() {
  return useQuery<Schedule[]>({
    queryKey: [api.attendance.listSchedules.path],
    queryFn: async () => {
      const res = await fetch(api.attendance.listSchedules.path, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar horarios");
      return res.json();
    },
  });
}

function useSucursales() {
  return useQuery<Sucursal[]>({
    queryKey: [api.attendance.listSucursales.path],
    queryFn: async () => {
      const res = await fetch(api.attendance.listSucursales.path, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar sucursales");
      return res.json();
    },
  });
}

function useAttendances(from: string, to: string, empId: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (empId) params.set("employeeId", empId);
  const url = `${api.attendance.listRecords.path}?${params}`;

  return useQuery<AttendanceRecord[]>({
    queryKey: [api.attendance.listRecords.path, from, to, empId],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar registros");
      return res.json();
    },
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function generatePin(): string {
  return String(Math.floor(Math.random() * 9000) + 1000);
}

function generateBarcode(empId?: number): string {
  const rand = String(Math.floor(Math.random() * 900000) + 100000);
  return empId ? `E${String(empId).padStart(4, "0")}${rand}` : `E0000${rand}`;
}

// ── Sucursal dialog ────────────────────────────────────────────────────────────

function SucursalDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Sucursal | null;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [manager, setManager] = useState(initial?.manager ?? "");
  const [latitude, setLatitude] = useState<string>(initial?.latitude != null ? String(initial.latitude) : "");
  const [longitude, setLongitude] = useState<string>(initial?.longitude != null ? String(initial.longitude) : "");
  const [radius, setRadius] = useState<string>(initial?.radius != null ? String(initial.radius) : "100");
  const [toleranciaMinutos, setToleranciaMinutos] = useState<string>(initial?.toleranciaMinutos != null ? String(initial.toleranciaMinutos) : "0");
  const [geoLoading, setGeoLoading] = useState(false);

  const isEdit = !!initial;

  const handleGetGPS = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude.toFixed(7)));
        setLongitude(String(pos.coords.longitude.toFixed(7)));
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        name,
        phone: phone || null,
        manager: manager || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        radius: radius ? parseInt(radius) : 100,
        toleranciaMinutos: toleranciaMinutos ? parseInt(toleranciaMinutos) : 0,
      };
      const url = isEdit
        ? buildUrl(api.attendance.updateSucursal.path, { id: initial!.id })
        : api.attendance.createSucursal.path;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al guardar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.listSucursales.path] });
      toast({ title: isEdit ? "Sucursal actualizada" : "Sucursal creada" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Sucursal" : "Nueva Sucursal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Matriz, Sucursal Norte..." data-testid="input-sucursal-name" />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52 55 1234 5678" data-testid="input-sucursal-phone" />
          </div>
          <div className="space-y-1.5">
            <Label>Gerente / Responsable</Label>
            <Input value={manager} onChange={e => setManager(e.target.value)} placeholder="Nombre del responsable" data-testid="input-sucursal-manager" />
          </div>
          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />Geolocalización GPS</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleGetGPS} disabled={geoLoading} data-testid="button-get-gps">
                {geoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Navigation className="w-3.5 h-3.5 mr-1" />}
                Mi ubicación
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Si configuras coordenadas, los empleados asignados a esta sucursal deben estar dentro del radio para checar.</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Latitud</Label>
                <Input value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="19.4326..." data-testid="input-sucursal-lat" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Longitud</Label>
                <Input value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="-99.1332..." data-testid="input-sucursal-lng" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Radio permitido (metros)</Label>
                <Input type="number" value={radius} onChange={e => setRadius(e.target.value)} placeholder="100" min={10} max={5000} data-testid="input-sucursal-radius" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tolerancia (minutos)</Label>
                <Input type="number" value={toleranciaMinutos} onChange={e => setToleranciaMinutos(e.target.value)} placeholder="0" min={0} max={120} data-testid="input-sucursal-tolerancia" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Minutos de gracia permitidos para checar entrada después del horario.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name.trim()} data-testid="button-save-sucursal">
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Employee dialog ────────────────────────────────────────────────────────────

function EmployeeDialog({
  open,
  onClose,
  initial,
  schedules,
  sucursales,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Employee | null;
  schedules: Schedule[];
  sucursales: Sucursal[];
}) {
  const { toast } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [position, setPosition] = useState(initial?.position ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [sucursalId, setSucursalId] = useState<string>(initial?.sucursalId ? String(initial.sucursalId) : "none");
  const [jefeDirecto, setJefeDirecto] = useState(initial?.jefeDirecto ?? "");
  const [scheduleId, setScheduleId] = useState<string>(initial?.scheduleId ? String(initial.scheduleId) : "none");
  const [active, setActive] = useState(initial?.active ?? true);
  const [pin, setPin] = useState<string>(initial?.pin ?? "");
  const [barcode, setBarcode] = useState<string>(initial?.barcode ?? "");
  const barcodeSvgRef = useRef<SVGSVGElement>(null);

  const isEdit = !!initial;

  useEffect(() => {
    if (!barcode || !barcodeSvgRef.current) return;
    try {
      JsBarcode(barcodeSvgRef.current, barcode, {
        format: "CODE128",
        lineColor: "#000",
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 12,
        margin: 8,
      });
    } catch {}
  }, [barcode]);

  const handleAutoPin = () => setPin(generatePin());
  const handleAutoBarcode = () => setBarcode(generateBarcode(initial?.id));

  const handlePrintBarcode = useCallback(() => {
    if (!barcode) return;
    const svgEl = barcodeSvgRef.current;
    if (!svgEl) return;
    const svgContent = svgEl.outerHTML;
    const win = window.open("", "_blank", "width=400,height=300");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Credencial - ${name}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 24px; background: white; }
        h2 { margin: 0 0 4px; font-size: 18px; }
        p { margin: 0 0 12px; color: #666; font-size: 13px; }
        .pin { font-size: 24px; font-weight: bold; letter-spacing: 6px; margin: 8px 0 16px; }
        svg { max-width: 100%; }
        @media print { button { display: none; } }
      </style></head><body>
      <h2>${name}</h2>
      ${position ? `<p>${position}</p>` : ""}
      <div class="pin">PIN: ${pin || "—"}</div>
      ${svgContent}
      <br><button onclick="window.print()">🖨️ Imprimir</button>
    </body></html>`);
    win.document.close();
  }, [barcode, name, position, pin]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (pin && !/^\d{4}$/.test(pin)) throw new Error("El PIN debe ser exactamente 4 dígitos");
      const selectedSuc = sucursales.find(s => String(s.id) === sucursalId);
      const body = {
        name,
        position: position || null,
        department: department || null,
        sucursal: selectedSuc?.name || null,
        sucursalId: selectedSuc?.id || null,
        jefeDirecto: jefeDirecto || null,
        scheduleId: scheduleId && scheduleId !== "none" ? Number(scheduleId) : null,
        active,
        pin: pin || null,
        barcode: barcode || null,
      };
      const url = isEdit
        ? buildUrl(api.attendance.updateEmployee.path, { id: initial!.id })
        : api.attendance.createEmployee.path;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al guardar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.listEmployees.path] });
      toast({ title: isEdit ? "Empleado actualizado" : "Empleado agregado" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nombre completo"
              data-testid="input-employee-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Puesto / Cargo</Label>
            <Input
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder="Ej. Cajero, Mesero..."
              data-testid="input-employee-position"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Departamento</Label>
            <Input
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="Ej. Ventas, Producción..."
              data-testid="input-employee-department"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sucursal</Label>
            <Select value={sucursalId} onValueChange={setSucursalId}>
              <SelectTrigger data-testid="select-employee-sucursal">
                <SelectValue placeholder="Sin sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin sucursal</SelectItem>
                {sucursales.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Jefe Directo</Label>
            <Input
              value={jefeDirecto}
              onChange={e => setJefeDirecto(e.target.value)}
              placeholder="Nombre del jefe directo"
              data-testid="input-employee-jefe"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Horario asignado</Label>
            <Select value={scheduleId} onValueChange={setScheduleId}>
              <SelectTrigger data-testid="select-employee-schedule">
                <SelectValue placeholder="Sin horario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin horario</SelectItem>
                {schedules.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PIN */}
          <div className="space-y-1.5">
            <Label>PIN de 4 dígitos</Label>
            <div className="flex gap-2">
              <Input
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
                maxLength={4}
                className="font-mono tracking-widest text-center text-lg"
                data-testid="input-employee-pin"
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAutoPin} title="Generar PIN aleatorio" data-testid="button-generate-pin">
                <Shuffle className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">El empleado usará este PIN para registrar su asistencia.</p>
          </div>

          {/* Barcode / Huella */}
          <div className="space-y-1.5">
            <Label>Código de barras / Huella digital</Label>
            <div className="flex gap-2">
              <Input
                value={barcode}
                onChange={e => setBarcode(e.target.value.replace(/\s/g, ""))}
                placeholder="Autogenerado o registrado por lector"
                className="font-mono text-xs"
                data-testid="input-employee-barcode"
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAutoBarcode} title="Generar código" data-testid="button-generate-barcode">
                <Shuffle className="w-4 h-4" />
              </Button>
            </div>
            {barcode && (
              <div className="border rounded-lg p-3 bg-white text-center space-y-2">
                <svg ref={barcodeSvgRef} className="mx-auto max-w-full" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handlePrintBarcode}
                  data-testid="button-print-barcode"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir credencial
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Para lector de huella USB genérico: pon el cursor en este campo y acerca el dedo al lector — registrará el código automáticamente. También funciona con lector de código de barras o QR.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="emp-active"
              checked={active}
              onChange={e => setActive(e.target.checked)}
              className="w-4 h-4 accent-primary"
              data-testid="checkbox-employee-active"
            />
            <Label htmlFor="emp-active">Activo (puede registrar asistencia)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            data-testid="button-save-employee"
          >
            {mutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface TimeSlotRow {
  days: string[];
  startTime: string;
  endTime: string;
}

function parseSlotsFromSchedule(sch: Schedule | null | undefined): TimeSlotRow[] {
  if (!sch) return [{ days: ["1", "2", "3", "4", "5"], startTime: "09:00", endTime: "18:00" }];
  if (sch.slots) {
    try {
      const parsed = JSON.parse(sch.slots);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  return [{ days: sch.days, startTime: sch.startTime, endTime: sch.endTime }];
}

// ── Schedule dialog ────────────────────────────────────────────────────────────

function DayToggleRow({
  days,
  onChange,
}: {
  days: string[];
  onChange: (days: string[]) => void;
}) {
  const toggle = (d: string) =>
    onChange(days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort());
  return (
    <div className="flex gap-1.5 flex-wrap">
      {DAY_NAMES.map((d, i) => (
        <button
          key={i}
          type="button"
          onClick={() => toggle(String(i))}
          className={`w-9 h-9 rounded-lg text-xs font-medium border transition-colors ${
            days.includes(String(i))
              ? "bg-primary text-white border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/50"
          }`}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

function ScheduleDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Schedule | null;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [slots, setSlots] = useState<TimeSlotRow[]>(() => parseSlotsFromSchedule(initial));

  const isEdit = !!initial;

  const addSlot = () =>
    setSlots(prev => [...prev, { days: [], startTime: "09:00", endTime: "18:00" }]);

  const removeSlot = (idx: number) =>
    setSlots(prev => prev.filter((_, i) => i !== idx));

  const updateSlot = (idx: number, patch: Partial<TimeSlotRow>) =>
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));

  const isValid = name.trim() && slots.every(s => s.days.length > 0);

  const mutation = useMutation({
    mutationFn: async () => {
      const firstSlot = slots[0];
      const body = {
        name,
        days: firstSlot.days,
        startTime: firstSlot.startTime,
        endTime: firstSlot.endTime,
        slots: JSON.stringify(slots),
      };
      const url = isEdit
        ? buildUrl(api.attendance.updateSchedule.path, { id: initial!.id })
        : api.attendance.createSchedule.path;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al guardar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.listSchedules.path] });
      toast({ title: isEdit ? "Horario actualizado" : "Horario creado" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Horario" : "Nuevo Horario"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label>Nombre del horario *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Turno Matutino"
              data-testid="input-schedule-name"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Franjas de horario</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addSlot}
                className="h-7 text-xs"
                data-testid="button-add-slot"
              >
                <Plus className="w-3 h-3 mr-1" />Agregar franja
              </Button>
            </div>

            <div className="space-y-3">
              {slots.map((slot, idx) => (
                <div
                  key={idx}
                  className="border border-border/60 rounded-lg p-3 space-y-3 bg-gray-50/50 dark:bg-gray-900/20"
                  data-testid={`slot-row-${idx}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Franja {idx + 1}
                    </span>
                    {slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlot(idx)}
                        className="text-red-400 hover:text-red-600 p-1 rounded"
                        data-testid={`button-remove-slot-${idx}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <DayToggleRow
                    days={slot.days}
                    onChange={days => updateSlot(idx, { days })}
                  />
                  {slot.days.length === 0 && (
                    <p className="text-xs text-destructive">Selecciona al menos un día</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Entrada</Label>
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={e => updateSlot(idx, { startTime: e.target.value })}
                        className="h-8 text-sm"
                        data-testid={`input-slot-start-${idx}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Salida</Label>
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={e => updateSlot(idx, { endTime: e.target.value })}
                        className="h-8 text-sm"
                        data-testid={`input-slot-end-${idx}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
            data-testid="button-save-schedule"
          >
            {mutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Report Schedule Dialog ─────────────────────────────────────────────────────

interface ReportScheduleSettings {
  report_enabled?: string;
  report_email?: string;
  report_frequency?: string;
  report_time?: string;
  report_day_of_week?: string;
  report_day_of_month?: string;
  report_period?: string;
  report_only_inout?: string;
  smtp_configured?: boolean;
}

function ReportScheduleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<ReportScheduleSettings>({
    queryKey: [api.attendance.getReportSchedule.path],
    queryFn: async () => {
      const res = await fetch(api.attendance.getReportSchedule.path, { credentials: "include" });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: open,
  });

  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [time, setTime] = useState("08:00");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [reportPeriod, setReportPeriod] = useState("week");
  const [onlyInOut, setOnlyInOut] = useState(false);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.report_enabled === "true");
      setEmail(settings.report_email ?? "");
      setFrequency(settings.report_frequency ?? "daily");
      setTime(settings.report_time ?? "08:00");
      setDayOfWeek(settings.report_day_of_week ?? "1");
      setDayOfMonth(settings.report_day_of_month ?? "1");
      setReportPeriod(settings.report_period ?? "week");
      setOnlyInOut(settings.report_only_inout === "true");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.attendance.saveReportSchedule.path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          report_enabled: enabled ? "true" : "false",
          report_email: email,
          report_frequency: frequency,
          report_time: time,
          report_day_of_week: dayOfWeek,
          report_day_of_month: dayOfMonth,
          report_period: reportPeriod,
          report_only_inout: onlyInOut ? "true" : "false",
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.getReportSchedule.path] });
      toast({ title: "Configuración guardada" });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.attendance.testReportSchedule.path, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Error al enviar");
      }
    },
    onSuccess: () => toast({ title: "Correo de prueba enviado", description: `Enviado a ${email}` }),
    onError: (err: Error) => toast({ title: "Error al enviar", description: err.message, variant: "destructive" }),
  });

  const DAY_NAMES_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Programar Envío de Reportes
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Cargando...</div>
        ) : (
          <div className="space-y-4 py-2">

            {/* SMTP warning */}
            {!settings?.smtp_configured && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Para enviar correos, el administrador debe configurar las variables de entorno <strong>SMTP_HOST</strong>, <strong>SMTP_USER</strong> y <strong>SMTP_PASS</strong>.</span>
              </div>
            )}

            {/* Enable toggle */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <input
                type="checkbox"
                id="report-enabled"
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                className="w-4 h-4 accent-primary"
                data-testid="checkbox-report-enabled"
              />
              <Label htmlFor="report-enabled" className="cursor-pointer">
                Activar envío automático de reportes
              </Label>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label>Correo destino *</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="reporte@empresa.com"
                data-testid="input-report-email"
              />
              <p className="text-xs text-muted-foreground">Se enviará el Excel con registros a este correo.</p>
            </div>

            {/* Period */}
            <div className="space-y-1.5">
              <Label>Período del reporte</Label>
              <Select value={reportPeriod} onValueChange={setReportPeriod}>
                <SelectTrigger data-testid="select-report-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Última semana (7 días)</SelectItem>
                  <SelectItem value="15days">Últimos 15 días</SelectItem>
                  <SelectItem value="month">Último mes (30 días)</SelectItem>
                  <SelectItem value="all">Todo el historial</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Rango de asistencias que se incluirán en el correo.</p>
            </div>

            {/* Only entrada/salida filter */}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <input
                type="checkbox"
                id="report-only-inout"
                checked={onlyInOut}
                onChange={e => setOnlyInOut(e.target.checked)}
                className="w-4 h-4 accent-primary mt-0.5 shrink-0"
                data-testid="checkbox-report-only-inout"
              />
              <Label htmlFor="report-only-inout" className="cursor-pointer leading-snug">
                Solo entradas y salidas
                <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                  Excluye registros de salida a comer y regreso de comida.
                </span>
              </Label>
            </div>

            {/* Frequency */}
            <div className="space-y-1.5">
              <Label>Periodicidad</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger data-testid="select-report-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Day of week (only weekly) */}
            {frequency === "weekly" && (
              <div className="space-y-1.5">
                <Label>Día de la semana</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger data-testid="select-report-dow">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES_FULL.map((d, i) => (
                      <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Day of month (only monthly) */}
            {frequency === "monthly" && (
              <div className="space-y-1.5">
                <Label>Día del mes</Label>
                <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                  <SelectTrigger data-testid="select-report-dom">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>Día {i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Time */}
            <div className="space-y-1.5">
              <Label>Hora de envío</Label>
              <Input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                data-testid="input-report-time"
              />
              <p className="text-xs text-muted-foreground">Hora en zona México (UTC-6).</p>
            </div>

            {/* Test button */}
            {email && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending || !settings?.smtp_configured}
                data-testid="button-test-report"
              >
                <SendHorizonal className="w-3.5 h-3.5" />
                {testMutation.isPending ? "Enviando prueba..." : "Enviar correo de prueba ahora"}
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!email.trim() || saveMutation.isPending || isLoading}
            data-testid="button-save-report-schedule"
          >
            {saveMutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AttendanceTab({ userId }: Props) {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState("employees");

  // Link copy state
  const checkinUrl = `${window.location.origin}/checkin/${userId}`;
  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    navigator.clipboard.writeText(checkinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sucursal state
  const { data: sucursalesData = [], isLoading: loadingSucs } = useSucursales();
  const [sucDialog, setSucDialog] = useState<{ open: boolean; suc?: Sucursal | null }>({ open: false });
  const [deleteSucId, setDeleteSucId] = useState<number | null>(null);

  // Employee state
  const { data: employees = [], isLoading: loadingEmps } = useEmployees();
  const { data: schedules = [], isLoading: loadingScheds } = useSchedules();
  const [empDialog, setEmpDialog] = useState<{ open: boolean; emp?: Employee | null }>({ open: false });
  const [deleteEmpId, setDeleteEmpId] = useState<number | null>(null);

  // Schedule state
  const [schedDialog, setSchedDialog] = useState<{ open: boolean; sched?: Schedule | null }>({ open: false });
  const [deleteSchedId, setDeleteSchedId] = useState<number | null>(null);

  // Report schedule dialog
  const [reportSchedOpen, setReportSchedOpen] = useState(false);

  // Records state
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = today.slice(0, 8) + "01";
  const [filterFrom, setFilterFrom] = useState(firstOfMonth);
  const [filterTo, setFilterTo] = useState(today);
  const [filterEmpId, setFilterEmpId] = useState("all");
  const { data: records = [], isLoading: loadingRecs } = useAttendances(
    filterFrom,
    filterTo,
    filterEmpId === "all" ? "" : filterEmpId
  );

  // Delete mutations
  const deleteSucursal = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.attendance.deleteSucursal.path, { id }), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error al eliminar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.listSucursales.path] });
      toast({ title: "Sucursal eliminada" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.attendance.deleteEmployee.path, { id }), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error al eliminar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.listEmployees.path] });
      toast({ title: "Empleado eliminado" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.attendance.deleteSchedule.path, { id }), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error al eliminar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.listSchedules.path] });
      toast({ title: "Horario eliminado" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Export CSV
  const exportCSV = () => {
    const params = new URLSearchParams();
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    if (filterEmpId && filterEmpId !== "all") params.set("employeeId", filterEmpId);
    const url = `${api.attendance.exportRecords.path}?${params}`;
    window.location.href = url;
  };

  // Export Excel (client-side using xlsx)
  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const typeLabel: Record<string, string> = { entrada: "Entrada", comida: "Salida a comer", regreso: "Entrada de comida", salida: "Salida" };
    const rows = records.map(r => ({
      ID: r.id,
      Empleado: r.employeeName,
      Sucursal: r.empSucursal ?? "",
      Departamento: r.empDepartment ?? "",
      "Jefe Directo": r.empJefeDirecto ?? "",
      Tipo: typeLabel[r.type] ?? r.type,
      Retardo: (r as any).isRetardo ? "Sí" : "No",
      Fecha: r.checkDate,
      Hora: r.checkTime,
      "Motivo Retardo": (r as any).comentario ?? "",
      IP: r.ip,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencias");
    XLSX.writeFile(wb, `asistencias_${filterFrom}_${filterTo}.xlsx`);
  };

  // Export Resumen Excel (one row per employee per day)
  const exportSummaryExcel = async () => {
    const XLSX = await import("xlsx");

    // Helper: "HH:MM" or "HH:MM:SS" → total minutes from midnight
    const toMin = (t: string | null | undefined): number | null => {
      if (!t) return null;
      const parts = t.split(":");
      if (parts.length < 2) return null;
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    };

    // Format date+time as "DD/MM/YYYY HH:MM"
    const fmtDt = (date: string, time: string | null | undefined) => {
      if (!time) return "";
      const [y, m, d] = date.split("-");
      const hhmm = time.slice(0, 5);
      return `${d}/${m}/${y} ${hhmm}`;
    };

    // Format date as "DD/MM/YYYY"
    const fmtDate = (date: string) => {
      const [y, m, d] = date.split("-");
      return `${d}/${m}/${y}`;
    };

    // Group records by (checkDate, employeeId ?? employeeName)
    type Group = { date: string; empId: number | null; empName: string };
    const groupMap = new Map<string, { group: Group; recs: typeof records }>();
    for (const r of records) {
      const key = `${r.checkDate}__${r.employeeId ?? r.employeeName}`;
      if (!groupMap.has(key)) groupMap.set(key, { group: { date: r.checkDate, empId: r.employeeId ?? null, empName: r.employeeName }, recs: [] });
      groupMap.get(key)!.recs.push(r);
    }

    // Type label for comments
    const typeLabel: Record<string, string> = {
      entrada: "Entrada",
      comida: "Salida a comer",
      regreso: "Regreso comida",
      salida: "Salida",
    };

    const rows: Record<string, string | number>[] = [];

    for (const { group, recs } of groupMap.values()) {
      const byType: Record<string, typeof records[0]> = {};
      for (const r of recs) byType[r.type] = r; // last one wins per type per day

      const entrada   = byType["entrada"];
      const comida    = byType["comida"];
      const regreso   = byType["regreso"];
      let   salidaRec = byType["salida"];

      // If no salida, look up schedule endTime for that employee
      let salidaTime: string | null = salidaRec?.checkTime ?? null;
      let salidaIsVirtual = false;
      if (!salidaTime && group.empId != null) {
        const emp = employees.find(e => e.id === group.empId);
        if (emp?.scheduleId) {
          const sched = schedules.find(s => s.id === emp.scheduleId);
          if (sched?.endTime) { salidaTime = sched.endTime; salidaIsVirtual = true; }
        }
      }

      // Calculate total hours worked
      let horasNum: number | string = "";
      const entMin  = toMin(entrada?.checkTime);
      const salMin  = toMin(salidaTime);
      if (entMin != null && salMin != null) {
        let diff = salMin - entMin;
        if (diff < 0) diff += 24 * 60; // overnight
        const comMin = toMin(comida?.checkTime);
        const regMin = toMin(regreso?.checkTime);
        if (comMin != null && regMin != null) {
          let lunch = regMin - comMin;
          if (lunch < 0) lunch += 24 * 60;
          diff -= lunch;
        }
        horasNum = Math.max(0, parseFloat((diff / 60).toFixed(2)));
      }

      // Build comments string
      const commentParts: string[] = [];
      for (const type of ["entrada", "comida", "regreso", "salida"] as const) {
        const rec = byType[type];
        if (rec?.comentario) commentParts.push(`${typeLabel[type]}: ${rec.comentario}`);
        else if (type === "salida" && salidaIsVirtual) commentParts.push("Salida: sin registro (horario asignado)");
      }

      const empData = group.empId != null ? employees.find(e => e.id === group.empId) : undefined;

      rows.push({
        "fecha registro": fmtDate(group.date),
        "empleado":        group.empName,
        "horas":           horasNum,
        "ingreso":         fmtDt(group.date, entrada?.checkTime),
        "salida a comer":  fmtDt(group.date, comida?.checkTime),
        "regreso":         fmtDt(group.date, regreso?.checkTime),
        "salida":          fmtDt(group.date, salidaTime),
        "jefe directo":    empData?.jefeDirecto ?? "",
        "Comentarios":     commentParts.join(" | "),
      });
    }

    // Sort by date asc, then by employee name
    rows.sort((a, b) => {
      const da = String(a["fecha registro"]), db = String(b["fecha registro"]);
      if (da !== db) return da < db ? -1 : 1;
      return String(a["empleado"]).localeCompare(String(b["empleado"]));
    });

    const headers = ["fecha registro", "empleado", "horas", "ingreso", "salida a comer", "regreso", "salida", "jefe directo", "Comentarios"];
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    // Set column widths
    ws["!cols"] = [{ wch: 14 }, { wch: 20 }, { wch: 7 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resumen");
    XLSX.writeFile(wb, `resumen_asistencias_${filterFrom}_${filterTo}.xlsx`);
  };

  const getScheduleName = (scheduleId: number | null | undefined) => {
    if (!scheduleId) return null;
    return schedules.find(s => s.id === scheduleId)?.name;
  };

  return (
    <div className="space-y-4">
      {/* Checkin link card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <UserCheck className="w-5 h-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Enlace para checar asistencia</p>
                <p className="text-xs text-muted-foreground truncate">{checkinUrl}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-primary/30 text-primary hover:bg-primary/10"
              onClick={copyLink}
              data-testid="button-copy-checkin-link"
            >
              {copied ? <><Check className="w-3.5 h-3.5 mr-1.5" />Copiado</> : <><Copy className="w-3.5 h-3.5 mr-1.5" />Copiar enlace</>}
            </Button>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => window.open(checkinUrl, "_blank")}
              data-testid="button-open-checkin-link"
            >
              Abrir página
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
          <TabsTrigger value="sucursales" data-testid="tab-sucursales">
            <Building2 className="w-4 h-4 mr-1.5" />Sucursales
          </TabsTrigger>
          <TabsTrigger value="employees" data-testid="tab-employees">
            <Users className="w-4 h-4 mr-1.5" />Empleados
          </TabsTrigger>
          <TabsTrigger value="schedules" data-testid="tab-schedules">
            <CalendarDays className="w-4 h-4 mr-1.5" />Horarios
          </TabsTrigger>
          <TabsTrigger value="records" data-testid="tab-records">
            <ClipboardList className="w-4 h-4 mr-1.5" />Registros
          </TabsTrigger>
        </TabsList>

        {/* SUCURSALES TAB */}
        <TabsContent value="sucursales" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-gray-50/50 dark:bg-gray-900/20 border-b border-border/50 flex flex-row items-center justify-between py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Sucursales ({sucursalesData.length})
              </CardTitle>
              <Button size="sm" onClick={() => setSucDialog({ open: true, suc: null })} data-testid="button-add-sucursal">
                <Plus className="w-3.5 h-3.5 mr-1.5" />Agregar
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingSucs ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
              ) : sucursalesData.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <Building2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                  <p>No hay sucursales. Agrega la primera.</p>
                  <p className="text-xs mt-1">Las sucursales permiten validar la ubicación GPS al checar asistencia.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {sucursalesData.map(suc => (
                    <div key={suc.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/10" data-testid={`row-sucursal-${suc.id}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">{suc.name}</span>
                          {suc.latitude != null && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                              <MapPin className="w-3 h-3" />GPS
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 mt-0.5">
                          {suc.manager && <span className="text-xs text-muted-foreground">{suc.manager}</span>}
                          {suc.phone && <span className="text-xs text-muted-foreground">{suc.phone}</span>}
                          {suc.latitude != null && (
                            <span className="text-xs text-muted-foreground">Radio: {suc.radius ?? 100} m</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSucDialog({ open: true, suc })} data-testid={`button-edit-sucursal-${suc.id}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteSucId(suc.id)} data-testid={`button-delete-sucursal-${suc.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EMPLOYEES TAB */}
        <TabsContent value="employees" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-gray-50/50 dark:bg-gray-900/20 border-b border-border/50 flex flex-row items-center justify-between py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Empleados ({employees.length})
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setEmpDialog({ open: true, emp: null })}
                data-testid="button-add-employee"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />Agregar
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingEmps ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
              ) : employees.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No hay empleados. Agrega el primero.
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {employees.map(emp => {
                    const schedName = getScheduleName(emp.scheduleId);
                    return (
                      <div key={emp.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/10" data-testid={`row-employee-${emp.id}`}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">{emp.name}</span>
                            {!emp.active && <Badge variant="outline" className="text-xs text-muted-foreground">Inactivo</Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {emp.position && <span className="text-xs text-muted-foreground">{emp.position}</span>}
                            {emp.pin && (
                              <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold tracking-widest">
                                PIN: {emp.pin}
                              </span>
                            )}
                            {schedName && (
                              <span className="text-xs text-primary flex items-center gap-1">
                                <Clock className="w-3 h-3" />{schedName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setEmpDialog({ open: true, emp })}
                            data-testid={`button-edit-employee-${emp.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteEmpId(emp.id)}
                            data-testid={`button-delete-employee-${emp.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCHEDULES TAB */}
        <TabsContent value="schedules" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-gray-50/50 dark:bg-gray-900/20 border-b border-border/50 flex flex-row items-center justify-between py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                Horarios ({schedules.length})
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setSchedDialog({ open: true, sched: null })}
                data-testid="button-add-schedule"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />Agregar
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingScheds ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
              ) : schedules.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No hay horarios. Crea el primero.
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {schedules.map(sch => {
                    const schSlots = parseSlotsFromSchedule(sch);
                    return (
                    <div key={sch.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/10" data-testid={`row-schedule-${sch.id}`}>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground">{sch.name}</p>
                        <div className="mt-1 space-y-1">
                          {schSlots.map((slot, si) => (
                            <div key={si} className="flex items-center gap-2 flex-wrap">
                              <div className="flex gap-0.5">
                                {DAY_NAMES.map((d, i) => (
                                  <span
                                    key={i}
                                    className={`text-xs px-1 py-0.5 rounded ${
                                      slot.days.includes(String(i))
                                        ? "bg-primary/10 text-primary font-medium"
                                        : "text-muted-foreground/30"
                                    }`}
                                  >
                                    {d}
                                  </span>
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />{slot.startTime} – {slot.endTime}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => setSchedDialog({ open: true, sched: sch })}
                          data-testid={`button-edit-schedule-${sch.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteSchedId(sch.id)}
                          data-testid={`button-delete-schedule-${sch.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECORDS TAB */}
        <TabsContent value="records" className="mt-4 space-y-4">
          {/* Filters */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[130px] space-y-1">
                  <Label className="text-xs">Desde</Label>
                  <Input
                    type="date"
                    value={filterFrom}
                    onChange={e => setFilterFrom(e.target.value)}
                    data-testid="input-filter-from"
                  />
                </div>
                <div className="flex-1 min-w-[130px] space-y-1">
                  <Label className="text-xs">Hasta</Label>
                  <Input
                    type="date"
                    value={filterTo}
                    onChange={e => setFilterTo(e.target.value)}
                    data-testid="input-filter-to"
                  />
                </div>
                <div className="flex-1 min-w-[160px] space-y-1">
                  <Label className="text-xs">Empleado</Label>
                  <Select value={filterEmpId} onValueChange={setFilterEmpId}>
                    <SelectTrigger data-testid="select-filter-employee">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los empleados</SelectItem>
                      {employees.map(e => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportCSV}
                    disabled={records.length === 0}
                    data-testid="button-export-csv"
                    title="Exportar CSV"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportExcel}
                    disabled={records.length === 0}
                    data-testid="button-export-excel"
                    title="Exportar Excel"
                    className="border-green-200 text-green-700 hover:bg-green-50"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />Excel
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportSummaryExcel}
                    disabled={records.length === 0}
                    data-testid="button-export-summary"
                    title="Reporte de resumen por día/empleado"
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />Resumen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReportSchedOpen(true)}
                    data-testid="button-report-schedule"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Mail className="w-3.5 h-3.5 mr-1.5" />Programar Envío
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-gray-50/50 dark:bg-gray-900/20 border-b border-border/50 py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                {loadingRecs ? "Cargando..." : `${records.length} registro${records.length !== 1 ? "s" : ""}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingRecs ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Cargando registros...</div>
              ) : records.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No hay registros para el período seleccionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-gray-50/30 dark:bg-gray-900/10">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Empleado</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Sucursal</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">Departamento</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Jefe Directo</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Tipo</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Fecha</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Hora</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Retardo</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden xl:table-cell">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {records.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10" data-testid={`row-record-${r.id}`}>
                          <td className="px-4 py-2.5 font-medium text-foreground">{r.employeeName}</td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell text-sm">{r.empSucursal ?? <span className="text-border">—</span>}</td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell text-sm">{r.empDepartment ?? <span className="text-border">—</span>}</td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell text-sm">{r.empJefeDirecto ?? <span className="text-border">—</span>}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${
                              r.type === "comida"  ? "bg-orange-50 text-orange-700 border-orange-200"
                              : r.type === "regreso" ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                              : r.type === "salida" ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-green-50 text-green-700 border-green-200"
                            }`}>
                              {r.type === "comida"  ? "🍽 Salida a comer"
                               : r.type === "regreso" ? "↩ Entrada de comida"
                               : r.type === "salida"  ? "⬆ Salida"
                               : "⬇ Entrada"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {format(new Date(r.checkDate + "T12:00:00"), "d 'de' MMM, yyyy", { locale: es })}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{r.checkTime}</td>
                          <td className="px-4 py-2.5">
                            {(r as any).isRetardo ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 whitespace-nowrap">
                                  ⏰ Retardo
                                </span>
                                {(r as any).comentario && (
                                  <p className="text-xs text-muted-foreground max-w-[160px] truncate" title={(r as any).comentario}>
                                    {(r as any).comentario}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs hidden xl:table-cell font-mono">{r.ip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <SucursalDialog
        key={sucDialog.suc?.id ?? 'new-sucursal'}
        open={sucDialog.open}
        onClose={() => setSucDialog({ open: false })}
        initial={sucDialog.suc}
      />
      <EmployeeDialog
        key={empDialog.emp?.id ?? 'new-employee'}
        open={empDialog.open}
        onClose={() => setEmpDialog({ open: false })}
        initial={empDialog.emp}
        schedules={schedules}
        sucursales={sucursalesData}
      />
      <ScheduleDialog
        key={schedDialog.sched?.id ?? 'new-schedule'}
        open={schedDialog.open}
        onClose={() => setSchedDialog({ open: false })}
        initial={schedDialog.sched}
      />
      <ReportScheduleDialog
        open={reportSchedOpen}
        onClose={() => setReportSchedOpen(false)}
      />

      {/* Delete sucursal confirm */}
      <AlertDialog open={deleteSucId !== null} onOpenChange={open => { if (!open) setDeleteSucId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sucursal?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la sucursal. Los empleados asignados quedarán sin sucursal, pero sus registros de asistencia previos se conservarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { if (deleteSucId) { deleteSucursal.mutate(deleteSucId); setDeleteSucId(null); } }}
              data-testid="button-confirm-delete-sucursal"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete employee confirm */}
      <AlertDialog open={deleteEmpId !== null} onOpenChange={open => { if (!open) setDeleteEmpId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el empleado. Los registros de asistencia previos se conservarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { if (deleteEmpId) { deleteEmployee.mutate(deleteEmpId); setDeleteEmpId(null); } }}
              data-testid="button-confirm-delete-employee"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete schedule confirm */}
      <AlertDialog open={deleteSchedId !== null} onOpenChange={open => { if (!open) setDeleteSchedId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar horario?</AlertDialogTitle>
            <AlertDialogDescription>
              Los empleados que tengan este horario asignado quedarán sin horario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { if (deleteSchedId) { deleteSchedule.mutate(deleteSchedId); setDeleteSchedId(null); } }}
              data-testid="button-confirm-delete-schedule"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
