import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Employee } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, Loader2, Barcode, Hash, XCircle, LogIn, UtensilsCrossed, LogOut, Lock, Eye, CreditCard, MapPin, MapPinOff, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { usePublicSubscriptionStatus } from "@/hooks/use-subscription";
import { useUser } from "@/hooks/use-auth";

type CheckType = "entrada" | "comida" | "regreso" | "salida";

interface Props {
  userId: string;
}

type LastRecord = { name: string; date: string; time: string; type?: string; success: boolean; message?: string; isRetardo?: boolean };

const TYPE_OPTIONS: { value: CheckType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "entrada",  label: "Entrada",         icon: <LogIn className="w-4 h-4" />,           color: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300" },
  { value: "comida",   label: "Salida a comer",  icon: <UtensilsCrossed className="w-4 h-4" />, color: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300" },
  { value: "regreso",  label: "Entrada de comida",icon: <LogIn className="w-4 h-4" />,           color: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300" },
  { value: "salida",   label: "Salida",          icon: <LogOut className="w-4 h-4" />,          color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300" },
];

export default function CheckinPage({ userId }: Props) {
  const [lastRecord, setLastRecord] = useState<LastRecord | null>(null);
  const [checkType, setCheckType] = useState<CheckType>("entrada");
  const [now, setNow] = useState(new Date());
  const geoRef = useRef<{ lat: number; lng: number } | null>(null);
  const [geoOk, setGeoOk] = useState<boolean | null>(null);
  const lastPayloadRef = useRef<any>(null);
  const [retardoPending, setRetardoPending] = useState<{ scheduleStart?: string; toleranciaMin?: number } | null>(null);
  const [retardoComentario, setRetardoComentario] = useState("");
  const [retardoCountdown, setRetardoCountdown] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: currentUser } = useUser();
  const isOwner = !!currentUser && currentUser.id === userId;
  const { data: subStatus, isLoading: subLoading } = usePublicSubscriptionStatus(userId);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setGeoOk(false); return; }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGeoOk(true);
      },
      () => setGeoOk(false),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const { data: providerSettings } = useQuery<Record<string, string>>({
    queryKey: [api.public.userSettings.path, userId],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.public.userSettings.path, { userId }));
      if (!res.ok) return {};
      return res.json();
    },
  });

  const companyName = providerSettings?.profile_name?.trim() || null;
  const companyLogo = providerSettings?.profile_image?.trim() || null;

  const { data: employees = [], isLoading: loadingEmps } = useQuery<Employee[]>({
    queryKey: [api.public.publicEmployees.path, userId],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.public.publicEmployees.path, { userId }));
      if (!res.ok) throw new Error("Error al cargar empleados");
      return res.json();
    },
  });

  const checkin = useMutation({
    mutationFn: async (payload: { employeeId?: number; pin?: string; barcode?: string; type?: string; comentario?: string }) => {
      lastPayloadRef.current = payload;
      // Send client's local date/time so the server records the correct local hour
      const localNow = new Date();
      const _p = (n: number) => String(n).padStart(2, '0');
      const localDate = `${localNow.getFullYear()}-${_p(localNow.getMonth()+1)}-${_p(localNow.getDate())}`;
      const localTime = `${_p(localNow.getHours())}:${_p(localNow.getMinutes())}:${_p(localNow.getSeconds())}`;
      const localDayOfWeek = String(localNow.getDay()); // "0"=Sun … "6"=Sat
      const res = await fetch(buildUrl(api.public.checkIn.path, { userId }), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, ...(geoRef.current || {}), localDate, localTime, localDayOfWeek }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al registrar");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.needsRetardoComment) {
        setRetardoPending({ scheduleStart: data.scheduleStart, toleranciaMin: data.toleranciaMin });
        setRetardoComentario("");
        return;
      }
      const emp = employees.find(e => e.id === data.employeeId);
      setLastRecord({
        success: true,
        name: emp?.name || data.employeeName,
        date: data.checkDate,
        time: data.checkTime,
        type: data.type,
        isRetardo: data.isRetardo,
      });
      setRetardoPending(null);
      if (data.isRetardo) setRetardoCountdown(10);
    },
    onError: (err: Error) => {
      setLastRecord({ success: false, name: "", date: "", time: "", message: err.message });
      setRetardoPending(null);
    },
  });

  // 10-second countdown after retardo success → auto-reset
  useEffect(() => {
    if (retardoCountdown <= 0) return;
    const t = setTimeout(() => {
      const next = retardoCountdown - 1;
      setRetardoCountdown(next);
      if (next === 0) setLastRecord(null);
    }, 1000);
    return () => clearTimeout(t);
  }, [retardoCountdown]);

  // Reset all transient state (go back to initial checador view)
  const resetAll = () => {
    setLastRecord(null);
    setRetardoPending(null);
    setRetardoComentario("");
    setRetardoCountdown(0);
    setResetKey(k => k + 1);
  };

  // Idle timer: if no key pressed for 5 seconds, reset to initial state
  useEffect(() => {
    const restartIdle = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        resetAll();
      }, 5000);
    };
    restartIdle();
    document.addEventListener("keydown", restartIdle);
    return () => {
      document.removeEventListener("keydown", restartIdle);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPageActive = subStatus?.active;
  const isPreview = isOwner && !isPageActive;

  if (!subLoading && !isPageActive && !isOwner) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Página No Disponible</h1>
          <p className="text-muted-foreground text-lg">
            Este enlace del checador no está activo en este momento. El proveedor necesita activar su plan de suscripción.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col items-center justify-center p-4">
      {isPreview && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Eye className="w-4 h-4 shrink-0" />
            <span>Vista previa — Los visitantes ven esta página como privada hasta que actives una suscripción.</span>
          </div>
          <a
            href="/admin"
            onClick={(e) => { e.preventDefault(); window.location.href = "/admin"; }}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Activar suscripción
          </a>
        </div>
      )}
      <div className={`w-full max-w-md space-y-5${isPreview ? " mt-16" : ""}`}>
        {/* Header */}
        <div className="text-center space-y-1.5">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName ?? "Logo"}
              className="w-20 h-20 rounded-2xl object-cover mx-auto shadow-md border border-border/30"
            />
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
              <Clock className="w-8 h-8 text-primary" />
            </div>
          )}
          {companyName && (
            <h2 className="text-lg font-semibold text-foreground leading-tight">{companyName}</h2>
          )}
          <h1 className="text-xl font-bold text-foreground">Checador de Asistencia</h1>
          <p className="text-muted-foreground text-sm">
            {format(now, "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
          <p className="text-2xl font-bold text-primary tabular-nums">
            {format(now, "HH:mm:ss")}
          </p>
          {geoOk !== null && (
            <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mx-auto ${geoOk ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}>
              {geoOk ? <MapPin className="w-3 h-3" /> : <MapPinOff className="w-3 h-3" />}
              {geoOk ? "GPS activo" : "GPS no disponible"}
            </div>
          )}
        </div>

        {/* Retardo dialog — shown before result */}
        {retardoPending && !lastRecord && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
            <CardContent className="pt-6 pb-5 space-y-4">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 mx-auto">
                  <AlertTriangle className="w-7 h-7 text-amber-600" />
                </div>
                <p className="font-bold text-amber-800 dark:text-amber-300 text-lg">¡Retardo detectado!</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {retardoPending.scheduleStart && `Entrada programada: ${retardoPending.scheduleStart}`}
                  {retardoPending.toleranciaMin ? ` (tolerancia: ${retardoPending.toleranciaMin} min)` : ""}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-amber-800 dark:text-amber-300 font-medium">Motivo del retardo *</Label>
                <Textarea
                  value={retardoComentario}
                  onChange={e => setRetardoComentario(e.target.value)}
                  placeholder="Describe el motivo de tu retardo..."
                  rows={3}
                  className="border-amber-300 focus:border-amber-500"
                  data-testid="input-retardo-motivo"
                  autoFocus
                />
              </div>
              <Button
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => {
                  if (!retardoComentario.trim() || !lastPayloadRef.current) return;
                  checkin.mutate({ ...lastPayloadRef.current, comentario: retardoComentario.trim() });
                }}
                disabled={!retardoComentario.trim() || checkin.isPending}
                data-testid="button-submit-retardo"
              >
                {checkin.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registrando...</>
                  : "Registrar entrada con retardo"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Result card */}
        {lastRecord && (
          lastRecord.success ? (
            lastRecord.isRetardo ? (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
                <CardContent className="pt-6 pb-5 text-center space-y-2">
                  <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                  <p className="font-bold text-amber-800 dark:text-amber-300 text-lg">Entrada registrada con retardo</p>
                  <p className="text-amber-700 dark:text-amber-400 font-semibold text-base">{lastRecord.name}</p>
                  <p className="text-sm text-amber-600 dark:text-amber-500">
                    {lastRecord.date} — {lastRecord.time}
                  </p>
                  <p className="text-xs text-amber-500 dark:text-amber-600">
                    Volviendo al checador en {retardoCountdown}s...
                  </p>
                </CardContent>
              </Card>
            ) : (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <CardContent className="pt-6 pb-5 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                <p className="font-bold text-green-800 dark:text-green-300 text-lg">¡Registro guardado!</p>
                <p className="text-green-700 dark:text-green-400 font-semibold text-base">{lastRecord.name}</p>
                {lastRecord.type && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    lastRecord.type === "comida"  ? "bg-orange-100 text-orange-800 border-orange-300"
                    : lastRecord.type === "regreso" ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                    : lastRecord.type === "salida"  ? "bg-blue-100 text-blue-800 border-blue-300"
                    : "bg-green-100 text-green-800 border-green-300"
                  }`}>
                    {lastRecord.type === "comida"  ? <UtensilsCrossed className="w-3 h-3" />
                     : lastRecord.type === "salida" || lastRecord.type === "regreso" ? <LogIn className="w-3 h-3" />
                     : <LogIn className="w-3 h-3" />}
                    {{ entrada: "Entrada", comida: "Salida a comer", regreso: "Entrada de comida", salida: "Salida" }[lastRecord.type] ?? lastRecord.type}
                  </span>
                )}
                <p className="text-sm text-green-600 dark:text-green-500">
                  {lastRecord.date} — {lastRecord.time}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-300 text-green-700 hover:bg-green-100 mt-1"
                  onClick={() => setLastRecord(null)}
                  data-testid="button-checkin-again"
                >
                  Registrar otra asistencia
                </Button>
              </CardContent>
            </Card>
            )
          ) : (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
              <CardContent className="pt-6 pb-5 text-center space-y-2">
                <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                <p className="font-bold text-red-800 dark:text-red-300 text-base">{lastRecord.message}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-100 mt-1"
                  onClick={() => setLastRecord(null)}
                  data-testid="button-checkin-retry"
                >
                  Intentar de nuevo
                </Button>
              </CardContent>
            </Card>
          )
        )}

        {/* Type selector – always visible */}
        {!lastRecord && (
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCheckType(opt.value)}
                data-testid={`type-btn-${opt.value}`}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                  checkType === opt.value
                    ? `${opt.color} border-current shadow-sm scale-105`
                    : "border-border bg-background text-muted-foreground hover:border-primary/30"
                }`}
              >
                {opt.icon}{opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Check-in form */}
        {!lastRecord && (
          <Card className="shadow-lg border-border/50">
            <CardContent className="pt-4 pb-5">
              {loadingEmps ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : employees.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  No hay empleados configurados.
                </p>
              ) : (
                <Tabs defaultValue="barcode">
                  <TabsList className="w-full mb-5">
                    <TabsTrigger value="pin" className="flex-1 gap-1.5" data-testid="tab-checkin-pin">
                      <Hash className="w-3.5 h-3.5" />Empleado + PIN
                    </TabsTrigger>
                    <TabsTrigger value="barcode" className="flex-1 gap-1.5" data-testid="tab-checkin-barcode">
                      <Barcode className="w-3.5 h-3.5" />Código / QR / Huella
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pin">
                    <PinCheckin key={resetKey} employees={employees} checkin={checkin} checkType={checkType} />
                  </TabsContent>

                  <TabsContent value="barcode">
                    <BarcodeCheckin key={resetKey} checkin={checkin} checkType={checkType} />
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── PIN mode: select employee → numpad PIN ───────────────────────────────────

const NUMPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

function PinCheckin({
  employees,
  checkin,
  checkType,
}: {
  employees: Employee[];
  checkin: ReturnType<typeof useMutation<any, Error, any>>;
  checkType: CheckType;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [digits, setDigits] = useState<string[]>([]);
  const [step, setStep] = useState<"select" | "pin">("select");

  const selectedEmp = employees.find(e => String(e.id) === selectedId);

  const handleSelectEmployee = (id: string) => {
    setSelectedId(id);
    setDigits([]);
    setStep("pin");
  };

  const press = (key: string) => {
    if (key === "⌫") {
      setDigits(d => d.slice(0, -1));
    } else if (key && digits.length < 4) {
      const next = [...digits, key];
      setDigits(next);
      if (next.length === 4) {
        checkin.mutate(
          { employeeId: Number(selectedId), pin: next.join(""), type: checkType },
          { onSettled: () => { setDigits([]); setStep("select"); setSelectedId(""); } }
        );
      }
    }
  };

  const goBack = () => {
    setStep("select");
    setDigits([]);
    setSelectedId("");
  };

  if (step === "select") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-center">Selecciona tu nombre</p>
        <Select value={selectedId} onValueChange={handleSelectEmployee}>
          <SelectTrigger data-testid="select-employee" className="h-12 text-base">
            <SelectValue placeholder="Elige tu nombre..." />
          </SelectTrigger>
          <SelectContent>
            {employees.map(emp => (
              <SelectItem key={emp.id} value={String(emp.id)} data-testid={`option-employee-${emp.id}`}>
                {emp.name}{emp.position ? ` — ${emp.position}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selected employee header */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-0.5">Empleado seleccionado</p>
        <p className="font-semibold text-foreground text-base">{selectedEmp?.name}</p>
        {selectedEmp?.position && <p className="text-xs text-muted-foreground">{selectedEmp.position}</p>}
      </div>

      <p className="text-sm text-muted-foreground text-center">Ingresa tu PIN de 4 dígitos</p>

      {/* PIN display */}
      <div className="flex justify-center gap-3">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
              digits[i] !== undefined
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-muted/30"
            }`}
            data-testid={`pin-digit-${i}`}
          >
            {digits[i] !== undefined ? "●" : ""}
          </div>
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
        {NUMPAD.flat().map((key, idx) =>
          key === "" ? (
            <div key={idx} />
          ) : (
            <button
              key={idx}
              type="button"
              onClick={() => press(key)}
              disabled={checkin.isPending}
              className={`h-14 rounded-xl text-xl font-semibold border transition-all active:scale-95 select-none ${
                key === "⌫"
                  ? "border-destructive/30 text-destructive hover:bg-destructive/5"
                  : "border-border bg-background hover:bg-muted hover:border-primary/40"
              }`}
              data-testid={`numpad-key-${key}`}
            >
              {key}
            </button>
          )
        )}
      </div>

      {checkin.isPending && (
        <div className="flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      <button
        type="button"
        onClick={goBack}
        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-back-to-select"
      >
        ← Cambiar empleado
      </button>
    </div>
  );
}

// ── Barcode/QR scanner mode ──────────────────────────────────────────────────

function BarcodeCheckin({
  checkin,
  checkType,
}: {
  checkin: ReturnType<typeof useMutation<any, Error, any>>;
  checkType: CheckType;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    checkin.mutate({ barcode: trimmed, type: checkType }, { onSettled: () => setValue("") });
  };

  const handleChange = (v: string) => {
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (v.length >= 4) submit(v);
    }, 200);
  };

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center">
        <Barcode className="w-12 h-12 text-primary/60" />
      </div>
      <p className="text-sm text-muted-foreground">
        Usa el lector de código de barras, huella digital o cámara QR.<br />
        El campo se enfoca automáticamente — solo acerca el dedo o escanea.
      </p>
      <Input
        ref={inputRef}
        value={value}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(value); } }}
        placeholder="Huella / código / QR..."
        className="text-center text-base tracking-wider h-12"
        autoComplete="off"
        data-testid="input-barcode-scanner"
      />
      {checkin.isPending && (
        <div className="flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}
      <Button
        className="w-full h-12"
        onClick={() => submit(value)}
        disabled={!value.trim() || checkin.isPending}
        data-testid="button-barcode-submit"
      >
        {checkin.isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registrando...</>
        ) : (
          <><CheckCircle2 className="w-4 h-4 mr-2" />Registrar</>
        )}
      </Button>
    </div>
  );
}
