import { useState } from "react";
import { useCreateAvailabilityRule } from "@/hooks/use-availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

const DAYS = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
];

const HOURS = Array.from({ length: 12 }, (_, i) => {
  const h = i + 1;
  return { value: h.toString(), label: h.toString().padStart(2, "0") };
});

const MINUTES = ["00", "15", "30", "45"];

function to24h(hour: string, minute: string, period: string): string {
  let h = parseInt(hour);
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${h.toString().padStart(2, "0")}:${minute}`;
}

function from24h(time: string): { hour: string; minute: string; period: string } {
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr);
  const period = h < 12 ? "AM" : "PM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  const minute = MINUTES.includes(mStr) ? mStr : "00";
  return { hour: h.toString(), minute, period };
}

function TimePicker({
  value,
  onChange,
  testPrefix,
}: {
  value: string;
  onChange: (v: string) => void;
  testPrefix: string;
}) {
  const { hour, minute, period } = from24h(value);

  function update(h: string, m: string, p: string) {
    onChange(to24h(h, m, p));
  }

  return (
    <div className="flex gap-2">
      <Select value={hour} onValueChange={(h) => update(h, minute, period)}>
        <SelectTrigger className="h-10 flex-1 min-w-0" data-testid={`${testPrefix}-hour`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={minute} onValueChange={(m) => update(hour, m, period)}>
        <SelectTrigger className="h-10 flex-1 min-w-0" data-testid={`${testPrefix}-minute`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={period} onValueChange={(p) => update(hour, minute, p)}>
        <SelectTrigger className="h-10 w-20 shrink-0" data-testid={`${testPrefix}-period`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

interface AvailabilityFormProps {
  targetUserId?: string;
}

export function AvailabilityForm({ targetUserId }: AvailabilityFormProps) {
  const ownMutation = useCreateAvailabilityRule();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const adminMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(buildUrl(api.admin.createUserAvailability.path, { userId: targetUserId! }), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error al crear regla");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', targetUserId, 'availability'] });
      toast({ title: "Regla Creada" });
    },
  });

  const mutation = targetUserId ? adminMutation : ownMutation;

  const [dayOfWeek, setDayOfWeek] = useState<string>("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [isBreak, setIsBreak] = useState(false);
  const [label, setLabel] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      dayOfWeek: parseInt(dayOfWeek),
      startTime,
      endTime,
      isBreak,
      label: label || (isBreak ? "Descanso" : "Disponible"),
    }, {
      onSuccess: () => {
        setLabel("");
      }
    });
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Agregar Nueva Regla</CardTitle>
        <p className="text-sm text-muted-foreground">
          Define horarios de trabajo estándar o descansos para cada día de la semana.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Día</Label>
            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
              <SelectTrigger className="h-10 w-full" data-testid="select-day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day, index) => (
                  <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inicio</Label>
            <TimePicker value={startTime} onChange={setStartTime} testPrefix="start" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fin</Label>
            <TimePicker value={endTime} onChange={setEndTime} testPrefix="end" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Etiqueta</Label>
              <Input
                placeholder={isBreak ? "Almuerzo" : "Horario Laboral"}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-10"
                data-testid="input-label"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</Label>
              <div className="h-10 flex items-center gap-2.5 px-3 border rounded-md border-border bg-secondary/20">
                <Switch
                  id="is-break"
                  checked={isBreak}
                  onCheckedChange={setIsBreak}
                  data-testid="switch-is-break"
                />
                <Label htmlFor="is-break" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                  Bloquear
                </Label>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full h-10 gap-2 bg-primary hover:bg-primary/90 font-semibold"
            data-testid="button-add-rule"
          >
            {mutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Plus className="w-4 h-4" />
            }
            Agregar Regla
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
